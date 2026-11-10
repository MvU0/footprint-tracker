// Eerste test, vooral om te laten zien dat Vitest werkt.
// Een test is: "roep een functie aan en controleer (expect) de uitkomst",
// vergelijkbaar met assert in Python of testthat in R.

import { describe, it, expect } from 'vitest';
import { routeUitHash } from '../src/routes.js';

describe('routeUitHash', () => {
  it('vindt het scherm uit de hash', () => {
    expect(routeUitHash('#/vergelijk').pad).toBe('vergelijk');
  });

  it('valt terug op het eerste scherm bij een lege of onbekende hash', () => {
    expect(routeUitHash('').pad).toBe('items');
    expect(routeUitHash('#/bestaatniet').pad).toBe('items');
  });
});
