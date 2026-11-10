// Totalen over logregels: per periode, per categorie, en de verandering t.o.v. de vorige periode.
//
// Per soort (uitstoot, besparing, water, waterbesparing):
//   telt = som van het getal dat bij de basis van elke regel hoort (standaard het gemiddelde)
//   laag = som van de laagste waarde per regel, hoog = som van de hoogste waarde per regel
//   n    = aantal regels dat meetelt
// Regels zonder referentie (geen besparing) of zonder water tellen niet als 0, maar apart.

import { berekenLogregel } from './besparing.js';
import { periodeVan } from './periodes.js';

export function regelsIn(data, sleutel, soort) {
  return data.logboek.filter((r) => periodeVan(r.datum, soort) === sleutel);
}

const leeg = () => ({ telt: 0, laag: 0, hoog: 0, n: 0 });

function telOp(som, v, telt) {
  if (!v) return;
  som.telt += telt;
  som.laag += Math.min(v.laag, v.gemiddeld, v.hoog);
  som.hoog += Math.max(v.laag, v.gemiddeld, v.hoog);
  som.n += 1;
}

export function totalen(data, regels) {
  const t = { aantal: regels.length, zonderReferentie: 0, zonderWater: 0, uitstoot: leeg(), besparing: leeg(), water: leeg(), waterBesparing: leeg() };
  for (const regel of regels) {
    const w = berekenLogregel(data, regel);
    telOp(t.uitstoot, w.uitstoot, w.uitstootTelt);
    telOp(t.besparing, w.besparing, w.besparingTelt);
    telOp(t.water, w.water, w.waterTelt);
    telOp(t.waterBesparing, w.waterBesparing, w.waterBesparingTelt);
    if (!w.besparing) t.zonderReferentie += 1;
    if (!w.water) t.zonderWater += 1;
  }
  return t;
}

// Per categorie (in de volgorde van de categorieën), alleen categorieën met regels.
export function perCategorie(data, regels) {
  const categorieVan = new Map(data.items.map((i) => [i.id, i.categorie]));
  return data.categorieen
    .map((categorie) => ({ categorie, regels: regels.filter((r) => categorieVan.get(r.item) === categorie.id) }))
    .filter((x) => x.regels.length > 0)
    .map(({ categorie, regels: r }) => ({ categorie, totalen: totalen(data, r) }));
}

// Voor de grafiek over de tijd: totalen per periode (ook lege).
export function perPeriode(data, sleutels, soort) {
  return sleutels.map((sleutel) => ({ sleutel, totalen: totalen(data, regelsIn(data, sleutel, soort)) }));
}

// Verandering t.o.v. de vorige periode. Procent is null als de vorige periode 0 was (delen door 0).
export function verandering(nu, vorige) {
  return { verschil: nu - vorige, procent: vorige === 0 ? null : ((nu - vorige) / Math.abs(vorige)) * 100 };
}
