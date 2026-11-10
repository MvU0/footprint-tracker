// Logregels opslaan en verwijderen. Puur: geeft nieuwe data terug, past niets aan.
//
// Een logregel: { id, datum: "JJJJ-MM-DD", item, hoeveelheid, basis, referentie, notitie }
// - basis: welke waarde meetelt (gemiddeld, laag of hoog)
// - referentie: null = de standaardreferentie, anders een item-id
// Uitstoot en besparing worden NIET opgeslagen, maar steeds opnieuw berekend (besparing.js).

export const BASISSEN = ['gemiddeld', 'laag', 'hoog'];

// crypto.randomUUID werkt alleen via https of localhost; daarbuiten een eenvoudig uniek id.
const nieuwId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// Bestaat deze datum echt? (2026-13-40 niet, 2024-02-29 wel)
function isDatum(t) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t ?? '')) return false;
  const d = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

export function controleerLogregel(data, regel) {
  const fouten = [];
  const item = data.items.find((i) => i.id === regel.item);
  if (!item) fouten.push('Kies een item.');
  const h = regel.hoeveelheid;
  if (typeof h !== 'number' || !Number.isFinite(h) || h < 0) fouten.push('Vul een hoeveelheid in (een getal ≥ 0).');
  if (!isDatum(regel.datum)) fouten.push('Vul een geldige datum in.');
  if (!BASISSEN.includes(regel.basis)) fouten.push('Kies een basis: gemiddeld, laag of hoog.');
  if (regel.referentie != null) {
    const ref = data.items.find((i) => i.id === regel.referentie);
    if (!ref) fouten.push('De gekozen referentie bestaat niet.');
    else if (item && ref.eenheid !== item.eenheid) fouten.push(`De referentie moet dezelfde eenheid hebben als het item (${item.eenheid}).`);
  }
  return fouten;
}

// Opslaan: nieuw (zonder id) of vervangen (bestaand id). Geeft { data, fouten }.
export function slaLogregelOp(data, regel) {
  const fouten = controleerLogregel(data, regel);
  if (fouten.length) return { data: null, fouten };
  const nieuw = structuredClone(data);
  const r = { ...regel, id: regel.id ?? nieuwId() };
  const plek = nieuw.logboek.findIndex((x) => x.id === r.id);
  if (plek >= 0) nieuw.logboek[plek] = r;
  else nieuw.logboek.push(r);
  return { data: nieuw, fouten };
}

export function verwijderLogregel(data, id) {
  const nieuw = structuredClone(data);
  nieuw.logboek = nieuw.logboek.filter((r) => r.id !== id);
  return nieuw;
}
