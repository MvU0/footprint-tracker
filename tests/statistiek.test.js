// Voorbeelden die je zelf kunt narekenen.
import { describe, it, expect } from 'vitest';
import { gemiddelde, mediaan, samenvatting } from '../src/lib/statistiek.js';

describe('gemiddelde en mediaan', () => {
  it('[3, 7, 11] → gemiddelde 7, mediaan 7', () => {
    expect(gemiddelde([3, 7, 11])).toBe(7);
    expect(mediaan([3, 7, 11])).toBe(7);
  });

  it('[2, 4, 6, 100] → gemiddelde 28, mediaan (4 + 6) / 2 = 5', () => {
    expect(gemiddelde([2, 4, 6, 100])).toBe(28);
    expect(mediaan([100, 2, 6, 4])).toBe(5); // volgorde maakt niet uit
  });

  it('lege lijst → null', () => {
    expect(gemiddelde([])).toBeNull();
    expect(mediaan([])).toBeNull();
  });
});

describe('samenvatting', () => {
  it('3 bronnen [3, 7, 11]: bereik 3–11, gemiddeld 7, geen mediaan', () => {
    expect(samenvatting([3, 7, 11])).toEqual({
      n: 3, laag: 3, hoog: 11, gemiddeld: 7, mediaan: null, heeftBereik: true,
    });
  });

  it('4 bronnen: wel een mediaan', () => {
    const s = samenvatting([2, 4, 6, 100]);
    expect(s.mediaan).toBe(5);
    expect(s.gemiddeld).toBe(28);
  });

  it('1 bron: geen bereik, laag = hoog = waarde', () => {
    expect(samenvatting([5.2])).toEqual({
      n: 1, laag: 5.2, hoog: 5.2, gemiddeld: 5.2, mediaan: null, heeftBereik: false,
    });
  });

  it('0 bronnen: alles leeg', () => {
    expect(samenvatting([]).n).toBe(0);
    expect(samenvatting([]).gemiddeld).toBeNull();
  });
});
