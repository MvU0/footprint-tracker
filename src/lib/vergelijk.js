// Items vergelijken voor dezelfde hoeveelheid (bv. 40 km of 0,15 kg).
//
// Per item: CO2e en water × hoeveelheid, plus het verschil met een referentie-item.
// Het verschil gaat steeds op dezelfde basis: laag − laag, gemiddeld − gemiddeld,
// hoog − hoog (zelfde regel als straks bij de besparing in stap 5).

import { berekenItem } from './itemwaarden.js';

// Een samenvatting (uit statistiek.js of een mix) vermenigvuldigen met de hoeveelheid.
export function keer(s, factor) {
  if (s.n === 0) return s;
  const x = (v) => (v === null ? null : v * factor);
  return { ...s, laag: x(s.laag), gemiddeld: x(s.gemiddeld), hoog: x(s.hoog), mediaan: x(s.mediaan) };
}

// a − b op dezelfde basis; null als een van beide geen waarde heeft.
export function verschil(a, b) {
  if (a.n === 0 || b.n === 0) return null;
  return { laag: a.laag - b.laag, gemiddeld: a.gemiddeld - b.gemiddeld, hoog: a.hoog - b.hoog };
}

// ids: de items om te vergelijken; referentieId: waarmee het verschil berekend wordt.
export function vergelijk(data, ids, hoeveelheid, referentieId) {
  const itemsPerId = new Map(data.items.map((i) => [i.id, i]));
  const rijen = ids
    .filter((id) => itemsPerId.has(id))
    .map((id) => {
      const item = itemsPerId.get(id);
      const w = berekenItem(item, itemsPerId);
      return { item, co2: keer(w.co2, hoeveelheid), water: keer(w.water, hoeveelheid), isReferentie: id === referentieId };
    });

  const ref = rijen.find((r) => r.isReferentie);
  for (const r of rijen) {
    r.verschil = ref ? verschil(r.co2, ref.co2) : null;
    r.verschilWater = ref ? verschil(r.water, ref.water) : null;
  }
  return rijen;
}
