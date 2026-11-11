import { describe, it, expect } from 'vitest';
import { slaItemsOp, slaLogboekOp, haalLogboekOp, laadGitHub, bewaarGitHub } from '../src/lib/github.js';
import { nieuweData } from '../src/lib/opslag.js';
import { nepGitHub } from './nepGitHub.js';

const cfg = (extra = {}) => ({ eigenaar: 'ik', token: 'goed', codeRepo: 'footprint-tracker', dataRepo: 'footprint-data', ...extra });
const metLogboek = () => {
  const data = nieuweData();
  data.logboek = [{ id: 'a', datum: '2026-11-10', item: 'kip', hoeveelheid: 0.15, basis: 'gemiddeld', referentie: null, notitie: 'pasta 🍝' }];
  return data;
};

describe('logboek naar de privé-repository', () => {
  it('opslaan en weer ophalen (ook met speciale tekens)', async () => {
    const gh = nepGitHub();
    await slaLogboekOp(cfg(), metLogboek(), gh.fetchFn);
    expect(gh.bestanden.has('footprint-data/logboek.json')).toBe(true);
    const terug = await haalLogboekOp(cfg(), gh.fetchFn);
    expect(terug).toEqual(metLogboek().logboek);
  });

  it('een tweede keer opslaan overschrijft (met de juiste versie)', async () => {
    const gh = nepGitHub();
    await slaLogboekOp(cfg(), metLogboek(), gh.fetchFn);
    const data = metLogboek();
    data.logboek[0].hoeveelheid = 1;
    await slaLogboekOp(cfg(), data, gh.fetchFn);
    expect((await haalLogboekOp(cfg(), gh.fetchFn))[0].hoeveelheid).toBe(1);
  });

  it('nog niets op GitHub: ophalen geeft null', async () => {
    expect(await haalLogboekOp(cfg(), nepGitHub().fetchFn)).toBeNull();
  });
});

describe('items naar de openbare repository', () => {
  it('schrijft src/data/startdata.json zonder logboek', async () => {
    const gh = nepGitHub();
    await slaItemsOp(cfg(), metLogboek(), gh.fetchFn);
    const bestand = gh.bestanden.get('footprint-tracker/src/data/startdata.json');
    const inhoud = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(bestand.content), (c) => c.charCodeAt(0))));
    expect(inhoud.items.length).toBe(nieuweData().items.length);
    expect(inhoud.schemaVersie).toBe(1);
    expect(inhoud.logboek).toBeUndefined();
  });
});

describe('foutmeldingen in gewone taal', () => {
  it('fout token, geen toegang/geen repository, geen internet', async () => {
    await expect(slaLogboekOp(cfg({ token: 'fout' }), metLogboek(), nepGitHub().fetchFn)).rejects.toThrow(/token/i);
    await expect(slaLogboekOp(cfg({ dataRepo: 'bestaat-niet' }), metLogboek(), nepGitHub().fetchFn)).rejects.toThrow(/niet gevonden/);
    await expect(slaLogboekOp(cfg(), metLogboek(), nepGitHub({ offline: true }).fetchFn)).rejects.toThrow(/Geen verbinding/);
  });
  it('zonder instellingen: duidelijke melding, geen aanroep', async () => {
    const gh = nepGitHub();
    await expect(slaLogboekOp({}, metLogboek(), gh.fetchFn)).rejects.toThrow(/Instellingen/);
    expect(gh.aanroepen).toHaveLength(0);
  });
});

describe('GitHub-instellingen bewaren', () => {
  it('apart van de app-data', () => {
    const m = new Map();
    const opslag = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
    bewaarGitHub(cfg(), opslag);
    expect(laadGitHub(opslag)).toEqual(cfg());
    expect([...m.keys()]).toEqual(['footprint-tracker:github']);
  });
});
