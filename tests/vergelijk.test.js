import { describe, it, expect } from 'vitest';
import { vergelijk } from '../src/lib/vergelijk.js';
import { nieuweData } from '../src/lib/opslag.js';

const rij = (rijen, id) => rijen.find((r) => r.item.id === id);

describe('vergelijk', () => {
  // 40 km: auto 0,190 × 40 = 7,6 kg; trein 0,030 × 40 = 1,2 kg; fiets 0.
  it('vermenigvuldigt met de hoeveelheid en rekent het verschil met de referentie uit', () => {
    const rijen = vergelijk(nieuweData(), ['auto-gemiddeld', 'trein', 'fiets'], 40, 'auto-gemiddeld');
    expect(rij(rijen, 'auto-gemiddeld').co2.gemiddeld).toBeCloseTo(7.6);
    expect(rij(rijen, 'trein').co2.gemiddeld).toBeCloseTo(1.2);
    expect(rij(rijen, 'fiets').co2.gemiddeld).toBe(0);
    expect(rij(rijen, 'trein').verschil.gemiddeld).toBeCloseTo(-6.4); // 6,4 kg minder dan de auto
    expect(rij(rijen, 'auto-gemiddeld').isReferentie).toBe(true);
  });

  it('een andere referentie kiezen', () => {
    const rijen = vergelijk(nieuweData(), ['auto-gemiddeld', 'trein'], 40, 'trein');
    expect(rij(rijen, 'auto-gemiddeld').verschil.gemiddeld).toBeCloseTo(6.4); // 6,4 kg meer dan de trein
  });

  // Rundvlees met alle scopes (19,84 / 99,48 / 33,3) × 0,15 kg → laag 2,976, gem 7,631, hoog 14,922.
  // Kip (alleen RIVM-scope): 3,94 × 0,15 = 0,591.
  // Verschil kip − rund, steeds op dezelfde basis: laag −2,385, gem −7,040, hoog −14,331.
  it('bereik: laag, gemiddeld en hoog apart, ook voor het verschil', () => {
    const data = nieuweData();
    data.items.find((i) => i.id === 'rundvlees').scopeKeuze = null;
    const rijen = vergelijk(data, ['rundvlees', 'kip'], 0.15, 'rundvlees');
    const rund = rij(rijen, 'rundvlees').co2;
    expect(rund.laag).toBeCloseTo(2.976);
    expect(rund.gemiddeld).toBeCloseTo(7.631);
    expect(rund.hoog).toBeCloseTo(14.922);
    const v = rij(rijen, 'kip').verschil;
    expect(v.laag).toBeCloseTo(-2.385);
    expect(v.gemiddeld).toBeCloseTo(-7.04);
    expect(v.hoog).toBeCloseTo(-14.331);
  });

  it('ontbrekend water telt niet als 0: geen water en geen waterverschil', () => {
    const rijen = vergelijk(nieuweData(), ['auto-gemiddeld', 'trein'], 40, 'auto-gemiddeld');
    expect(rij(rijen, 'trein').water.n).toBe(0);
    expect(rij(rijen, 'trein').verschilWater).toBeNull();
  });

  // Kip 47,3 L/kg, rundvlees (RIVM) 121,4 L/kg; × 0,5 kg → 23,65 en 60,7; verschil −37,05.
  it('water en waterverschil als beide items waterdata hebben', () => {
    const rijen = vergelijk(nieuweData(), ['rundvlees', 'kip'], 0.5, 'rundvlees');
    expect(rij(rijen, 'kip').water.gemiddeld).toBeCloseTo(23.65);
    expect(rij(rijen, 'kip').verschilWater.gemiddeld).toBeCloseTo(-37.05);
  });
});
