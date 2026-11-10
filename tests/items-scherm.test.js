// @vitest-environment happy-dom
// Rooktest: tekent het scherm Items in een nagebootste browser en controleert
// of de belangrijkste dingen erop staan. Zo zien we fouten in het scherm zonder
// de browser te openen.

import { describe, it, expect } from 'vitest';
import { toonItems } from '../src/views/items.js';
import { nieuweData } from '../src/lib/opslag.js';

function maakApp() {
  const el = document.createElement('div');
  const app = { data: nieuweData(), bewaard: 0, bewaar() { app.bewaard++; }, herteken: () => toonItems(el, app) };
  toonItems(el, app);
  return { el, app };
}

// De regel (uitklapbaar) van een item, gezocht op naam.
const rij = (el, naam) => [...el.querySelectorAll('.itemrij')].find((r) => r.querySelector('.itemnaam').textContent === naam);

describe('scherm Items', () => {
  it('toont een regel voor elk item', () => {
    const { el, app } = maakApp();
    expect(el.querySelectorAll('.itemrij').length).toBe(app.data.items.length);
  });

  it('de regel toont de korte waarde; uitgeklapt staat het volledige bereik', () => {
    const { el } = maakApp();
    expect(rij(el, 'Gemiddelde Nederlander (vleesmix)').querySelector('summary').textContent).toMatch(/9,16 kg CO2e/);
    expect(rij(el, 'Trein').querySelector('summary').textContent).toMatch(/0,03 kg CO2e/);
  });

  it('wisselen van scope past de waarde aan, slaat op en houdt de regel open', () => {
    const { el, app } = maakApp();
    const r = rij(el, 'Rundvlees');
    r.open = true;
    r.dispatchEvent(new Event('toggle'));
    const select = el.querySelector('select[data-scope-item="rundvlees"]');
    select.value = ''; // alle scopes samen
    select.dispatchEvent(new Event('change'));
    expect(app.bewaard).toBe(1);
    const nieuw = rij(el, 'Rundvlees');
    expect(nieuw.open).toBe(true);
    expect(nieuw.querySelector('summary').textContent).toMatch(/19,8–99,5 kg CO2e/);
    expect(nieuw.textContent).toMatch(/19,8 tot 99,5 kg CO2e/);
    expect(nieuw.querySelector('.melding.waarschuwing')).not.toBeNull();
  });

  it('categoriefilter toont alleen die categorie', () => {
    const { el } = maakApp();
    el.querySelector('[data-categorie="kleding"]').click();
    expect(el.querySelectorAll('.categorie').length).toBe(1);
    expect(el.querySelector('.categorie h3').textContent).toMatch(/Kleding/);
    el.querySelector('[data-categorie="alle"]').click(); // filter terugzetten voor andere tests
  });
});
