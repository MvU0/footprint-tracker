import { describe, it, expect } from 'vitest';
import { getal, co2, water, bereik, mixBereik, kort, verschilTekst } from '../src/lib/format.js';
import { samenvatting } from '../src/lib/statistiek.js';

describe('getal', () => {
  it('gebruikt een komma en past decimalen aan op de grootte', () => {
    expect(getal(19.84)).toBe('19,8');
    expect(getal(5.2)).toBe('5,2');
    expect(getal(0.196)).toBe('0,196');
    expect(getal(1451.2)).toBe('1.451');
    expect(getal(0)).toBe('0');
  });
});

describe('eenheden', () => {
  it('kg en ton', () => {
    expect(co2(5.2)).toBe('5,2 kg CO2e');
    expect(co2(2500)).toBe('2,5 ton CO2e');
  });
  it('liter en m³', () => {
    expect(water(121.4)).toBe('121 L water');
    expect(water(3691.3)).toBe('3,69 m³ water');
  });
});

describe('bereik', () => {
  it('1 bron', () => {
    expect(bereik(samenvatting([5.2]))).toBe('5,2 kg CO2e (1 bron, geen bereik)');
  });
  it('3 bronnen: bereik en gemiddelde, geen mediaan', () => {
    expect(bereik(samenvatting([3, 7, 11]))).toBe('3 tot 11 kg CO2e, gemiddeld 7 (3 bronnen)');
  });
  it('4 bronnen: ook mediaan', () => {
    expect(bereik(samenvatting([2, 4, 6, 100]))).toBe('2 tot 100 kg CO2e, gemiddeld 28, mediaan 5 (4 bronnen)');
  });
  it('geen bronnen', () => {
    expect(bereik(samenvatting([]))).toBe('geen bronnen');
  });
  // Rundvlees, alle scopes: 121,4 L (RIVM) tot 2714,3 L (OWID). Alle getallen in dezelfde eenheid,
  // anders lees je "121 tot 2,71 m³" als 121 m³. Gemiddelde: (121,4 + 1451,2 + 2714,3) / 3 = 1428,97 L.
  it('bereik over de 1000: alle getallen in dezelfde eenheid', () => {
    expect(bereik(samenvatting([121.4, 1451.2, 2714.3]), water)).toBe('0,121 tot 2,71 m³ water, gemiddeld 1,43 (3 bronnen)');
    expect(bereik(samenvatting([800, 1200]), co2)).toBe('0,8 tot 1,2 ton CO2e, gemiddeld 1 (2 bronnen)');
  });
});

describe('kort (voor één regel in de lijst)', () => {
  it('één waarde, een bereik met streepje, of een streepje als er niets is', () => {
    expect(kort(samenvatting([5.2]))).toBe('5,2 kg CO2e');
    expect(kort(samenvatting([3, 7, 11]))).toBe('3–11 kg CO2e');
    expect(kort(samenvatting([121.4, 2714.3]), water)).toBe('0,121–2,71 m³ water');
    expect(kort(samenvatting([]))).toBe('–');
  });
  it('mix zonder bereik: het gewogen gemiddelde', () => {
    expect(kort({ n: 3, laag: 9.16, hoog: 9.16, gemiddeld: 9.16, heeftBereik: false })).toBe('9,16 kg CO2e');
  });
});

describe('verschilTekst (item − referentie)', () => {
  const v = (laag, gemiddeld, hoog) => ({ laag, gemiddeld, hoog });
  it('één waarde: minder of meer', () => {
    expect(verschilTekst(v(-6.4, -6.4, -6.4))).toBe('6,4 kg CO2e minder');
    expect(verschilTekst(v(6.4, 6.4, 6.4))).toBe('6,4 kg CO2e meer');
  });
  it('bereik: van het kleinste naar het grootste verschil', () => {
    expect(verschilTekst(v(-2, -7, -14))).toBe('2–14 kg CO2e minder');
    expect(verschilTekst(v(-1, 0.5, 2))).toBe('1 kg CO2e minder tot 2 kg CO2e meer');
  });
  it('geen verschil, of niet te berekenen', () => {
    expect(verschilTekst(v(0, 0, 0))).toBe('geen verschil');
    expect(verschilTekst(null)).toBe('–');
  });
  it('water', () => {
    expect(verschilTekst(v(-37.06, -37.06, -37.06), water)).toBe('37,1 L water minder');
  });
});

describe('mixBereik', () => {
  it('bereik over de 1000: alle getallen in dezelfde eenheid', () => {
    const s = { n: 2, laag: 500, hoog: 3000, gemiddeld: 1500, mediaan: null, heeftBereik: true };
    expect(mixBereik(s, water)).toBe('0,5 tot 3 m³ water, gewogen gemiddeld 1,5 (2 onderdelen)');
  });
});
