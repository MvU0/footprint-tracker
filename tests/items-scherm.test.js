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

describe('scherm Items', () => {
  it('toont een kaart voor elk item', () => {
    const { el, app } = maakApp();
    expect(el.querySelectorAll('.kaart').length).toBe(app.data.items.length);
  });

  it('toont de vleesmix met gewogen waarde', () => {
    const { el } = maakApp();
    const kaart = [...el.querySelectorAll('.kaart')].find((k) => k.textContent.includes('vleesmix'));
    expect(kaart.textContent).toMatch(/9,16 kg CO2e/);
  });

  it('wisselen van scope past de waarde aan en slaat op', () => {
    const { el, app } = maakApp();
    const select = el.querySelector('select[data-scope-item="rundvlees"]');
    select.value = ''; // alle scopes samen
    select.dispatchEvent(new Event('change'));
    expect(app.bewaard).toBe(1);
    const kaart = [...el.querySelectorAll('.kaart')].find((k) => k.querySelector('h4').textContent === 'Rundvlees');
    expect(kaart.textContent).toMatch(/19,8 tot 99,5 kg CO2e/);
    expect(kaart.querySelector('.melding.waarschuwing')).not.toBeNull();
  });

  it('categoriefilter toont alleen die categorie', () => {
    const { el } = maakApp();
    el.querySelector('[data-categorie="kleding"]').click();
    expect(el.querySelectorAll('.categorie').length).toBe(1);
    expect(el.querySelector('.categorie h3').textContent).toMatch(/Kleding/);
    el.querySelector('[data-categorie="alle"]').click(); // filter terugzetten voor andere tests
  });
});
