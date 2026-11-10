// Controleert of het startbestand met items en bronnen klopt.
// Faalt deze test na een aanpassing in startdata.json, dan staat in de
// foutmelding precies welk item of welke bron niet in orde is.

import { describe, it, expect } from 'vitest';
import startdata from '../src/data/startdata.json';
import { valideerCatalogus } from '../src/lib/validatie.js';

describe('startdata.json', () => {
  it('bevat geen fouten', () => {
    expect(valideerCatalogus(startdata)).toEqual([]);
  });

  it('heeft items in alle vier de categorieën', () => {
    for (const cat of ['vervoer', 'vlees', 'kleding', 'aankopen']) {
      expect(startdata.items.some((i) => i.categorie === cat)).toBe(true);
    }
  });

  it('heeft bij elke bron met een waarde ook een bronnaam en scope', () => {
    for (const item of startdata.items) {
      for (const b of item.bronnen ?? []) {
        expect(b.bron, item.id).toBeTruthy();
        expect(b.scope, item.id).toBeTruthy();
      }
    }
  });
});

describe('valideerCatalogus vindt fouten', () => {
  const basis = () => ({
    categorieen: [{ id: 'vlees', naam: 'Vlees', standaardEenheid: 'kg' }],
    items: [
      {
        id: 'kip', naam: 'Kip', categorie: 'vlees', eenheid: 'kg',
        bronnen: [{ co2e_kg: 4, water_l: null, bron: 'X', scope: 'Y', actief: true, status: 'gecontroleerd' }],
      },
    ],
    instellingen: { standaardReferentie: { vlees: 'kip' } },
  });

  it('accepteert een correcte catalogus', () => {
    expect(valideerCatalogus(basis())).toEqual([]);
  });

  it('meldt een negatieve CO2e-waarde', () => {
    const d = basis();
    d.items[0].bronnen[0].co2e_kg = -1;
    expect(valideerCatalogus(d).join()).toMatch(/co2e_kg/);
  });

  it('meldt een onbekende categorie', () => {
    const d = basis();
    d.items[0].categorie = 'snoep';
    expect(valideerCatalogus(d).join()).toMatch(/onbekende categorie/);
  });

  it('meldt een mix die naar een niet-bestaand item verwijst', () => {
    const d = basis();
    d.items.push({ id: 'mix', naam: 'Mix', categorie: 'vlees', eenheid: 'kg', type: 'mix', mix: [{ item: 'rund', aandeel: 1 }] });
    expect(valideerCatalogus(d).join()).toMatch(/"rund" bestaat niet/);
  });

  it('meldt een mix met onderdelen in een andere eenheid', () => {
    const d = basis();
    d.categorieen.push({ id: 'vervoer', naam: 'Vervoer', standaardEenheid: 'km' });
    d.items.push({ id: 'trein', naam: 'Trein', categorie: 'vervoer', eenheid: 'km', bronnen: [] });
    d.items.push({ id: 'mix', naam: 'Mix', categorie: 'vlees', eenheid: 'kg', type: 'mix', mix: [{ item: 'trein', aandeel: 1 }] });
    expect(valideerCatalogus(d).join()).toMatch(/andere eenheid|heeft eenheid "km"/);
  });

  it('meldt een bron zonder waarde die niet als "nog te onderzoeken" gemarkeerd is', () => {
    const d = basis();
    d.items[0].bronnen[0].co2e_kg = null;
    expect(valideerCatalogus(d).join()).toMatch(/nog te onderzoeken/);
  });
});
