import { describe, it, expect } from 'vitest';
import { maakExport, leesImport, voegSamen, dagenSindsBackup } from '../src/lib/exportImport.js';
import { nieuweData } from '../src/lib/opslag.js';

const regel = (id, extra = {}) => ({ id, datum: '2026-11-10', item: 'kip', hoeveelheid: 0.15, basis: 'gemiddeld', referentie: null, notitie: '', ...extra });

describe('maakExport', () => {
  it('één JSON-bestand met alles, en een bestandsnaam met de datum', () => {
    const data = nieuweData();
    data.logboek = [regel('a')];
    const { bestandsnaam, tekst } = maakExport(data, '2026-11-11');
    expect(bestandsnaam).toBe('emissieapp-backup-2026-11-11.json');
    const inhoud = JSON.parse(tekst);
    expect(inhoud.schemaVersie).toBe(1);
    expect(inhoud.items.length).toBe(data.items.length);
    expect(inhoud.logboek).toHaveLength(1);
    expect(inhoud.categorieen.length).toBe(4);
    expect(inhoud.instellingen.standaardReferentie.vlees).toBe('vlees-mix');
  });
});

describe('leesImport', () => {
  it('een export kan terug worden ingelezen, met een samenvatting', () => {
    const data = nieuweData();
    data.logboek = [regel('a'), regel('b')];
    const { data: terug, fouten, samenvatting } = leesImport(maakExport(data, '2026-11-11').tekst);
    expect(fouten).toEqual([]);
    expect(samenvatting).toEqual({ categorieen: 4, items: data.items.length, logregels: 2 });
    expect(terug.logboek).toEqual(data.logboek);
  });

  it('weigert kapotte of onvolledige bestanden met een melding in gewone taal', () => {
    expect(leesImport('{kapot').fouten.join()).toMatch(/geen geldig JSON/i);
    expect(leesImport('{"hallo": 1}').fouten.join()).toMatch(/geen back-up/i);
    const fout = nieuweData();
    fout.items[0].bronnen[0].co2e_kg = -1;
    expect(leesImport(JSON.stringify(fout)).fouten.join()).toMatch(/CO2e moet een getal/);
    const slechteRegel = { ...nieuweData(), logboek: [regel('a', { hoeveelheid: -1 })] };
    expect(leesImport(JSON.stringify(slechteRegel)).fouten.join()).toMatch(/logregel 1.*hoeveelheid/i);
    expect(leesImport(JSON.stringify(slechteRegel)).data).toBeNull();
  });

  it('weigert een onbekende schemaversie', () => {
    const toekomst = { ...nieuweData(), schemaVersie: 99 };
    expect(leesImport(JSON.stringify(toekomst)).fouten.join()).toMatch(/versie/i);
  });
});

describe('voegSamen (bestand wint bij hetzelfde id)', () => {
  it('nieuwe items en logregels komen erbij; bij hetzelfde id wint het bestand; de rest blijft', () => {
    const huidig = nieuweData();
    huidig.logboek = [regel('a'), regel('b', { hoeveelheid: 1 })];
    const bestand = nieuweData();
    bestand.items.find((i) => i.id === 'kip').naam = 'Kip (uit bestand)';
    bestand.items.push({ id: 'eigen', naam: 'Eigen', categorie: 'vlees', eenheid: 'kg', alternatieven: [], bronnen: [] });
    bestand.logboek = [regel('b', { hoeveelheid: 2 }), regel('c')];

    const { data, fouten } = voegSamen(huidig, bestand);
    expect(fouten).toEqual([]);
    expect(data.items.find((i) => i.id === 'kip').naam).toBe('Kip (uit bestand)');
    expect(data.items.some((i) => i.id === 'eigen')).toBe(true);
    expect(data.logboek.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(data.logboek.find((r) => r.id === 'b').hoeveelheid).toBe(2);
  });
});

describe('dagenSindsBackup', () => {
  it('telt de dagen; nog nooit een back-up = null', () => {
    expect(dagenSindsBackup({ laatsteBackup: '2026-10-11' }, '2026-11-11')).toBe(31);
    expect(dagenSindsBackup({}, '2026-11-11')).toBeNull();
  });
});
