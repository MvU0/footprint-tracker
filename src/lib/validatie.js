// Controleert of de catalogus (categorieën + items + bronnen) klopt.
// Geeft een lijst met fouten terug in gewone taal. Lege lijst = alles in orde.
// Wordt gebruikt door de tests, en later ook bij importeren en in formulieren.

export const EENHEDEN = ['km', 'kg', 'stuk', 'portie'];

export const STATUSSEN = [
  'gecontroleerd',      // waarde direct uit de bron overgenomen
  'afgeleid',           // berekend uit één of meer bronnen (berekening staat in de notitie)
  'aanname',            // geen bron; redenering staat in de notitie
  'niet gecontroleerd', // overgenomen, maar nog niet nagekeken
  'nog te onderzoeken', // waarde ontbreekt nog
];

// Hulpfunctie: is dit een getal (en geen NaN)?
const isGetal = (x) => typeof x === 'number' && Number.isFinite(x);

export function valideerCatalogus(data) {
  const fouten = [];
  const categorieIds = new Set((data.categorieen ?? []).map((c) => c.id));
  const itemsPerId = new Map();

  // 1. Elk item heeft een uniek id.
  for (const item of data.items ?? []) {
    if (!item.id) fouten.push(`Item zonder id: "${item.naam ?? '?'}"`);
    else if (itemsPerId.has(item.id)) fouten.push(`Dubbel item-id: "${item.id}"`);
    else itemsPerId.set(item.id, item);
  }

  for (const item of data.items ?? []) {
    const wie = `Item "${item.naam || item.id}"`;

    // 2. Basisvelden.
    if (!item.naam) fouten.push(`${wie}: naam ontbreekt`);
    if (!categorieIds.has(item.categorie)) fouten.push(`${wie}: onbekende categorie "${item.categorie}"`);
    if (!EENHEDEN.includes(item.eenheid)) fouten.push(`${wie}: onbekende eenheid "${item.eenheid}"`);

    // 3. Verwijzingen naar andere items moeten bestaan.
    for (const alt of item.alternatieven ?? []) {
      if (!itemsPerId.has(alt)) fouten.push(`${wie}: alternatief "${alt}" bestaat niet`);
    }
    if (item.standaardReferentie && !itemsPerId.has(item.standaardReferentie)) {
      fouten.push(`${wie}: standaardReferentie "${item.standaardReferentie}" bestaat niet`);
    }

    // 4a. Mix-items: onderdelen moeten bestaan, zelf geen mix zijn, en dezelfde eenheid hebben.
    if (item.type === 'mix') {
      if (!Array.isArray(item.mix) || item.mix.length === 0) {
        fouten.push(`${wie}: mix heeft geen onderdelen`);
      }
      for (const deel of item.mix ?? []) {
        const onderdeel = itemsPerId.get(deel.item);
        if (!onderdeel) {
          fouten.push(`${wie}: mix-onderdeel "${deel.item}" bestaat niet`);
          continue;
        }
        if (onderdeel.type === 'mix') fouten.push(`${wie}: mix-onderdeel "${deel.item}" is zelf een mix`);
        if (onderdeel.eenheid !== item.eenheid) {
          fouten.push(`${wie}: mix-onderdeel "${deel.item}" heeft eenheid "${onderdeel.eenheid}", mix heeft "${item.eenheid}"`);
        }
        if (deel.aandeel !== null && (!isGetal(deel.aandeel) || deel.aandeel < 0)) {
          fouten.push(`${wie}: aandeel van "${deel.item}" moet een getal ≥ 0 zijn of leeg`);
        }
      }
      continue; // een mix heeft geen eigen bronnen
    }

    // 4b. Een gekozen scope moet bij een van de bronnen horen.
    if (item.scopeKeuze && !(item.bronnen ?? []).some((b) => b.scope === item.scopeKeuze)) {
      fouten.push(`${wie}: gekozen scope "${item.scopeKeuze}" komt bij geen enkele bron voor`);
    }

    // 4c. Gewone items: controleer elke bron.
    (item.bronnen ?? []).forEach((b, i) => {
      const bw = `${wie}, bron ${i + 1}`;
      if (b.co2e_kg !== null && (!isGetal(b.co2e_kg) || b.co2e_kg < 0)) fouten.push(`${bw}: CO2e moet een getal ≥ 0 zijn of leeg`);
      if (b.water_l !== null && b.water_l !== undefined && (!isGetal(b.water_l) || b.water_l < 0)) fouten.push(`${bw}: water moet een getal ≥ 0 zijn of leeg`);
      if (b.jaar !== null && b.jaar !== undefined && !Number.isInteger(b.jaar)) fouten.push(`${bw}: jaar moet een heel getal zijn of leeg`);
      if (!b.bron) fouten.push(`${bw}: bronnaam ontbreekt`);
      if (!b.scope) fouten.push(`${bw}: scope ontbreekt`);
      if (typeof b.actief !== 'boolean') fouten.push(`${bw}: actief moet true of false zijn`);
      if (!STATUSSEN.includes(b.status)) fouten.push(`${bw}: onbekende status "${b.status}"`);
      if (b.eenheid !== undefined && !EENHEDEN.includes(b.eenheid)) fouten.push(`${bw}: onbekende eenheid "${b.eenheid}"`);
      if (b.co2e_kg === null && b.status !== 'nog te onderzoeken') {
        fouten.push(`${bw}: zonder waarde moet de status "nog te onderzoeken" zijn`);
      }
    });
  }

  // 5. Standaardreferenties in de instellingen moeten bestaan en in de juiste categorie zitten.
  const refs = data.instellingen?.standaardReferentie ?? {};
  for (const [cat, itemId] of Object.entries(refs)) {
    if (!categorieIds.has(cat)) fouten.push(`Instellingen: onbekende categorie "${cat}"`);
    if (itemId === null) continue;
    const ref = itemsPerId.get(itemId);
    if (!ref) fouten.push(`Instellingen: standaardreferentie "${itemId}" bestaat niet`);
    else if (ref.categorie !== cat) fouten.push(`Instellingen: referentie "${itemId}" hoort niet bij categorie "${cat}"`);
  }

  return fouten;
}
