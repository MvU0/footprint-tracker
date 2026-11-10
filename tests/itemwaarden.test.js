import { describe, it, expect } from 'vitest';
import { berekenItem, selecteerBronnen, waarschuwingenVoorItem, groepeerPerScope } from '../src/lib/itemwaarden.js';
import startdata from '../src/data/startdata.json';

// Kleine hulpfunctie om snel een bron te maken.
const bron = (co2e_kg, extra = {}) => ({
  co2e_kg, water_l: null, bron: 'Test', scope: 'A', actief: true, status: 'gecontroleerd', ...extra,
});
const map = (...items) => new Map(items.map((i) => [i.id, i]));

describe('welke bronnen tellen mee', () => {
  it('inactieve bronnen tellen niet mee', () => {
    const item = { id: 'x', eenheid: 'kg', bronnen: [bron(10), bron(99, { actief: false })] };
    expect(berekenItem(item, map(item)).co2.gemiddeld).toBe(10);
  });

  it('bronnen met een andere eenheid tellen niet mee en geven een waarschuwing', () => {
    const item = { id: 'x', eenheid: 'kg', bronnen: [bron(10), bron(3, { eenheid: 'portie' })] };
    expect(berekenItem(item, map(item)).co2.n).toBe(1);
    expect(waarschuwingenVoorItem(item).map((w) => w.type)).toEqual(['eenheid']);
  });

  it('verschillende scopes zonder keuze → scope-waarschuwing, alles telt mee', () => {
    const item = { id: 'x', eenheid: 'kg', bronnen: [bron(2, { scope: 'A' }), bron(8, { scope: 'B' })] };
    expect(berekenItem(item, map(item)).co2.gemiddeld).toBe(5);
    expect(waarschuwingenVoorItem(item).map((w) => w.type)).toEqual(['scope']);
  });

  it('met een gekozen scope telt alleen die scope mee', () => {
    const item = { id: 'x', eenheid: 'kg', scopeKeuze: 'B', bronnen: [bron(2, { scope: 'A' }), bron(8, { scope: 'B' })] };
    expect(berekenItem(item, map(item)).co2.gemiddeld).toBe(8);
    expect(selecteerBronnen(item).andereScope).toHaveLength(1);
    expect(waarschuwingenVoorItem(item).map((w) => w.type)).toEqual(['scope-gekozen']);
  });

  it('groepeert bronnen per scope met eigen bereik', () => {
    const item = { id: 'x', eenheid: 'kg', bronnen: [bron(2, { scope: 'A' }), bron(4, { scope: 'A' }), bron(8, { scope: 'B' })] };
    const groepen = groepeerPerScope(item);
    expect(groepen.map((g) => [g.scope, g.co2.laag, g.co2.hoog])).toEqual([['A', 2, 4], ['B', 8, 8]]);
  });

  it('water: alleen bronnen mét waterwaarde tellen mee (ontbrekend ≠ 0)', () => {
    const item = { id: 'x', eenheid: 'kg', bronnen: [bron(1, { water_l: 100 }), bron(2, { water_l: null })] };
    const w = berekenItem(item, map(item));
    expect(w.co2.n).toBe(2);
    expect(w.water.n).toBe(1);
    expect(w.water.gemiddeld).toBe(100);
  });
});

describe('mix-items', () => {
  const tien = { id: 'tien', naam: 'Tien', eenheid: 'kg', bronnen: [bron(10, { water_l: 100 })] };
  const twee = { id: 'twee', naam: 'Twee', eenheid: 'kg', bronnen: [bron(2, { water_l: 20 })] };

  it('50% × 10 + 50% × 2 = 6', () => {
    const mix = { id: 'm', eenheid: 'kg', type: 'mix', mix: [{ item: 'tien', aandeel: 1 }, { item: 'twee', aandeel: 1 }] };
    const w = berekenItem(mix, map(tien, twee, mix));
    expect(w.co2.gemiddeld).toBe(6);
    expect(w.water.gemiddeld).toBe(60);
  });

  it('aandelen hoeven niet op 1 uit te komen: 3 × 10 + 1 × 2, gedeeld door 4 = 8', () => {
    const mix = { id: 'm', eenheid: 'kg', type: 'mix', mix: [{ item: 'tien', aandeel: 3 }, { item: 'twee', aandeel: 1 }] };
    expect(berekenItem(mix, map(tien, twee, mix)).co2.gemiddeld).toBe(8);
  });

  it('laag en hoog worden apart gewogen', () => {
    const bereik = { id: 'b', naam: 'Bereik', eenheid: 'kg', bronnen: [bron(4), bron(8)] }; // laag 4, hoog 8
    const mix = { id: 'm', eenheid: 'kg', type: 'mix', mix: [{ item: 'b', aandeel: 1 }, { item: 'twee', aandeel: 1 }] };
    const w = berekenItem(mix, map(bereik, twee, mix));
    expect(w.co2.laag).toBe(3);  // (4 + 2) / 2
    expect(w.co2.hoog).toBe(5);  // (8 + 2) / 2
    expect(w.co2.gemiddeld).toBe(4); // (6 + 2) / 2
  });

  it('onderdeel zonder aandeel telt niet mee en wordt gemeld', () => {
    const mix = { id: 'm', eenheid: 'kg', type: 'mix', mix: [{ item: 'tien', aandeel: 1 }, { item: 'twee', aandeel: null }] };
    const w = berekenItem(mix, map(tien, twee, mix));
    expect(w.co2.gemiddeld).toBe(10);
    expect(w.waarschuwingen[0].tekst).toMatch(/niet ingevuld/);
  });

  it('water ontbreekt bij één onderdeel → geen waterwaarde voor de mix', () => {
    const zonderWater = { id: 'z', naam: 'Z', eenheid: 'kg', bronnen: [bron(1)] };
    const mix = { id: 'm', eenheid: 'kg', type: 'mix', mix: [{ item: 'tien', aandeel: 1 }, { item: 'z', aandeel: 1 }] };
    expect(berekenItem(mix, map(tien, zonderWater, mix)).water.n).toBe(0);
  });
});

describe('startdata', () => {
  const items = new Map(startdata.items.map((i) => [i.id, i]));

  it('vleesmix ≈ 9,16 kg CO2e/kg: (16,3 × 19,84 + 35,1 × 7,47 + 22,0 × 3,94) / 73,4', () => {
    expect(berekenItem(items.get('vlees-mix'), items).co2.gemiddeld).toBeCloseTo(9.159, 3);
  });

  it('vervoersmix ≈ 0,108 kg CO2e/km', () => {
    expect(berekenItem(items.get('vervoer-mix'), items).co2.gemiddeld).toBeCloseTo(0.1082, 4);
  });

  it('rundvlees telt standaard alleen de RIVM-bron (gekozen scope)', () => {
    const w = berekenItem(items.get('rundvlees'), items);
    expect(w.co2.n).toBe(1);
    expect(w.co2.gemiddeld).toBe(19.84);
  });
});
