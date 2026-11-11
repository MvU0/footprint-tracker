// @vitest-environment happy-dom
// Rooktest voor het scherm Overzicht. "Vandaag" staat vast op 15 november 2026.

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { toonOverzicht } from '../src/views/overzicht.js';
import { nieuweData } from '../src/lib/opslag.js';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-15T12:00:00'));
});
afterAll(() => vi.useRealTimers());

// Testitems: "ref" 8/12 (gem 10), "keuze" 1/3 (gem 2).
function testData() {
  const data = nieuweData();
  const bron = (co2e_kg) => ({ co2e_kg, water_l: null, bron: 'Test', link: null, jaar: 2026, scope: 'test', notitie: '', actief: true, status: 'aanname' });
  data.items.push(
    { id: 'ref', naam: 'Referentie', categorie: 'vlees', eenheid: 'kg', alternatieven: [], bronnen: [bron(8), bron(12)] },
    { id: 'keuze', naam: 'Keuze', categorie: 'vlees', eenheid: 'kg', alternatieven: [], bronnen: [bron(1), bron(3)] },
  );
  const r = (id, datum, hoeveelheid, extra = {}) => ({ id, datum, item: 'keuze', hoeveelheid, basis: 'gemiddeld', referentie: 'ref', notitie: '', ...extra });
  data.logboek = [
    r('1', '2026-11-03', 0.5), // uitstoot 1, bespaard 4
    r('2', '2026-11-20', 1, { basis: 'hoog' }), // uitstoot 3, bespaard 9
    r('3', '2026-10-15', 1), // oktober: uitstoot 2, bespaard 8
  ];
  return data;
}

function maakApp(data = testData()) {
  const el = document.createElement('div');
  const app = { data, bewaar() {}, herteken: () => toonOverzicht(el, app) };
  toonOverzicht(el, app);
  el.querySelector('[data-soort="maand"]')?.click(); // begin altijd bij "deze maand"
  return { el, app };
}
const tegel = (el, naam) => el.querySelector(`.tegel[data-tegel="${naam}"]`).textContent;

describe('scherm Overzicht', () => {
  it('nog niets gelogd: uitleg en een link naar Loggen', () => {
    const data = nieuweData();
    const { el } = maakApp(data);
    expect(el.textContent).toMatch(/Nog niets gelogd/);
    expect(el.querySelector('a[href="#/loggen"]')).not.toBeNull();
  });

  it('standaard deze maand, met de totalen', () => {
    const { el } = maakApp();
    expect(el.querySelector('.periodenaam').textContent).toBe('november 2026');
    expect(tegel(el, 'uitstoot')).toMatch(/4 kg CO2e/);
    expect(tegel(el, 'besparing')).toMatch(/13 kg CO2e/);
    expect(tegel(el, 'aantal')).toMatch(/2/);
  });

  // November 4 kg vs oktober 2 kg uitgestoten: 2 kg meer (+100%). Bespaard 13 vs 8: 5 kg meer (+63%).
  it('vergelijking met de vorige maand, in woorden en met staafjes', () => {
    const { el } = maakApp();
    expect(tegel(el, 'uitstoot')).toMatch(/2 kg CO2e meer dan oktober \(\+100%\)/);
    expect(tegel(el, 'besparing')).toMatch(/5 kg CO2e meer dan oktober \(\+63%\)/);
    expect(el.querySelectorAll('.tegel[data-tegel="uitstoot"] .minibalk').length).toBe(2);
  });

  it('bladeren naar de vorige maand', () => {
    const { el } = maakApp();
    el.querySelector('[data-actie="vorige"]').click();
    expect(el.querySelector('.periodenaam').textContent).toBe('oktober 2026');
    expect(tegel(el, 'uitstoot')).toMatch(/2 kg CO2e/);
  });

  it('jaar kiezen', () => {
    const { el } = maakApp();
    el.querySelector('[data-soort="jaar"]').click();
    expect(el.querySelector('.periodenaam').textContent).toBe('2026');
    expect(tegel(el, 'uitstoot')).toMatch(/6 kg CO2e/);
  });

  it('grafiek over de laatste 12 maanden (uitgestoten en bespaard), en een tabel per categorie', () => {
    const { el } = maakApp();
    expect(el.querySelectorAll('.grafiek .kolom').length).toBe(24);
    expect(el.querySelector('.categorietabel').textContent).toMatch(/Vlees eten/);
  });
});

describe('herinnering aan een back-up', () => {
  it('nog nooit een back-up of langer dan 30 dagen geleden: melding met link naar Instellingen', () => {
    const data = testData();
    const { el } = maakApp(data);
    expect(el.querySelector('.herinnering').textContent).toMatch(/nog geen back-up/);
    expect(el.querySelector('.herinnering a[href="#/instellingen"]')).not.toBeNull();
    data.laatsteBackup = '2026-10-01'; // 45 dagen voor 15 nov.
    const { el: el2 } = maakApp(data);
    expect(el2.querySelector('.herinnering').textContent).toMatch(/45 dagen/);
  });
  it('recente back-up: geen melding', () => {
    const data = testData();
    data.laatsteBackup = '2026-11-01';
    const { el } = maakApp(data);
    expect(el.querySelector('.herinnering')).toBeNull();
  });
});
