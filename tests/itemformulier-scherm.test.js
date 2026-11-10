// @vitest-environment happy-dom
// Rooktest voor het beheren van items: toevoegen, foute invoer, mix aanpassen,
// verwijderen met bevestiging en een categorie toevoegen.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { toonItems } from '../src/views/items.js';
import { nieuweData } from '../src/lib/opslag.js';

function maakApp() {
  const el = document.createElement('div');
  const app = { data: nieuweData(), bewaard: 0, bewaar() { app.bewaard++; }, herteken: () => toonItems(el, app) };
  toonItems(el, app);
  return { el, app };
}
const vul = (el, naam, waarde) => { el.querySelector(`[name="${naam}"]`).value = waarde; };
const verstuur = (form) => form.dispatchEvent(new Event('submit', { cancelable: true }));
const item = (app, id) => app.data.items.find((i) => i.id === id);

// Een formulier dat openblijft na een test, zou de volgende test verstoren.
let open = null;
afterEach(() => {
  open?.querySelector('[data-actie="annuleren"]')?.click();
  vi.unstubAllGlobals();
});

describe('items beheren', () => {
  it('nieuw item toevoegen (komma als decimaalteken)', () => {
    const { el, app } = maakApp();
    open = el;
    el.querySelector('[data-actie="nieuw-item"]').click();
    vul(el, 'naam', 'Step');
    vul(el, 'b0-co2e', '0,01');
    vul(el, 'b0-bron', 'Testbron');
    vul(el, 'b0-scope', 'test');
    vul(el, 'b0-status', 'aanname');
    verstuur(el.querySelector('form[data-form="item"]'));

    expect(app.bewaard).toBe(1);
    expect(item(app, 'step').bronnen[0].co2e_kg).toBe(0.01);
    expect(el.querySelector('form[data-form="item"]')).toBeNull(); // terug naar de lijst
  });

  it('foute invoer: melding in gewone taal en niets opgeslagen', () => {
    const { el, app } = maakApp();
    open = el;
    el.querySelector('[data-bewerk="kip"]').click();
    vul(el, 'b0-co2e', 'abc');
    verstuur(el.querySelector('form[data-form="item"]'));

    expect(el.textContent).toMatch(/Kip.*CO2e moet een getal ≥ 0 zijn/);
    expect(app.bewaard).toBe(0);
    expect(item(app, 'kip').bronnen[0].co2e_kg).toBe(3.94);
  });

  it('bron toevoegen houdt wat je al had ingevuld', () => {
    const { el } = maakApp();
    open = el;
    el.querySelector('[data-bewerk="kabeljauw"]').click();
    vul(el, 'naam', 'Kabeljauw (vers)');
    el.querySelector('[data-actie="bron-erbij"]').click();
    expect(el.querySelector('[name="naam"]').value).toBe('Kabeljauw (vers)');
    expect(el.querySelector('[name="b1-co2e"]')).not.toBeNull();
  });

  it('mix: aandeel aanpassen', () => {
    const { el, app } = maakApp();
    open = el;
    el.querySelector('[data-bewerk="vlees-mix"]').click();
    vul(el, 'mix-kip', '44');
    verstuur(el.querySelector('form[data-form="item"]'));
    expect(item(app, 'vlees-mix').mix.find((d) => d.item === 'kip').aandeel).toBe(44);
  });

  it('verwijderen vraagt eerst bevestiging en noemt waar het item gebruikt wordt', () => {
    const { el, app } = maakApp();
    open = el;
    const bevestig = vi.fn(() => true);
    vi.stubGlobal('confirm', bevestig); // happy-dom heeft geen confirm(); deze nep-versie zegt "OK"
    el.querySelector('[data-bewerk="kip"]').click();
    el.querySelector('[data-actie="verwijderen"]').click();

    expect(bevestig.mock.calls[0][0]).toMatch(/vleesmix/);
    expect(item(app, 'kip')).toBeUndefined();
    expect(app.bewaard).toBe(1);
  });

  it('verwijderen annuleren laat alles staan', () => {
    const { el, app } = maakApp();
    open = el;
    vi.stubGlobal('confirm', vi.fn(() => false));
    el.querySelector('[data-bewerk="kip"]').click();
    el.querySelector('[data-actie="verwijderen"]').click();
    expect(item(app, 'kip')).toBeDefined();
    expect(app.bewaard).toBe(0);
  });

  it('nieuwe categorie toevoegen', () => {
    const { el, app } = maakApp();
    vul(el, 'cat-naam', 'Energie thuis');
    vul(el, 'cat-eenheid', 'stuk');
    verstuur(el.querySelector('form[data-form="categorie"]'));
    expect(app.data.categorieen.at(-1).naam).toBe('Energie thuis');
    expect(el.textContent).toMatch(/Energie thuis/);
  });
});
