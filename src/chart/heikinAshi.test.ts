import { describe, it, expect } from 'vitest';
import { computeHeikinAshi } from './heikinAshi.ts';
import { Candle } from '../types/index.ts';

describe('Heikin Ashi Calculation', () => {
  it('correctly transforms 3 hand-computed candles according to standard formula', () => {
    const rawCandles: Candle[] = [
      { time: 1000, open: 100, high: 110, low: 95, close: 105, volume: 1000 },
      { time: 2000, open: 106, high: 112, low: 104, close: 110, volume: 1200 },
      { time: 3000, open: 108, high: 109, low: 101, close: 102, volume: 1500 },
    ];

    const ha = computeHeikinAshi(rawCandles);

    expect(ha).toHaveLength(3);

    // Candle 0
    // haClose = (100 + 110 + 95 + 105) / 4 = 102.5
    // haOpen = (100 + 105) / 2 = 102.5
    // haHigh = max(110, 102.5, 102.5) = 110
    // haLow = min(95, 102.5, 102.5) = 95
    expect(ha[0].open).toBe(102.5);
    expect(ha[0].close).toBe(102.5);
    expect(ha[0].high).toBe(110);
    expect(ha[0].low).toBe(95);
    expect(ha[0].volume).toBe(1000);

    // Candle 1
    // haClose = (106 + 112 + 104 + 110) / 4 = 108
    // haOpen = (haOpen[0] + haClose[0]) / 2 = (102.5 + 102.5) / 2 = 102.5
    // haHigh = max(112, 102.5, 108) = 112
    // haLow = min(104, 102.5, 108) = 102.5
    expect(ha[1].open).toBe(102.5);
    expect(ha[1].close).toBe(108);
    expect(ha[1].high).toBe(112);
    expect(ha[1].low).toBe(102.5);
    expect(ha[1].volume).toBe(1200);

    // Candle 2
    // haClose = (108 + 109 + 101 + 102) / 4 = 105
    // haOpen = (haOpen[1] + haClose[1]) / 2 = (102.5 + 108) / 2 = 105.25
    // haHigh = max(109, 105.25, 105) = 109
    // haLow = min(101, 105.25, 105) = 101
    expect(ha[2].open).toBe(105.25);
    expect(ha[2].close).toBe(105);
    expect(ha[2].high).toBe(109);
    expect(ha[2].low).toBe(101);
    expect(ha[2].volume).toBe(1500);
  });

  it('handles empty arrays without errors', () => {
    expect(computeHeikinAshi([])).toEqual([]);
  });
});
