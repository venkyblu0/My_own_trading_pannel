import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore.ts';
import { INDIAN_MARKET_UNIVERSE, analyzeSymbolForSetups } from '../strategies/scanner.ts';
import { Candle, LiveQuote } from '../types/index.ts';

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

describe('refreshWatchlistQuotes', () => {
  const quote = (key: string, lastPrice: number, change: number, changePct: number): LiveQuote => ({
    key,
    symbol: key.split('|')[1],
    lastPrice,
    open: lastPrice,
    high: lastPrice,
    low: lastPrice,
    close: lastPrice,
    volume: 1000,
    change,
    changePct,
    timestamp: 1_760_000_000_000,
  });
  const answer = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });
  const watchlist = () => useAppStore.getState().watchlist;

  beforeEach(() => {
    useAppStore.setState({ watchlist: useAppStore.getInitialState().watchlist });
  });

  it('asks for every watchlist symbol in one request and fills in the quotes', async () => {
    const keys = watchlist().map((w) => w.key);
    const quotes = Object.fromEntries(keys.map((k, i) => [k, quote(k, 100 + i, i - 2, (i - 2) / 10)]));
    const fetchMock = answer({ ok: true, quotes });
    vi.stubGlobal('fetch', fetchMock);

    await useAppStore.getState().refreshWatchlistQuotes();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`/api/quotes?keys=${encodeURIComponent(keys.join(','))}`);
    watchlist().forEach((item, i) => {
      expect(item.lastPrice).toBe(100 + i);
      expect(item.change).toBe(i - 2);
      expect(item.changePct).toBe((i - 2) / 10);
    });
  });

  it('leaves symbols without a quote null', async () => {
    const reliance = 'NSE_EQ|INE002A01018';
    vi.stubGlobal('fetch', answer({ ok: true, quotes: { [reliance]: quote(reliance, 2950.5, -12.3, -0.415) } }));

    await useAppStore.getState().refreshWatchlistQuotes();

    for (const item of watchlist()) {
      if (item.key === reliance) {
        expect([item.lastPrice, item.change, item.changePct]).toEqual([2950.5, -12.3, -0.415]);
      } else {
        expect([item.lastPrice, item.change, item.changePct]).toEqual([null, null, null]);
      }
    }
  });

  it.each([
    ['the request throws', () => vi.fn().mockRejectedValue(new Error('offline'))],
    ['the server answers 503 (not logged in)', () => answer({ ok: false, error: 'UPSTOX_TOKEN secret not set' }, false)],
    ['the server answers without quotes', () => answer({ ok: false })],
  ])('leaves every symbol null when %s', async (_case, makeFetch) => {
    vi.stubGlobal('fetch', makeFetch());

    await useAppStore.getState().refreshWatchlistQuotes();

    for (const item of watchlist()) {
      expect(item.lastPrice).toBeNull();
      expect(item.change).toBeNull();
      expect(item.changePct).toBeNull();
    }
  });

  it('shares one request when called again while a refresh is running', async () => {
    const fetchMock = answer({ ok: true, quotes: {} });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      useAppStore.getState().refreshWatchlistQuotes(),
      useAppStore.getState().refreshWatchlistQuotes(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
