// Uitstoot en besparing van één logregel.
//
// Uitstoot  = hoeveelheid × waarde van het item.
// Besparing = referentie − werkelijk, steeds op dezelfde basis
//             (laag − laag, gemiddeld − gemiddeld, hoog − hoog).
// Positief = bespaard, negatief = extra uitstoot.
// Wat meetelt in totalen ("…Telt") hangt af van de basis van de logregel.
// Water: alleen als beide items waterdata hebben; ontbrekend water is null, nooit 0.

import { berekenItem } from './itemwaarden.js';
import { keer, verschil } from './vergelijk.js';

// Welke referentie geldt voor deze logregel?
//   1. de referentie die bij de logregel gekozen is;
//   2. anders de standaardreferentie: die van het item (bv. tweedehands → nieuw),
//      en anders die van de categorie (Instellingen, bv. vleesmix).
// Een referentie met een andere eenheid telt niet (km vergelijk je niet met kg).
export function referentieVoor(data, regel) {
  const item = data.items.find((i) => i.id === regel.item);
  if (!item) return null;
  const id = regel.referentie ?? item.standaardReferentie ?? data.instellingen?.standaardReferentie?.[item.categorie] ?? null;
  const ref = data.items.find((i) => i.id === id);
  return ref && ref.eenheid === item.eenheid ? ref : null;
}

export function berekenLogregel(data, regel) {
  const itemsPerId = new Map(data.items.map((i) => [i.id, i]));
  const item = itemsPerId.get(regel.item) ?? null;
  const leeg = { item, referentie: null, uitstoot: null, uitstootTelt: null, besparing: null, besparingTelt: null, water: null, waterTelt: null, waterBesparing: null, waterBesparingTelt: null };
  if (!item) return leeg;

  const basis = regel.basis ?? 'gemiddeld';
  const telt = (v) => (v ? v[basis] : null);
  const metWaarde = (s) => (s.n > 0 ? s : null);

  const w = berekenItem(item, itemsPerId);
  const uitstoot = metWaarde(keer(w.co2, regel.hoeveelheid));
  const water = metWaarde(keer(w.water, regel.hoeveelheid));

  const referentie = referentieVoor(data, regel);
  let besparing = null;
  let waterBesparing = null;
  if (referentie) {
    const r = berekenItem(referentie, itemsPerId);
    // verschil(a, b) = a − b; besparing = referentie − werkelijk.
    besparing = uitstoot ? verschil(keer(r.co2, regel.hoeveelheid), uitstoot) : null;
    waterBesparing = water ? verschil(keer(r.water, regel.hoeveelheid), water) : null;
  }

  return {
    item, referentie,
    uitstoot, uitstootTelt: telt(uitstoot),
    besparing, besparingTelt: telt(besparing),
    water, waterTelt: telt(water),
    waterBesparing, waterBesparingTelt: telt(waterBesparing),
  };
}
