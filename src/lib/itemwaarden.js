// Berekent de waarden (CO2e en water) van een item uit zijn bronnen,
// of — bij een mix-item — uit zijn onderdelen.
//
// Welke bronnen tellen mee?
//   1. alleen bronnen die "actief" zijn,
//   2. met een waarde (niet leeg),
//   3. met dezelfde eenheid als het item (afwijkende eenheid = appels en peren),
//   4. als bij het item een scope gekozen is: alleen bronnen met die scope.

import { samenvatting } from './statistiek.js';

// De bronnen die meetellen, plus wat er is uitgesloten en waarom.
export function selecteerBronnen(item) {
  const actief = (item.bronnen ?? []).filter((b) => b.actief && b.co2e_kg !== null);
  const juisteEenheid = actief.filter((b) => !b.eenheid || b.eenheid === item.eenheid);
  const andereEenheid = actief.filter((b) => b.eenheid && b.eenheid !== item.eenheid);

  const scopes = [...new Set(juisteEenheid.map((b) => b.scope))];
  // Een gekozen scope die niet (meer) voorkomt, negeren we.
  const scopeKeuze = item.scopeKeuze && scopes.includes(item.scopeKeuze) ? item.scopeKeuze : null;
  const tellend = scopeKeuze ? juisteEenheid.filter((b) => b.scope === scopeKeuze) : juisteEenheid;
  const andereScope = scopeKeuze ? juisteEenheid.filter((b) => b.scope !== scopeKeuze) : [];

  return { tellend, andereEenheid, andereScope, scopes, scopeKeuze };
}

// Groepeer de actieve bronnen (met juiste eenheid) per scope, met een samenvatting per groep.
// Handig om bij een scope-waarschuwing de groepen naast elkaar te laten zien.
export function groepeerPerScope(item) {
  const { scopes } = selecteerBronnen(item);
  const actief = (item.bronnen ?? []).filter(
    (b) => b.actief && b.co2e_kg !== null && (!b.eenheid || b.eenheid === item.eenheid),
  );
  return scopes.map((scope) => {
    const bronnen = actief.filter((b) => b.scope === scope);
    return { scope, bronnen, co2: samenvatting(bronnen.map((b) => b.co2e_kg)) };
  });
}

// Waarschuwingen en meldingen bij een item.
//  - 'eenheid': actieve bronnen met een andere eenheid (tellen niet mee)
//  - 'scope':   meetellende bronnen hebben verschillende scopes (gemiddelde = appels met peren)
//  - 'scope-gekozen': ter info, er is een scope gekozen en andere bronnen tellen niet mee
export function waarschuwingenVoorItem(item) {
  if (item.type === 'mix') return [];
  const { andereEenheid, andereScope, scopes, scopeKeuze } = selecteerBronnen(item);
  const lijst = [];
  if (andereEenheid.length > 0) {
    lijst.push({
      type: 'eenheid',
      tekst: `${andereEenheid.length} bron(nen) gebruiken een andere eenheid (${[...new Set(andereEenheid.map((b) => b.eenheid))].join(', ')}) dan dit item (${item.eenheid}) en tellen niet mee.`,
    });
  }
  if (scopes.length > 1 && !scopeKeuze) {
    lijst.push({
      type: 'scope',
      tekst: `De bronnen hebben ${scopes.length} verschillende scopes. Het gemiddelde vergelijkt dan appels met peren. Kies welke scope meetelt.`,
    });
  }
  if (scopeKeuze && andereScope.length > 0) {
    lijst.push({
      type: 'scope-gekozen',
      tekst: `Alleen bronnen met scope "${scopeKeuze}" tellen mee; ${andereScope.length} bron(nen) met een andere scope niet.`,
    });
  }
  return lijst;
}

// Hoofdfunctie: de waarden van één item.
// itemsPerId is een Map van id naar item (nodig voor mix-items).
export function berekenItem(item, itemsPerId) {
  if (item.type === 'mix') return berekenMix(item, itemsPerId);

  const { tellend } = selecteerBronnen(item);
  const metWater = tellend.filter((b) => b.water_l !== null && b.water_l !== undefined);
  return {
    type: 'bronnen',
    co2: samenvatting(tellend.map((b) => b.co2e_kg)),
    water: samenvatting(metWater.map((b) => b.water_l)),
    waarschuwingen: waarschuwingenVoorItem(item),
  };
}

// Een mix is een gewogen gemiddelde van zijn onderdelen:
//   waarde = Σ (aandeel × waarde onderdeel) / Σ aandeel
// Dat doen we apart voor laag, gemiddeld en hoog.
// Onderdelen met een leeg aandeel (null) tellen niet mee; dat wordt gemeld.
// Ontbreekt bij een meetellend onderdeel de waarde, dan is de mix onvolledig (geen uitkomst).
// Water: alleen als álle meetellende onderdelen een waterwaarde hebben.
export function berekenMix(item, itemsPerId) {
  const meldingen = [];
  const delen = [];
  for (const deel of item.mix ?? []) {
    const onderdeel = itemsPerId.get(deel.item);
    if (!onderdeel) {
      meldingen.push({ type: 'mix', tekst: `Onderdeel "${deel.item}" bestaat niet.` });
      continue;
    }
    if (deel.aandeel === null || deel.aandeel === undefined) {
      meldingen.push({ type: 'mix', tekst: `Aandeel van "${onderdeel.naam}" is nog niet ingevuld; telt niet mee.` });
      continue;
    }
    if (deel.aandeel <= 0) continue;
    const w = berekenItem(onderdeel, itemsPerId);
    delen.push({ item: onderdeel, aandeel: deel.aandeel, waarden: w });
    if (w.waarschuwingen.some((x) => x.type === 'scope' || x.type === 'eenheid')) {
      meldingen.push({ type: 'mix', tekst: `Onderdeel "${onderdeel.naam}" heeft een waarschuwing over scope of eenheid.` });
    }
  }

  const totaal = delen.reduce((s, d) => s + d.aandeel, 0);
  const leeg = { n: 0, laag: null, hoog: null, gemiddeld: null, mediaan: null, heeftBereik: false };
  const zonderCo2 = delen.filter((d) => d.waarden.co2.n === 0);
  if (totaal === 0 || zonderCo2.length > 0) {
    for (const d of zonderCo2) meldingen.push({ type: 'mix', tekst: `Onderdeel "${d.item.naam}" heeft geen waarde; de mix kan niet worden berekend.` });
    return { type: 'mix', co2: leeg, water: leeg, delen, waarschuwingen: meldingen };
  }

  const gewogen = (soort, sleutel) =>
    delen.reduce((s, d) => s + d.aandeel * d.waarden[soort][sleutel], 0) / totaal;

  const co2 = {
    n: delen.length,
    laag: gewogen('co2', 'laag'),
    hoog: gewogen('co2', 'hoog'),
    gemiddeld: gewogen('co2', 'gemiddeld'),
    mediaan: null,
    heeftBereik: delen.some((d) => d.waarden.co2.heeftBereik),
  };

  const waterCompleet = delen.every((d) => d.waarden.water.n > 0);
  const water = waterCompleet
    ? {
        n: delen.length,
        laag: gewogen('water', 'laag'),
        hoog: gewogen('water', 'hoog'),
        gemiddeld: gewogen('water', 'gemiddeld'),
        mediaan: null,
        heeftBereik: delen.some((d) => d.waarden.water.heeftBereik),
      }
    : leeg;

  return { type: 'mix', co2, water, delen, totaalAandeel: totaal, waarschuwingen: meldingen };
}
