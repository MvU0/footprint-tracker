import { describe, it, expect } from 'vitest';
import { periodeVan, verschuif, periodeLabel, laatstePeriodes } from '../src/lib/periodes.js';

describe('periodeVan', () => {
  it('maand en jaar', () => {
    expect(periodeVan('2026-11-10', 'maand')).toBe('2026-11');
    expect(periodeVan('2026-11-10', 'jaar')).toBe('2026');
  });

  // ISO-weken: maandag t/m zondag; week 1 is de week met de eerste donderdag van het jaar.
  it('ISO-week, ook rond de jaarwisseling', () => {
    expect(periodeVan('2026-11-10', 'week')).toBe('2026-W46');
    expect(periodeVan('2024-12-30', 'week')).toBe('2025-W01'); // maandag, hoort al bij 2025
    expect(periodeVan('2021-01-03', 'week')).toBe('2020-W53'); // zondag, hoort nog bij 2020
    expect(periodeVan('2026-12-31', 'week')).toBe('2026-W53'); // 2026 heeft 53 weken
    expect(periodeVan('2027-01-03', 'week')).toBe('2026-W53');
    expect(periodeVan('2027-01-04', 'week')).toBe('2027-W01');
  });
});

describe('verschuif (vorige/volgende periode)', () => {
  it('over de jaargrens heen', () => {
    expect(verschuif('2026-W53', 'week', 1)).toBe('2027-W01');
    expect(verschuif('2025-W01', 'week', -1)).toBe('2024-W52');
    expect(verschuif('2026-01', 'maand', -1)).toBe('2025-12');
    expect(verschuif('2026-11', 'maand', 2)).toBe('2027-01');
    expect(verschuif('2026', 'jaar', -1)).toBe('2025');
  });
});

describe('periodeLabel', () => {
  it('lang en kort', () => {
    expect(periodeLabel('2026-11', 'maand')).toBe('november 2026');
    expect(periodeLabel('2026-11', 'maand', true)).toBe('nov');
    expect(periodeLabel('2026-W46', 'week')).toBe('week 46, 2026');
    expect(periodeLabel('2026-W46', 'week', true)).toBe('w46');
    expect(periodeLabel('2026', 'jaar')).toBe('2026');
  });
});

describe('laatstePeriodes', () => {
  it('n periodes die eindigen bij de gekozen periode, oudste eerst', () => {
    expect(laatstePeriodes('2026-02', 'maand', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});
