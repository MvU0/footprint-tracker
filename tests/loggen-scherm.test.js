// @vitest-environment happy-dom
// Rooktest voor het scherm Loggen.

import { describe, it, expect } from 'vitest';
import { toonLoggen } from '../src/views/loggen.js';
import { nieuweData } from '../src/lib/opslag.js';

function maakApp(data = nieuweData()) {
  const el = document.createElement('div');
  const app = { data, bewaard: 0, bewaar() { app.bewaard++; }, herteken: () => toonLoggen(el, app) };
  toonLoggen(el, app);
  return { el, app };
}
const zet = (el, naam, waarde, event = 'change') => {
  const veld = el.querySelector(`[name="${naam}"]`);
  veld.value = waarde;
  veld.dispatchEvent(new Event(event));
};
const verstuur = (el) => el.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));

describe('scherm Loggen', () => {
  it('datum staat standaard op vandaag', () => {
    const { el } = maakApp();
    const d = new Date();
    const vandaag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(el.querySelector('[name="datum"]').value).toBe(vandaag);
  });

  // Kip 3,94 × 0,15 = 0,591 kg. Vleesmix ≈ 9,159 kg/kg → (9,159 − 3,943) × 0,15 ≈ 0,782 kg bespaard.
  it('toont direct de uitstoot en de besparing ten opzichte van de standaardreferentie', () => {
    const { el } = maakApp();
    zet(el, 'item', 'kip');
    zet(el, 'hoeveelheid', '0,15', 'input');
    const tekst = el.querySelector('.voorbeeld').textContent;
    expect(tekst).toMatch(/0,591 kg CO2e/);
    expect(tekst).toMatch(/0,78\d kg CO2e bespaard/);
    expect(tekst).toMatch(/vleesmix/);
  });

  it('een andere referentie kiezen', () => {
    const { el } = maakApp();
    zet(el, 'item', 'kip');
    zet(el, 'hoeveelheid', '1', 'input');
    zet(el, 'referentie', 'rundvlees');
    expect(el.querySelector('.voorbeeld').textContent).toMatch(/Rundvlees/);
    expect(el.querySelector('.voorbeeld').textContent).toMatch(/15,9 kg CO2e bespaard/); // 19,84 − 3,94
  });

  it('opslaan zet de regel in het logboek', () => {
    const { el, app } = maakApp();
    zet(el, 'item', 'trein');
    zet(el, 'hoeveelheid', '40', 'input');
    verstuur(el);
    expect(app.bewaard).toBe(1);
    expect(app.data.logboek).toHaveLength(1);
    expect(app.data.logboek[0]).toMatchObject({ item: 'trein', hoeveelheid: 40, basis: 'gemiddeld', referentie: null });
    expect(el.textContent).toMatch(/Opgeslagen/);
  });

  it('foute hoeveelheid: melding, niets opgeslagen', () => {
    const { el, app } = maakApp();
    zet(el, 'hoeveelheid', 'abc', 'input');
    verstuur(el);
    expect(el.textContent).toMatch(/Vul een hoeveelheid in/);
    expect(app.data.logboek).toHaveLength(0);
  });
});
