import { describe, it, expect } from 'vitest';
import {
  getTimeframeConfig,
  splitDateRange,
  mergeAndSortCandles,
  TIMEFRAME_MAP,
} from './chunking.js';

describe('Timeframe and Chunking Utilities', () => {
  it('maps all supported timeframes to correct Upstox unit and interval', () => {
    expect(getTimeframeConfig('1m')).toEqual({ unit: 'minutes', interval: 1, label: '1m' });
    expect(getTimeframeConfig('5m')).toEqual({ unit: 'minutes', interval: 5, label: '5m' });
    expect(getTimeframeConfig('15m')).toEqual({ unit: 'minutes', interval: 15, label: '15m' });
    expect(getTimeframeConfig('1h')).toEqual({ unit: 'hours', interval: 1, label: '1h' });
    expect(getTimeframeConfig('1D')).toEqual({ unit: 'days', interval: 1, label: '1D' });
    expect(getTimeframeConfig('1W')).toEqual({ unit: 'weeks', interval: 1, label: '1W' });
    expect(getTimeframeConfig('1M')).toEqual({ unit: 'months', interval: 1, label: '1M' });
  });

  it('throws descriptive error on unsupported timeframe', () => {
    expect(() => getTimeframeConfig('10m')).toThrow('Unsupported timeframe');
  });

  it('splits 1m over ~3 months (90 days) into ~3 chunks of max 30 days', () => {
    const config = TIMEFRAME_MAP['1m'];
    const chunks = splitDateRange(config, '2024-01-01', '2024-03-31');
    // 91 days with 30-day max chunk = 4 chunks (30 + 30 + 30 + 1) or 3-4 chunks
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.length).toBeLessThanOrEqual(4);
    expect(chunks[0].from).toBe('2024-01-01');
    expect(chunks[chunks.length - 1].to).toBe('2024-03-31');
  });

  it('splits 1D over 16 years into 2 chunks of max 10 years', () => {
    const config = TIMEFRAME_MAP['1D'];
    const chunks = splitDateRange(config, '2008-01-01', '2024-01-01');
    // 16 years with 10-year max chunk = exactly 2 chunks
    expect(chunks.length).toBe(2);
    expect(chunks[0].from).toBe('2008-01-01');
    expect(chunks[1].to).toBe('2024-01-01');
  });

  it('merges raw candles from multiple chunks, deduplicates, and sorts ascending', () => {
    // Upstox provides newest first in each response
    const chunk2Raw: Array<[string, number, number, number, number, number]> = [
      ['2024-01-03T09:15:00+05:30', 105, 110, 104, 108, 2000],
      ['2024-01-02T09:15:00+05:30', 100, 106, 99, 105, 1500],
    ];

    const chunk1Raw: Array<[string, number, number, number, number, number]> = [
      ['2024-01-02T09:15:00+05:30', 100, 106, 99, 105, 1500], // duplicate
      ['2024-01-01T09:15:00+05:30', 95, 102, 94, 100, 1200],
    ];

    const result = mergeAndSortCandles([chunk2Raw, chunk1Raw]);

    expect(result).toHaveLength(3);
    // Ascending order check
    expect(result[0].open).toBe(95);
    expect(result[1].open).toBe(100);
    expect(result[2].open).toBe(105);
    expect(result[0].time).toBeLessThan(result[1].time);
    expect(result[1].time).toBeLessThan(result[2].time);
  });
});
