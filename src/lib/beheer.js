// Bewerkfuncties voor de catalogus: items toevoegen, aanpassen en verwijderen.
// Alles is "puur": de functies passen de data die je meegeeft niet aan, maar
// geven een nieuwe versie terug (zoals in R, waar een functie een kopie aanpast).

import { valideerCatalogus, EENHEDEN } from './validatie.js';

// Diepe kopie. structuredClone (ingebouwd) laat NaN staan; via JSON zou NaN stilletjes null worden.
const kopie = (x) => structuredClone(x);

// Controleer de nieuwe data; geef { data, fouten: [] } of { data: null, fouten }.
function gecontroleerd(nieuw) {
  const fouten = valideerCatalogus(nieuw);
  return fouten.length ? { data: null, fouten } : { data: nieuw, fouten };
}

// Waar wordt een item gebruikt? Nodig vóór het verwijderen.
// Geeft { logboek: aantal logregels, verwijzingen: [teksten voor de gebruiker] }.
export function waarGebruikt(data, itemId) {
  const verwijzingen = [];
  for (const item of data.items) {
    if (item.mix?.some((d) => d.item === itemId)) verwijzingen.push(`onderdeel van mix "${item.naam}"`);
    if (item.alternatieven?.includes(itemId)) verwijzingen.push(`alternatief bij "${item.naam}"`);
    if (item.standaardReferentie === itemId) verwijzingen.push(`standaardreferentie bij "${item.naam}"`);
  }
  for (const [cat, id] of Object.entries(data.instellingen?.standaardReferentie ?? {})) {
    const naam = data.categorieen.find((c) => c.id === cat)?.naam ?? cat;
    if (id === itemId) verwijzingen.push(`standaardreferentie voor categorie "${naam}"`);
  }
  const logboek = (data.logboek ?? []).filter((r) => r.item === itemId || r.referentie === itemId).length;
  return { logboek, verwijzingen };
}

// Een item verwijderen en alle verwijzingen ernaar opruimen.
// Staat het item in het logboek, dan kan het niet: die logregels zouden anders naar niets wijzen.
export function verwijderItem(data, itemId) {
  const { logboek } = waarGebruikt(data, itemId);
  if (logboek > 0) {
    return { data: null, fouten: [`Dit item staat in ${logboek} logregel(s) en kan daarom niet worden verwijderd.`] };
  }
  const nieuw = kopie(data);
  nieuw.items = nieuw.items.filter((i) => i.id !== itemId);
  for (const item of nieuw.items) {
    if (item.mix) item.mix = item.mix.filter((d) => d.item !== itemId);
    if (item.alternatieven) item.alternatieven = item.alternatieven.filter((id) => id !== itemId);
    if (item.standaardReferentie === itemId) delete item.standaardReferentie;
  }
  const refs = nieuw.instellingen?.standaardReferentie ?? {};
  for (const cat of Object.keys(refs)) if (refs[cat] === itemId) refs[cat] = null;
  return gecontroleerd(nieuw);
}

// Een nieuwe categorie toevoegen (bv. "Energie thuis").
export function voegCategorieToe(data, naam, eenheid) {
  naam = String(naam ?? '').trim();
  const fouten = [];
  if (!naam) fouten.push('Geef de categorie een naam.');
  if (data.categorieen.some((c) => c.naam.toLowerCase() === naam.toLowerCase())) fouten.push(`Categorie "${naam}" bestaat al.`);
  if (!EENHEDEN.includes(eenheid)) fouten.push(`Kies een eenheid: ${EENHEDEN.join(', ')}.`);
  if (fouten.length) return { data: null, fouten };

  const nieuw = kopie(data);
  const id = maakId(naam, nieuw.categorieen.map((c) => c.id));
  nieuw.categorieen.push({ id, naam, standaardEenheid: eenheid });
  return { data: nieuw, fouten };
}

// Een item opslaan: bestaat het id al, dan vervangen, anders toevoegen.
export function slaItemOp(data, item) {
  const nieuw = kopie(data);
  const plek = nieuw.items.findIndex((i) => i.id === item.id);
  if (plek >= 0) nieuw.items[plek] = kopie(item);
  else nieuw.items.push(kopie(item));
  return gecontroleerd(nieuw);
}

// Tekst uit een formulierveld omzetten naar een getal.
//   "19,8" en "19.8" → 19.8;  "1.451,2" → 1451.2;  "" → null;  "abc" → NaN
// NaN laten we bewust door: valideerCatalogus() maakt daar een nette foutmelding van.
// shortcut: "1.451" (zonder komma) wordt 1,451 en niet 1451; pas aan als dat in de praktijk misgaat.
export function leesGetal(tekst) {
  let t = String(tekst ?? '').trim();
  if (t === '') return null;
  if (t.includes(',')) t = t.replaceAll('.', '').replace(',', '.');
  return Number(t); // Number("5 kg") en Number("abc") geven NaN
}

// Een uniek id maken uit een naam: "Crème brûlée (nieuw)" → "creme-brulee-nieuw".
// Bestaat het al, dan "-2", "-3", enzovoort. Het id verandert daarna nooit meer,
// zodat verwijzingen (mixen, logboek, instellingen) blijven kloppen.
export function maakId(naam, bestaandeIds) {
  const basis = String(naam ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accenten weg: è → e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // alles wat geen letter/cijfer is → streepje
    .replace(/^-+|-+$/g, '') || 'item';
  let id = basis;
  for (let n = 2; bestaandeIds.includes(id); n++) id = `${basis}-${n}`;
  return id;
}
