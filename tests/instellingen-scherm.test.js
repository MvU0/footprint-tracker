// @vitest-environment happy-dom
// Rooktest voor het scherm Instellingen.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { toonInstellingen } from '../src/views/instellingen.js';
import { nieuweData } from '../src/lib/opslag.js';

function maakApp() {
  const el = document.createElement('div');
  const app = { data: nieuweData(), bewaard: 0, bewaar() { app.bewaard++; }, herteken: () => toonInstellingen(el, app) };
  toonInstellingen(el, app);
  return { el, app };
}

afterEach(() => vi.unstubAllGlobals());

describe('scherm Instellingen', () => {
  it('standaardreferentie per categorie wijzigen', () => {
    const { el, app } = maakApp();
    const select = el.querySelector('[name="ref-vlees"]');
    expect(select.value).toBe('vlees-mix');
    select.value = 'rundvlees';
    select.dispatchEvent(new Event('change'));
    expect(app.data.instellingen.standaardReferentie.vlees).toBe('rundvlees');
    expect(app.bewaard).toBe(1);
  });

  it('terug naar startdata (na bevestiging): logboek blijft', () => {
    const { el, app } = maakApp();
    app.data.items.find((i) => i.id === 'kip').naam = 'Gewijzigd';
    app.data.logboek.push({ id: 'a', datum: '2026-11-10', item: 'kip', hoeveelheid: 1, basis: 'gemiddeld', referentie: null, notitie: '' });
    vi.stubGlobal('confirm', vi.fn(() => true));
    el.querySelector('[data-actie="startdata"]').click();
    expect(app.data.items.find((i) => i.id === 'kip').naam).toBe('Kip');
    expect(app.data.logboek).toHaveLength(1);
    expect(app.bewaard).toBe(1);
  });

  it('terug naar startdata annuleren: niets verandert', () => {
    const { el, app } = maakApp();
    app.data.items.find((i) => i.id === 'kip').naam = 'Gewijzigd';
    vi.stubGlobal('confirm', vi.fn(() => false));
    el.querySelector('[data-actie="startdata"]').click();
    expect(app.data.items.find((i) => i.id === 'kip').naam).toBe('Gewijzigd');
    expect(app.bewaard).toBe(0);
  });
});

// ---------- Back-up en GitHub ----------
import { nepGitHub } from './nepGitHub.js';
import { maakExport } from '../src/lib/exportImport.js';
import { laadGitHub } from '../src/lib/github.js';

const wacht = () => new Promise((r) => setTimeout(r, 0)); // even wachten op async werk (bestand lezen, GitHub)
const regel = (id) => ({ id, datum: '2026-11-10', item: 'kip', hoeveelheid: 0.15, basis: 'gemiddeld', referentie: null, notitie: '' });

function vangDownloads() {
  const downloads = [];
  vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: () => 'blob:x', revokeObjectURL() {} }));
  const origineel = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
  return { downloads, herstel: () => { HTMLAnchorElement.prototype.click = origineel; } };
}

describe('Instellingen: back-up', () => {
  it('exporteren downloadt een bestand en onthoudt de datum van de back-up', () => {
    const { el, app } = maakApp();
    const d = vangDownloads();
    el.querySelector('[data-actie="exporteer"]').click();
    d.herstel();
    expect(d.downloads[0]).toMatch(/^emissieapp-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(app.data.laatsteBackup).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(app.bewaard).toBe(1);
  });

  it('importeren: samenvatting, dan vervangen (met eerst automatisch een export)', async () => {
    const { el, app } = maakApp();
    const bron = nieuweData();
    bron.logboek = [regel('x'), regel('y')];
    const input = el.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', { value: [new File([maakExport(bron, '2026-11-11').tekst], 'backup.json')] });
    input.dispatchEvent(new Event('change'));
    await wacht();
    expect(el.textContent).toMatch(/2 logregels/);
    const d = vangDownloads();
    el.querySelector('[data-actie="import-vervang"]').click();
    d.herstel();
    expect(d.downloads).toHaveLength(1); // automatische export vóór het importeren
    expect(app.data.logboek.map((r) => r.id)).toEqual(['x', 'y']);
  });

  it('kapot bestand: melding, niets veranderd', async () => {
    const { el, app } = maakApp();
    const input = el.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', { value: [new File(['{kapot'], 'x.json')] });
    input.dispatchEvent(new Event('change'));
    await wacht();
    expect(el.textContent).toMatch(/geen geldig JSON/);
    expect(app.bewaard).toBe(0);
  });
});

describe('Instellingen: GitHub', () => {
  const vul = (el, naam, waarde) => { el.querySelector(`[name="${naam}"]`).value = waarde; };

  it('gegevens opslaan (apart van de app-data), logboek opslaan en herstellen', async () => {
    const gh = nepGitHub();
    vi.stubGlobal('fetch', gh.fetchFn);
    const { el, app } = maakApp();
    vul(el, 'gh-eigenaar', 'ik');
    vul(el, 'gh-token', 'goed');
    el.querySelector('form[data-form="github"]').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(laadGitHub().token).toBe('goed');
    expect(JSON.stringify(app.data)).not.toMatch(/goed/); // token zit niet in de app-data

    app.data.logboek = [regel('a')];
    el.querySelector('[data-actie="gh-logboek"]').click();
    await wacht(); await wacht();
    expect(el.textContent).toMatch(/Logboek opgeslagen/);
    expect(gh.bestanden.has('footprint-data/logboek.json')).toBe(true);

    app.data.logboek = [];
    el.querySelector('[data-actie="gh-herstel"]').click();
    await wacht(); await wacht();
    expect(app.data.logboek.map((r) => r.id)).toEqual(['a']);
  });

  it('items naar de openbare repository pas na bevestiging', async () => {
    const gh = nepGitHub();
    vi.stubGlobal('fetch', gh.fetchFn);
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { el } = maakApp();
    vul(el, 'gh-eigenaar', 'ik');
    vul(el, 'gh-token', 'goed');
    el.querySelector('form[data-form="github"]').dispatchEvent(new Event('submit', { cancelable: true }));
    el.querySelector('[data-actie="gh-items"]').click();
    await wacht();
    expect(gh.aanroepen).toHaveLength(0);
  });

  it('fout token: melding in gewone taal', async () => {
    vi.stubGlobal('fetch', nepGitHub().fetchFn);
    const { el, app } = maakApp();
    vul(el, 'gh-eigenaar', 'ik');
    vul(el, 'gh-token', 'fout');
    el.querySelector('form[data-form="github"]').dispatchEvent(new Event('submit', { cancelable: true }));
    app.data.logboek = [regel('a')];
    el.querySelector('[data-actie="gh-logboek"]').click();
    await wacht(); await wacht();
    expect(el.textContent).toMatch(/weigert het token/);
  });
});
