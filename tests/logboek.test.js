import { describe, it, expect } from 'vitest';
import { slaLogregelOp, verwijderLogregel } from '../src/lib/logboek.js';
import { nieuweData } from '../src/lib/opslag.js';

const regel = (extra = {}) => ({ datum: '2026-11-10', item: 'kip', hoeveelheid: 0.15, basis: 'gemiddeld', referentie: null, notitie: '', ...extra });

describe('slaLogregelOp', () => {
  it('nieuwe regel krijgt een id en komt in het logboek; oude data blijft gelijk', () => {
    const data = nieuweData();
    const { data: nieuw, fouten } = slaLogregelOp(data, regel());
    expect(fouten).toEqual([]);
    expect(nieuw.logboek.length).toBe(1);
    expect(nieuw.logboek[0].id).toBeTruthy();
    expect(data.logboek.length).toBe(0);
  });

  it('bestaande regel (zelfde id) wordt vervangen', () => {
    const { data } = slaLogregelOp(nieuweData(), regel({ id: 'r1' }));
    const { data: nieuw } = slaLogregelOp(data, regel({ id: 'r1', hoeveelheid: 0.3 }));
    expect(nieuw.logboek.length).toBe(1);
    expect(nieuw.logboek[0].hoeveelheid).toBe(0.3);
  });

  it('meldingen in gewone taal bij foute invoer', () => {
    const fout = (extra) => slaLogregelOp(nieuweData(), regel(extra)).fouten.join(' ');
    expect(fout({ hoeveelheid: NaN })).toMatch(/hoeveelheid/i);
    expect(fout({ hoeveelheid: null })).toMatch(/hoeveelheid/i);
    expect(fout({ hoeveelheid: -1 })).toMatch(/hoeveelheid/i);
    expect(fout({ datum: '2026-13-40' })).toMatch(/datum/i);
    expect(fout({ item: 'bestaat-niet' })).toMatch(/item/i);
    expect(fout({ referentie: 'trein' })).toMatch(/eenheid/i); // kip (kg) met trein (km)
    expect(fout({ basis: 'raar' })).toMatch(/basis/i);
  });

  it('bij een fout: geen nieuwe data', () => {
    expect(slaLogregelOp(nieuweData(), regel({ hoeveelheid: -1 })).data).toBeNull();
  });
});

describe('verwijderLogregel', () => {
  it('haalt alleen die regel weg', () => {
    let { data } = slaLogregelOp(nieuweData(), regel({ id: 'a' }));
    ({ data } = slaLogregelOp(data, regel({ id: 'b' })));
    expect(verwijderLogregel(data, 'a').logboek.map((r) => r.id)).toEqual(['b']);
  });
});
