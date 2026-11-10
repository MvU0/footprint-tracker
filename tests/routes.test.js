// Eerste test, vooral om te laten zien dat Vitest werkt.
// Een test is: "roep een functie aan en controleer (expect) de uitkomst",
// vergelijkbaar met assert in Python of testthat in R.

import { describe, it, expect } from 'vitest';
import { routeUitHash, ROUTES } from '../src/routes.js';

describe('routeUitHash', () => {
  it('vindt het scherm uit de hash', () => {
    expect(routeUitHash('#/vergelijk').pad).toBe('vergelijk');
  });

  it('tabbladen: Overzicht eerst, Items ernaast', () => {
    expect(ROUTES.slice(0, 2).map((r) => r.pad)).toEqual(['overzicht', 'items']);
  });

  it('Overzicht is het startscherm (lege of onbekende hash)', () => {
    expect(routeUitHash('').pad).toBe('overzicht');
    expect(routeUitHash('#/bestaatniet').pad).toBe('overzicht');
  });
});
