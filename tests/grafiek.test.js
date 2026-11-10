// @vitest-environment happy-dom
// De grafiek is SVG-tekst; we zetten hem in een nagebootste pagina en tellen wat erin staat.

import { describe, it, expect } from 'vitest';
import { staafGrafiek, kolomGrafiek } from '../src/ui/grafiek.js';
import { co2 } from '../src/lib/format.js';

function teken(rijen) {
  const div = document.createElement('div');
  div.innerHTML = staafGrafiek(rijen, { titel: 'CO2e', opmaak: co2 });
  return div;
}
const r = (naam, laag, gemiddeld, hoog, extra = {}) => ({ naam, laag, gemiddeld, hoog, heeftBereik: laag !== hoog, ...extra });

describe('staafGrafiek', () => {
  it('één staaf per item, van groot naar klein', () => {
    const g = teken([r('Trein', 1.2, 1.2, 1.2), r('Auto', 7.6, 7.6, 7.6), r('Fiets', 0, 0, 0)]);
    expect(g.querySelectorAll('.staaf').length).toBe(3);
    expect([...g.querySelectorAll('.naam')].map((t) => t.textContent)).toEqual(['Auto', 'Trein', 'Fiets']);
  });

  it('de grootste waarde (ook een snorhaar) vult de breedte; de rest naar verhouding', () => {
    const g = teken([r('A', 2, 5, 10), r('B', 2.5, 2.5, 2.5)]);
    const [a, b] = [...g.querySelectorAll('.staaf')].map((s) => Number(s.dataset.lengte));
    expect(b / a).toBeCloseTo(0.5); // 2,5 is de helft van 5
    expect(Number(g.querySelector('.snor').dataset.tot)).toBeCloseTo(1); // hoog = 10 = volle breedte
  });

  it('snorharen alleen bij een bereik', () => {
    const g = teken([r('Rund', 3, 7.6, 14.9), r('Kip', 0.6, 0.6, 0.6)]);
    expect(g.querySelectorAll('.snor').length).toBe(1);
  });

  it('alles 0: geen kapotte getallen (NaN) in de grafiek', () => {
    const g = teken([r('Fiets', 0, 0, 0), r('Lopen', 0, 0, 0)]);
    expect(g.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('hover-tekst met naam en waarde; referentie is herkenbaar aan tekst, niet alleen aan kleur', () => {
    const g = teken([r('Auto', 7.6, 7.6, 7.6, { isReferentie: true }), r('Trein', 1.2, 1.2, 1.2)]);
    expect(g.querySelector('title').textContent).toMatch(/Auto.*7,6 kg CO2e/);
    expect(g.textContent).toMatch(/Auto \(referentie\)/);
  });
});

describe('kolomGrafiek (twee reeksen over de tijd)', () => {
  const reeksen = [{ naam: 'Uitgestoten' }, { naam: 'Bespaard' }];
  const teken2 = (periodes) => {
    const div = document.createElement('div');
    div.innerHTML = kolomGrafiek(periodes, { titel: 'Per maand', reeksen, opmaak: co2 });
    return div;
  };

  it('per periode een kolom per reeks, plus een legenda met de namen', () => {
    const g = teken2([
      { label: 'sep', waarden: [0, 0] },
      { label: 'okt', waarden: [79.3, 0] },
      { label: 'nov', waarden: [4, 13] },
    ]);
    expect(g.querySelectorAll('.kolom').length).toBe(6);
    expect([...g.querySelectorAll('.legenda li')].map((li) => li.textContent.trim())).toEqual(['Uitgestoten', 'Bespaard']);
  });

  it('hoogte naar verhouding; een negatieve waarde (extra uitstoot) gaat onder de nullijn', () => {
    const g = teken2([{ label: 'nov', waarden: [10, -5] }]);
    const [a, b] = [...g.querySelectorAll('.kolom')].map((k) => Number(k.dataset.hoogte));
    expect(a).toBeGreaterThan(0);
    expect(b / a).toBeCloseTo(-0.5);
  });

  it('alles 0: geen kapotte getallen', () => {
    const g = teken2([{ label: 'sep', waarden: [0, 0] }]);
    expect(g.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('hover-tekst per periode met beide waarden', () => {
    const g = teken2([{ label: 'nov', waarden: [4, 13] }]);
    expect(g.querySelector('.periode title').textContent).toMatch(/nov.*Uitgestoten: 4 kg CO2e.*Bespaard: 13 kg CO2e/);
  });
});
