// Lezen en schrijven van alle app-data in de browser (localStorage).
//
// Werking:
// - De eerste keer dat je de app opent, staat er nog niets in localStorage.
//   Dan wordt een kopie van de startdata (src/data/startdata.json) gemaakt.
// - Daarna is localStorage leidend: jouw aanpassingen aan items en bronnen,
//   je logboek en je instellingen staan daar.
// - "Terug naar startdata" overschrijft de catalogus, maar laat je logboek staan.
//
// De functies krijgen de opslag als parameter (standaard: de echte localStorage).
// Daardoor kunnen de tests een nep-opslag meegeven.

import startdata from '../data/startdata.json';

export const OPSLAG_SLEUTEL = 'footprint-tracker:v1';

// Diepe kopie, zodat wijzigingen nooit per ongeluk de startdata zelf aanpassen.
const kopie = (x) => JSON.parse(JSON.stringify(x));

export function nieuweData() {
  return {
    schemaVersie: startdata.schemaVersie,
    categorieen: kopie(startdata.categorieen),
    items: kopie(startdata.items),
    instellingen: kopie(startdata.instellingen),
    logboek: [],
  };
}

export function laadData(opslag = globalThis.localStorage) {
  let tekst = null;
  try {
    tekst = opslag?.getItem(OPSLAG_SLEUTEL) ?? null;
  } catch {
    // Opslag niet beschikbaar (bijv. privévenster met geblokkeerde opslag).
  }
  if (tekst) {
    try {
      return JSON.parse(tekst);
    } catch {
      // Kapotte data: niet stilletjes weggooien, wel doorgaan met startdata.
      console.warn('Opgeslagen data kon niet worden gelezen; startdata wordt gebruikt.');
    }
  }
  return nieuweData();
}

export function bewaarData(data, opslag = globalThis.localStorage) {
  try {
    opslag.setItem(OPSLAG_SLEUTEL, JSON.stringify(data));
    return true;
  } catch {
    return false; // bijv. opslag vol of geblokkeerd; de UI kan hier een melding van maken
  }
}

// Zet items, categorieën en instellingen terug naar de startdata. Het logboek blijft bewaard.
export function terugNaarStartdata(data) {
  const vers = nieuweData();
  return { ...vers, logboek: data.logboek ?? [] };
}
