// @vitest-environment happy-dom
// De grafiek is SVG-tekst; we zetten hem in een nagebootste pagina en tellen wat erin staat.

import { describe, it, expect } from 'vitest';
import { staafGrafiek } from '../src/ui/grafiek.js';
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
