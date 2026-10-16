import { describe, it, expect, vi, afterEach } from 'vitest';
import { useAppStore } from './useAppStore.ts';
import { INDIAN_MARKET_UNIVERSE, analyzeSymbolForSetups } from '../strategies/scanner.ts';
import { Candle } from '../types/index.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('runMarketScan without market data', () => {
  it.each([
    ['the request throws', () => vi.fn().mockRejectedValue(new Error('offline'))],
    ['the server answers with an error', () => vi.fn().mockResolvedValue({ ok: false, json: async () => ({ ok: false }) })],
  ])('shows "Data unavailable" instead of inventing a signal when %s', async (_case, makeFetch) => {
    vi.stubGlobal('fetch', makeFetch());
    useAppStore.setState({ candles: [], scannerResults: [] });

    await useAppStore.getState().runMarketScan();

    const results = useAppStore.getState().scannerResults;
    const scanned = INDIAN_MARKET_UNIVERSE.filter((u) => u.key !== useAppStore.getState().selectedInstrument.key);
    expect(results).toHaveLength(scanned.length);
    for (const r of results) {
      expect(r.setupName).toBe('Data unavailable');
      expect(r.signal).toBe('UNAVAILABLE');
      expect(r.setupScore).toBe(0);
      expect(r.lastPrice).toBeNull();
      expect(r.changePct).toBeNull();
    }
  });
});

describe('no hardcoded prices', () => {
  it('starts with no price data until real candles or quotes arrive', () => {
    const s = useAppStore.getInitialState();
    expect(s.lastClose).toBeNull();
    expect(s.priceChange).toBeNull();
    expect(s.priceChangePct).toBeNull();
    expect(s.sessionHigh).toBeNull();
    expect(s.sessionLow).toBeNull();
    expect(s.sessionVolume).toBeNull();
  });

  it('lists watchlist and scanner symbols without prices', () => {
    for (const item of [...useAppStore.getInitialState().watchlist, ...INDIAN_MARKET_UNIVERSE]) {
      expect(item.lastPrice).toBeNull();
      expect(item.change).toBeNull();
      expect(item.changePct).toBeNull();
    }
  });

  it('takes the scanner price and change from the candles', () => {
    const candles: Candle[] = Array.from({ length: 60 }, (_, i) => {
      const c = 100 + i * 0.7;
      return { time: 1_700_000_000_000 + i * 86_400_000, open: c, high: c + 1, low: c - 1, close: c, volume: 1000 };
    });
    const [prev, last] = candles.slice(-2);
    const scan = analyzeSymbolForSetups(INDIAN_MARKET_UNIVERSE[1], candles)!;
    expect(scan.lastPrice).toBe(last.close);
    expect(scan.changePct).toBeCloseTo(((last.close - prev.close) / prev.close) * 100, 10);
  });
});
