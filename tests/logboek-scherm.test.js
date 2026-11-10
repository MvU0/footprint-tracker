// @vitest-environment happy-dom
// Rooktest voor het scherm Logboek.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { toonLogboek } from '../src/views/logboek.js';
import { toonLoggen } from '../src/views/loggen.js';
import { nieuweData } from '../src/lib/opslag.js';

function maakApp() {
  const data = nieuweData();
  data.logboek = [
    { id: 'a', datum: '2026-11-09', item: 'kip', hoeveelheid: 0.15, basis: 'gemiddeld', referentie: null, notitie: '' },
    { id: 'b', datum: '2026-11-10', item: 'trein', hoeveelheid: 40, basis: 'gemiddeld', referentie: null, notitie: 'naar werk' },
  ];
  const el = document.createElement('div');
  const app = { data, bewaard: 0, bewaar() { app.bewaard++; }, herteken: () => toonLogboek(el, app) };
  toonLogboek(el, app);
  return { el, app };
}
const rijen = (el) => [...el.querySelectorAll('tbody tr')];

afterEach(() => vi.unstubAllGlobals());

describe('scherm Logboek', () => {
  it('toont alle regels, nieuwste eerst, met uitstoot en besparing', () => {
    const { el } = maakApp();
    expect(rijen(el)).toHaveLength(2);
    expect(rijen(el)[0].textContent).toMatch(/Trein/);
    expect(rijen(el)[0].textContent).toMatch(/1,2 kg CO2e/); // 40 × 0,030
    expect(rijen(el)[0].textContent).toMatch(/bespaard/); // t.o.v. vervoersmix
  });

  it('filteren op categorie', () => {
    const { el } = maakApp();
    el.querySelector('[data-categorie="vlees"]').click();
    expect(rijen(el)).toHaveLength(1);
    expect(rijen(el)[0].textContent).toMatch(/Kip/);
    el.querySelector('[data-categorie="alle"]').click(); // terugzetten voor andere tests
  });

  it('verwijderen na bevestiging', () => {
    const { el, app } = maakApp();
    vi.stubGlobal('confirm', vi.fn(() => true));
    el.querySelector('[data-verwijder="a"]').click();
    expect(app.data.logboek.map((r) => r.id)).toEqual(['b']);
    expect(app.bewaard).toBe(1);
  });

  it('bewerken opent Loggen met de regel ingevuld', () => {
    const { el, app } = maakApp();
    el.querySelector('[data-bewerk="b"]').click();
    expect(location.hash).toBe('#/loggen');
    const loggen = document.createElement('div');
    toonLoggen(loggen, app);
    expect(loggen.querySelector('[name="hoeveelheid"]').value).toBe('40');
    expect(loggen.querySelector('[name="notitie"]').value).toBe('naar werk');
    loggen.querySelector('[data-actie="annuleren"]').click(); // bewerken stoppen voor andere tests
  });
});
