import { describe, it, expect } from 'vitest';
import { laadData, bewaarData, terugNaarStartdata, OPSLAG_SLEUTEL } from '../src/lib/opslag.js';

// Een nep-localStorage: een simpel woordenboek (zoals een dict in Python).
function nepOpslag() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('opslag', () => {
  it('geeft de startdata bij een lege opslag', () => {
    const data = laadData(nepOpslag());
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.logboek).toEqual([]);
  });

  it('bewaart en laadt dezelfde data terug', () => {
    const opslag = nepOpslag();
    const data = laadData(opslag);
    data.logboek.push({ id: '1', datum: '2026-11-10', item: 'trein', hoeveelheid: 40 });
    expect(bewaarData(data, opslag)).toBe(true);
    expect(laadData(opslag).logboek).toHaveLength(1);
  });

  it('wijzigingen raken de startdata zelf niet', () => {
    const a = laadData(nepOpslag());
    a.items[0].naam = 'Gewijzigd';
    const b = laadData(nepOpslag());
    expect(b.items[0].naam).not.toBe('Gewijzigd');
  });

  it('valt terug op startdata bij kapotte opgeslagen tekst', () => {
    const opslag = nepOpslag();
    opslag.setItem(OPSLAG_SLEUTEL, '{kapot');
    expect(laadData(opslag).items.length).toBeGreaterThan(0);
  });

  it('"terug naar startdata" behoudt het logboek', () => {
    const data = laadData(nepOpslag());
    data.items = [];
    data.logboek.push({ id: '1' });
    const terug = terugNaarStartdata(data);
    expect(terug.items.length).toBeGreaterThan(0);
    expect(terug.logboek).toHaveLength(1);
  });

  it('"terug naar startdata": startitems terug, eigen items, categorieën en instellingen blijven', () => {
    const data = laadData(nepOpslag());
    const start = laadData(nepOpslag());
    data.items.find((i) => i.id === 'kip').naam = 'Gewijzigd';
    data.items = data.items.filter((i) => i.id !== 'tofu'); // verwijderd startitem
    data.categorieen.push({ id: 'energie', naam: 'Energie thuis', standaardEenheid: 'stuk' });
    data.items.push({ id: 'eigen', naam: 'Eigen item', categorie: 'energie', eenheid: 'stuk', alternatieven: [], bronnen: [] });
    data.instellingen.standaardReferentie.vlees = 'rundvlees';

    const terug = terugNaarStartdata(data);
    expect(terug.items.find((i) => i.id === 'kip').naam).toBe('Kip');
    expect(terug.items.some((i) => i.id === 'tofu')).toBe(true);
    expect(terug.items.some((i) => i.id === 'eigen')).toBe(true);
    expect(terug.items.length).toBe(start.items.length + 1);
    expect(terug.categorieen.some((c) => c.id === 'energie')).toBe(true);
    expect(terug.instellingen.standaardReferentie.vlees).toBe('rundvlees');
  });
});
