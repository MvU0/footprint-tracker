import { describe, it, expect } from 'vitest';
import { getal, co2, water, bereik } from '../src/lib/format.js';
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
});
