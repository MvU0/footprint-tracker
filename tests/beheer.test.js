import { describe, it, expect } from 'vitest';
import { leesGetal, maakId, slaItemOp, waarGebruikt, verwijderItem, voegCategorieToe } from '../src/lib/beheer.js';

describe('voegCategorieToe', () => {
  it('voegt een categorie toe met een id uit de naam', () => {
    const { data, fouten } = voegCategorieToe(nieuweData(), 'Energie thuis', 'stuk');
    expect(fouten).toEqual([]);
    expect(data.categorieen.at(-1)).toEqual({ id: 'energie-thuis', naam: 'Energie thuis', standaardEenheid: 'stuk' });
  });
  it('weigert een lege naam, een bestaande naam en een onbekende eenheid', () => {
    expect(voegCategorieToe(nieuweData(), '  ', 'kg').fouten.join()).toMatch(/naam/i);
    expect(voegCategorieToe(nieuweData(), 'vervoer', 'km').fouten.join()).toMatch(/bestaat al/);
    expect(voegCategorieToe(nieuweData(), 'Energie', 'kWh').fouten.join()).toMatch(/eenheid/);
  });
});
import { nieuweData } from '../src/lib/opslag.js';

// Een eenvoudig nieuw item met één bron.
const havermelk = () => ({
  id: 'havermelk', naam: 'Havermelk', categorie: 'vlees', eenheid: 'kg', uitleg: '', alternatieven: [],
  bronnen: [{ co2e_kg: 0.5, water_l: null, bron: 'Testbron', link: null, jaar: 2024, scope: 'test', notitie: '', actief: true, status: 'aanname' }],
});

describe('waarGebruikt', () => {
  it('kip: in de vleesmix en als alternatief, niet in het logboek', () => {
    const g = waarGebruikt(nieuweData(), 'kip');
    expect(g.logboek).toBe(0);
    expect(g.verwijzingen).toContain('onderdeel van mix "Gemiddelde Nederlander (vleesmix)"');
    expect(g.verwijzingen).toContain('alternatief bij "Rundvlees"');
  });
  it('telt logregels waarin het item als keuze of als referentie staat', () => {
    const data = nieuweData();
    data.logboek = [
      { id: 'a', datum: '2026-11-10', item: 'kip', hoeveelheid: 1, basis: 'gemiddeld', referentie: null },
      { id: 'b', datum: '2026-11-10', item: 'tofu', hoeveelheid: 1, basis: 'gemiddeld', referentie: 'kip' },
      { id: 'c', datum: '2026-11-10', item: 'tofu', hoeveelheid: 1, basis: 'gemiddeld', referentie: null },
    ];
    expect(waarGebruikt(data, 'kip').logboek).toBe(2);
  });
  it('standaardreferentie bij een item en in de instellingen', () => {
    expect(waarGebruikt(nieuweData(), 'tshirt-nieuw').verwijzingen).toContain('standaardreferentie bij "T-shirt (katoen), tweedehands"');
    expect(waarGebruikt(nieuweData(), 'vlees-mix').verwijzingen).toContain('standaardreferentie voor categorie "Vlees eten"');
  });
  it('ongebruikt item: niets', () => {
    expect(waarGebruikt(nieuweData(), 'vegetarisch-gehakt').verwijzingen.filter((t) => !t.startsWith('alternatief'))).toEqual([]);
  });
});

describe('verwijderItem', () => {
  it('verwijdert kip en haalt kip uit de vleesmix en de alternatieven', () => {
    const { data, fouten } = verwijderItem(nieuweData(), 'kip');
    expect(fouten).toEqual([]);
    expect(data.items.some((i) => i.id === 'kip')).toBe(false);
    expect(data.items.find((i) => i.id === 'vlees-mix').mix.map((d) => d.item)).toEqual(['rundvlees', 'varkensvlees']);
    expect(data.items.find((i) => i.id === 'rundvlees').alternatieven).not.toContain('kip');
  });
  it('referenties naar het item worden leeg', () => {
    const { data } = verwijderItem(nieuweData(), 'vlees-mix');
    expect(data.instellingen.standaardReferentie.vlees).toBeNull();
    const { data: d2 } = verwijderItem(nieuweData(), 'tshirt-nieuw');
    expect(d2.items.find((i) => i.id === 'tshirt-tweedehands').standaardReferentie).toBeUndefined();
  });
  it('kan niet als het item in het logboek staat', () => {
    const data = nieuweData();
    data.logboek = [{ id: 'a', datum: '2026-11-10', item: 'tofu', hoeveelheid: 1, basis: 'gemiddeld', referentie: 'kip' }];
    const { data: nieuw, fouten } = verwijderItem(data, 'kip');
    expect(nieuw).toBeNull();
    expect(fouten.join()).toMatch(/1 logregel/);
  });
});

describe('slaItemOp', () => {
  it('voegt een nieuw item toe, zonder de oude data te veranderen', () => {
    const data = nieuweData();
    const aantal = data.items.length;
    const { data: nieuw, fouten } = slaItemOp(data, havermelk());
    expect(fouten).toEqual([]);
    expect(nieuw.items.length).toBe(aantal + 1);
    expect(data.items.length).toBe(aantal);
  });
  it('vervangt een bestaand item met hetzelfde id', () => {
    const data = nieuweData();
    const kip = { ...data.items.find((i) => i.id === 'kip'), naam: 'Kipfilet' };
    const { data: nieuw } = slaItemOp(data, kip);
    expect(nieuw.items.length).toBe(data.items.length);
    expect(nieuw.items.find((i) => i.id === 'kip').naam).toBe('Kipfilet');
  });
  it('bij een fout: geen nieuwe data, wel een melding in gewone taal met de itemnaam', () => {
    const item = havermelk();
    item.bronnen[0].co2e_kg = leesGetal('abc');
    const { data, fouten } = slaItemOp(nieuweData(), item);
    expect(data).toBeNull();
    expect(fouten.join()).toMatch(/Havermelk.*CO2e moet een getal ≥ 0 zijn/);
  });
});

describe('maakId (uit een naam)', () => {
  it('kleine letters, streepjes, zonder accenten', () => {
    expect(maakId('Havermelk', [])).toBe('havermelk');
    expect(maakId('Crème brûlée (nieuw)', [])).toBe('creme-brulee-nieuw');
  });
  it('voegt een nummer toe als het id al bestaat', () => {
    expect(maakId('Kip', ['kip'])).toBe('kip-2');
    expect(maakId('Kip', ['kip', 'kip-2'])).toBe('kip-3');
  });
  it('lege of rare naam geeft toch een id', () => {
    expect(maakId('???', [])).toBe('item');
  });
});

describe('leesGetal (tekst uit een formulierveld)', () => {
  it('leest komma en punt als decimaalteken', () => {
    expect(leesGetal('19,8')).toBe(19.8);
    expect(leesGetal('0.196')).toBe(0.196);
    expect(leesGetal(' 5 ')).toBe(5);
  });
  it('met een komma zijn punten duizendtallen', () => {
    expect(leesGetal('1.451,2')).toBe(1451.2);
  });
  it('leeg veld wordt null (= geen waarde)', () => {
    expect(leesGetal('')).toBeNull();
    expect(leesGetal('   ')).toBeNull();
  });
  it('geen getal wordt NaN, zodat de validatie een fout geeft', () => {
    expect(leesGetal('abc')).toBeNaN();
    expect(leesGetal('5 kg')).toBeNaN();
  });
});
