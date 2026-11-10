import { describe, it, expect } from 'vitest';
import { referentieVoor, berekenLogregel } from '../src/lib/besparing.js';
import { nieuweData } from '../src/lib/opslag.js';

const regel = (item, hoeveelheid, extra = {}) => ({ id: 'x', datum: '2026-11-10', item, hoeveelheid, basis: 'gemiddeld', referentie: null, notitie: '', ...extra });

// Twee testitems met narekenbare waarden.
function testData() {
  const data = nieuweData();
  const bron = (co2e_kg, water_l = null) => ({ co2e_kg, water_l, bron: 'Test', link: null, jaar: 2026, scope: 'test', notitie: '', actief: true, status: 'aanname' });
  data.items.push(
    { id: 'ref', naam: 'Referentie', categorie: 'vlees', eenheid: 'kg', alternatieven: [], bronnen: [bron(8, 100), bron(12, 100)] }, // gem 10
    { id: 'keuze', naam: 'Keuze', categorie: 'vlees', eenheid: 'kg', alternatieven: [], bronnen: [bron(1), bron(3)] }, // gem 2, geen water
  );
  return data;
}

describe('referentieVoor', () => {
  it('standaard: de standaardreferentie van het item, anders die van de categorie', () => {
    const data = nieuweData();
    expect(referentieVoor(data, regel('tshirt-tweedehands', 1)).id).toBe('tshirt-nieuw');
    expect(referentieVoor(data, regel('kip', 1)).id).toBe('vlees-mix');
  });
  it('een zelf gekozen referentie gaat voor', () => {
    expect(referentieVoor(nieuweData(), regel('kip', 1, { referentie: 'rundvlees' })).id).toBe('rundvlees');
  });
  it('geen referentie, of een met een andere eenheid: null', () => {
    expect(referentieVoor(nieuweData(), regel('smartphone-nieuw', 1))).toBeNull();
    expect(referentieVoor(nieuweData(), regel('kip', 1, { referentie: 'trein' }))).toBeNull();
  });
});

describe('berekenLogregel', () => {
  // Voorbeeld uit PLAN.md: referentie 10 kg CO2e/kg, keuze 2, hoeveelheid 0,5 kg → uitstoot 1, besparing 4.
  it('uitstoot en besparing (gemiddeld)', () => {
    const r = berekenLogregel(testData(), regel('keuze', 0.5, { referentie: 'ref' }));
    expect(r.uitstootTelt).toBeCloseTo(1);
    expect(r.besparingTelt).toBeCloseTo(4);
  });

  // Steeds dezelfde basis: laag 8×0,5 − 1×0,5 = 3,5; hoog 12×0,5 − 3×0,5 = 4,5.
  it('besparing als bereik, laag met laag en hoog met hoog', () => {
    const { besparing } = berekenLogregel(testData(), regel('keuze', 0.5, { referentie: 'ref' }));
    expect(besparing.laag).toBeCloseTo(3.5);
    expect(besparing.gemiddeld).toBeCloseTo(4);
    expect(besparing.hoog).toBeCloseTo(4.5);
  });

  it('de basis van de logregel bepaalt wat meetelt', () => {
    const r = berekenLogregel(testData(), regel('keuze', 0.5, { referentie: 'ref', basis: 'hoog' }));
    expect(r.uitstootTelt).toBeCloseTo(1.5);
    expect(r.besparingTelt).toBeCloseTo(4.5);
  });

  it('slechter dan de referentie: negatieve besparing (extra uitstoot)', () => {
    const r = berekenLogregel(testData(), regel('ref', 1, { referentie: 'keuze' }));
    expect(r.besparingTelt).toBeCloseTo(-8);
  });

  it('water alleen als beide items waterdata hebben; anders null (niet 0)', () => {
    const r = berekenLogregel(testData(), regel('keuze', 0.5, { referentie: 'ref' }));
    expect(r.waterTelt).toBeNull();
    expect(r.waterBesparingTelt).toBeNull();
  });

  it('zonder referentie: wel uitstoot, geen besparing', () => {
    const r = berekenLogregel(nieuweData(), regel('smartphone-nieuw', 1));
    expect(r.uitstootTelt).toBeCloseTo(79.27);
    expect(r.referentie).toBeNull();
    expect(r.besparingTelt).toBeNull();
  });

  it('item bestaat niet (meer): geen uitkomst, geen crash', () => {
    const r = berekenLogregel(nieuweData(), regel('bestaat-niet', 1));
    expect(r.item).toBeNull();
    expect(r.uitstootTelt).toBeNull();
  });
});
