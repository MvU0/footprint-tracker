import { describe, it, expect } from 'vitest';
import { regelsIn, totalen, perCategorie, perPeriode, verandering } from '../src/lib/overzicht.js';
import { nieuweData } from '../src/lib/opslag.js';

// Testitems: "ref" heeft bronnen 8 en 12 (gem 10), "keuze" 1 en 3 (gem 2), geen water.
function testData() {
  const data = nieuweData();
  const bron = (co2e_kg) => ({ co2e_kg, water_l: null, bron: 'Test', link: null, jaar: 2026, scope: 'test', notitie: '', actief: true, status: 'aanname' });
  data.items.push(
    { id: 'ref', naam: 'Referentie', categorie: 'vlees', eenheid: 'kg', alternatieven: [], bronnen: [bron(8), bron(12)] },
    { id: 'keuze', naam: 'Keuze', categorie: 'vlees', eenheid: 'kg', alternatieven: [], bronnen: [bron(1), bron(3)] },
  );
  const r = (id, datum, item, hoeveelheid, extra = {}) => ({ id, datum, item, hoeveelheid, basis: 'gemiddeld', referentie: null, notitie: '', ...extra });
  data.logboek = [
    // 0,5 kg keuze t.o.v. ref: uitstoot gem 1 (0,5–1,5); besparing gem 4 (3,5–4,5)
    r('1', '2026-11-03', 'keuze', 0.5, { referentie: 'ref' }),
    // 1 kg keuze, basis hoog: uitstoot telt 3 (1–3); besparing telt 12 − 3 = 9 (laag 8 − 1 = 7)
    r('2', '2026-11-20', 'keuze', 1, { referentie: 'ref', basis: 'hoog' }),
    // smartphone zonder referentie: alleen uitstoot 79,27
    r('3', '2026-10-15', 'smartphone-nieuw', 1),
  ];
  return data;
}

describe('regelsIn', () => {
  it('kiest de logregels van één periode', () => {
    expect(regelsIn(testData(), '2026-11', 'maand').map((x) => x.id)).toEqual(['1', '2']);
    expect(regelsIn(testData(), '2026-W45', 'week').map((x) => x.id)).toEqual(['1']); // 3 nov. 2026 = week 45
  });
});

describe('totalen', () => {
  it('telt het getal van de basis op; het bereik is de som van de laagste en de hoogste per regel', () => {
    const data = testData();
    const t = totalen(data, regelsIn(data, '2026-11', 'maand'));
    expect(t.aantal).toBe(2);
    expect(t.uitstoot.telt).toBeCloseTo(4); // 1 + 3
    expect(t.uitstoot.laag).toBeCloseTo(1.5); // 0,5 + 1
    expect(t.uitstoot.hoog).toBeCloseTo(4.5); // 1,5 + 3
    expect(t.besparing.telt).toBeCloseTo(13); // 4 + 9
    expect(t.besparing.laag).toBeCloseTo(10.5); // 3,5 + 7
    expect(t.besparing.hoog).toBeCloseTo(13.5); // 4,5 + 9
  });

  it('regels zonder referentie of water worden apart geteld, niet als 0', () => {
    const data = testData();
    const okt = totalen(data, regelsIn(data, '2026-10', 'maand'));
    expect(okt.zonderReferentie).toBe(1);
    expect(okt.besparing.n).toBe(0);
    expect(okt.uitstoot.telt).toBeCloseTo(79.27);
    const nov = totalen(data, regelsIn(data, '2026-11', 'maand'));
    expect(nov.zonderWater).toBe(2);
    expect(nov.water.n).toBe(0);
  });

  it('lege periode', () => {
    const t = totalen(testData(), []);
    expect(t.aantal).toBe(0);
    expect(t.uitstoot.telt).toBe(0);
  });
});

describe('perCategorie en perPeriode', () => {
  it('per categorie alleen categorieën met regels', () => {
    const data = testData();
    const lijst = perCategorie(data, data.logboek);
    expect(lijst.map((x) => x.categorie.id)).toEqual(['vlees', 'aankopen']); // volgorde van de categorieën
    expect(lijst[0].totalen.uitstoot.telt).toBeCloseTo(4);
  });
  it('per periode, ook lege periodes', () => {
    const lijst = perPeriode(testData(), ['2026-09', '2026-10', '2026-11'], 'maand');
    expect(lijst.map((x) => x.totalen.aantal)).toEqual([0, 1, 2]);
  });
});

describe('verandering t.o.v. vorige periode', () => {
  it('verschil en procent; procent is leeg als de vorige periode 0 was', () => {
    const v = verandering(4, 5);
    expect(v.verschil).toBeCloseTo(-1);
    expect(v.procent).toBeCloseTo(-20);
    expect(verandering(4, 0).procent).toBeNull();
  });
});
