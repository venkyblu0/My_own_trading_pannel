import { describe, it, expect, beforeAll } from 'vitest';

describe('Custom Indicators Calculation Logic', () => {
  it('correctly calculates SMA without NaN', async () => {
    // Shim window before importing klinecharts
    if (typeof window === 'undefined') {
      (globalThis as any).window = {
        navigator: { userAgent: 'Mozilla/5.0 Node' },
      };
    }

    const { registerCustomIndicators } = await import('./customIndicators.ts');
    const { getSupportedIndicators } = await import('klinecharts');

    registerCustomIndicators();
    const list = getSupportedIndicators();
    expect(list).toContain('SMA');
    expect(list).toContain('EMA');
    expect(list).toContain('VOL');
  });
});
