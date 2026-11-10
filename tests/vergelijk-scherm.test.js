// @vitest-environment happy-dom
// Rooktest voor het scherm Vergelijk.

import { describe, it, expect } from 'vitest';
import { toonVergelijk } from '../src/views/vergelijk.js';
import { nieuweData } from '../src/lib/opslag.js';

function maakApp() {
  const el = document.createElement('div');
  const app = { data: nieuweData(), bewaar() {}, herteken: () => toonVergelijk(el, app) };
  toonVergelijk(el, app);
  return { el, app };
}
const zet = (el, selector, waarde, event = 'change') => {
  const veld = el.querySelector(selector);
  veld.value = waarde;
  veld.dispatchEvent(new Event(event));
};
// De tabelregel van een item, als tekst.
const regel = (el, naam) => [...el.querySelectorAll('tbody tr')].find((tr) => tr.cells[0].textContent.startsWith(naam))?.textContent;

describe('scherm Vergelijk', () => {
  it('startitem kiezen zet de alternatieven aan', () => {
    const { el } = maakApp();
    zet(el, '[name="start"]', 'auto-gemiddeld');
    const aan = [...el.querySelectorAll('[name="item"]:checked')].map((x) => x.value);
    expect(aan).toEqual(expect.arrayContaining(['auto-gemiddeld', 'trein', 'bus', 'fiets']));
    expect(el.querySelectorAll('.grafiek .staaf').length).toBe(aan.length);
  });

  it('40 km: trein 1,2 kg, 6,4 kg minder dan de auto', () => {
    const { el } = maakApp();
    zet(el, '[name="start"]', 'auto-gemiddeld');
    zet(el, '[name="hoeveelheid"]', '40', 'input');
    expect(regel(el, 'Trein')).toMatch(/1,2 kg CO2e/);
    expect(regel(el, 'Trein')).toMatch(/6,4 kg CO2e minder/);
    expect(regel(el, 'Auto (gemiddeld')).toMatch(/referentie/);
  });

  it('zelf kiezen waarmee je vergelijkt', () => {
    const { el } = maakApp();
    zet(el, '[name="start"]', 'auto-gemiddeld');
    zet(el, '[name="hoeveelheid"]', '40', 'input');
    zet(el, '[name="referentie"]', 'trein');
    expect(regel(el, 'Auto (gemiddeld')).toMatch(/6,4 kg CO2e meer/);
  });

  it('komma in de hoeveelheid, en water bij vlees', () => {
    const { el } = maakApp();
    zet(el, '[name="start"]', 'rundvlees');
    zet(el, '[name="hoeveelheid"]', '2,0', 'input');
    expect(regel(el, 'Kip')).toMatch(/7,88 kg CO2e/); // 3,94 × 2
    expect(regel(el, 'Kip')).toMatch(/94,6 L water/); // 47,3 × 2
    expect(el.querySelectorAll('.grafiek').length).toBe(2); // CO2e én water
  });

  it('item uitvinken haalt het uit tabel en grafiek', () => {
    const { el } = maakApp();
    zet(el, '[name="start"]', 'auto-gemiddeld');
    const bus = el.querySelector('[name="item"][value="bus"]');
    bus.checked = false;
    bus.dispatchEvent(new Event('change'));
    expect(regel(el, 'Bus')).toBeUndefined();
  });

  it('foute hoeveelheid: melding, geen tabel', () => {
    const { el } = maakApp();
    zet(el, '[name="hoeveelheid"]', 'abc', 'input');
    expect(el.textContent).toMatch(/Vul een hoeveelheid in/);
    expect(el.querySelector('table')).toBeNull();
  });
});
