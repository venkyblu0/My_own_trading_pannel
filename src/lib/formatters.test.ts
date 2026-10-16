import { describe, it, expect } from 'vitest';
import { formatRatio, formatPct, formatVolume } from './formatters.ts';

describe('formatPct', () => {
  it('shows "-" for a missing value instead of 0.00%', () => {
    expect(formatPct(null)).toBe('-');
    expect(formatPct(undefined)).toBe('-');
    expect(formatPct(0)).toBe('0.00%');
    expect(formatPct(1.234)).toBe('+1.23%');
  });
});

describe('formatRatio', () => {
  it('shows "-" instead of inventing a value when the ratio is missing', () => {
    expect(formatRatio(undefined)).toBe('-');
    expect(formatRatio(null)).toBe('-');
    expect(formatRatio(NaN)).toBe('-');
  });

  it('formats real values to 2 decimals, including 0 and negatives', () => {
    expect(formatRatio(0)).toBe('0.00');
    expect(formatRatio(-0.456)).toBe('-0.46');
    expect(formatRatio(1.2345)).toBe('1.23');
  });
});

describe('formatVolume', () => {
  it('shows "-" when there is no volume data, and 0 for a real zero', () => {
    expect(formatVolume(null)).toBe('-');
    expect(formatVolume(undefined)).toBe('-');
    expect(formatVolume(0)).toBe('0');
    expect(formatVolume(8_524_000)).toBe('85.24 L');
  });
});
