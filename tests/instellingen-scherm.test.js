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
