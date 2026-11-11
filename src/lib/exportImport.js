// Back-up: alle data naar één JSON-bestand, en weer terug.
//
// - maakExport:  data → { bestandsnaam, tekst }
// - leesImport:  tekst → { data, fouten, samenvatting }  (controleert alles vóór er iets verandert)
// - voegSamen:   huidige data + data uit een bestand; bij hetzelfde id wint het bestand
// Een GitHub-token komt NOOIT in een export (dat staat apart, zie github.js).

import { valideerCatalogus } from './validatie.js';
import { controleerLogregel } from './logboek.js';

export const SCHEMA_VERSIE = 1;

export function maakExport(data, datum) {
  const inhoud = {
    app: 'footprint-tracker',
    schemaVersie: SCHEMA_VERSIE,
    geexporteerd: datum,
    categorieen: data.categorieen,
    items: data.items,
    instellingen: data.instellingen,
    logboek: data.logboek,
  };
  return { bestandsnaam: `emissieapp-backup-${datum}.json`, tekst: JSON.stringify(inhoud, null, 2) };
}

// Toon niet honderden fouten: de eerste 10 en het aantal dat nog volgt.
const kort = (fouten) => (fouten.length > 10 ? [...fouten.slice(0, 10), `… en nog ${fouten.length - 10} fouten.`] : fouten);

export function leesImport(tekst) {
  const mislukt = (fouten) => ({ data: null, fouten: kort(fouten), samenvatting: null });

  let inhoud;
  try {
    inhoud = JSON.parse(tekst);
  } catch {
    return mislukt(['Dit bestand is geen geldig JSON-bestand.']);
  }
  if (!inhoud || !Array.isArray(inhoud.items) || !Array.isArray(inhoud.categorieen)) {
    return mislukt(['Dit bestand is geen back-up van deze app (items of categorieën ontbreken).']);
  }
  if (inhoud.schemaVersie !== SCHEMA_VERSIE) {
    return mislukt([`Onbekende versie (${inhoud.schemaVersie}); deze app kent versie ${SCHEMA_VERSIE}.`]);
  }

  const data = {
    schemaVersie: SCHEMA_VERSIE,
    categorieen: inhoud.categorieen,
    items: inhoud.items,
    instellingen: inhoud.instellingen ?? { standaardReferentie: {} },
    logboek: Array.isArray(inhoud.logboek) ? inhoud.logboek : [],
  };

  const fouten = [...valideerCatalogus(data)];
  data.logboek.forEach((r, i) => {
    if (!r?.id) fouten.push(`Logregel ${i + 1}: id ontbreekt.`);
    for (const f of controleerLogregel(data, r ?? {})) fouten.push(`Logregel ${i + 1}: ${f}`);
  });
  if (fouten.length) return mislukt(fouten);

  return { data, fouten: [], samenvatting: { categorieen: data.categorieen.length, items: data.items.length, logregels: data.logboek.length } };
}

// Lijsten samenvoegen op id: de volgorde van 'oud' blijft, 'nieuw' vervangt bij hetzelfde id, nieuwe ids komen achteraan.
function opId(oud, nieuw) {
  const nieuwPerId = new Map(nieuw.map((x) => [x.id, x]));
  const oudeIds = new Set(oud.map((x) => x.id));
  return [...oud.map((x) => nieuwPerId.get(x.id) ?? x), ...nieuw.filter((x) => !oudeIds.has(x.id))];
}

export function voegSamen(huidig, bestand) {
  const data = structuredClone({
    ...huidig,
    categorieen: opId(huidig.categorieen, bestand.categorieen),
    items: opId(huidig.items, bestand.items),
    instellingen: {
      ...huidig.instellingen,
      standaardReferentie: { ...huidig.instellingen?.standaardReferentie, ...bestand.instellingen?.standaardReferentie },
    },
    logboek: opId(huidig.logboek, bestand.logboek),
  });
  const fouten = valideerCatalogus(data);
  return fouten.length ? { data: null, fouten: kort(fouten) } : { data, fouten: [] };
}

// Hoeveel dagen geleden de laatste back-up was (null = nog nooit).
export function dagenSindsBackup(data, vandaag) {
  if (!data.laatsteBackup) return null;
  return Math.round((new Date(`${vandaag}T00:00:00Z`) - new Date(`${data.laatsteBackup}T00:00:00Z`)) / 86400000);
}
