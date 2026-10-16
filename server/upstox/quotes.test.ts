import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { fetchFullQuotes, parseFullQuote, createQuoteLoader, LiveQuote, MAX_KEYS_PER_QUOTE_CALL } from './quotes.js';

const RELIANCE = 'NSE_EQ|INE002A01018';
const HDFCBANK = 'NSE_EQ|INE040A01034';
const NIFTY = 'NSE_INDEX|Nifty 50';

// Shaped like the Upstox full market quote response: items keyed "SEGMENT:SYMBOL"
const upstoxItem = (instrumentKey: string, symbol: string, lastPrice: number, netChange: number) => ({
  ohlc: { open: lastPrice - 5, high: lastPrice + 10, low: lastPrice - 20, close: lastPrice },
  timestamp: '2026-10-16T10:15:00.000+05:30',
  instrument_token: instrumentKey,
  symbol,
  last_price: lastPrice,
  volume: 123456,
  net_change: netChange,
});

const answer = (body: unknown, ok = true, status = 200) =>
  vi.fn().mockResolvedValue({ ok, status, json: async () => body });

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('parseFullQuote', () => {
  it('takes the change from net_change and the percent from the previous close', () => {
    const q = parseFullQuote(RELIANCE, upstoxItem(RELIANCE, 'RELIANCE', 52.05, -1.05))!;
    expect(q.lastPrice).toBe(52.05);
    expect(q.change).toBe(-1.05);
    // previous close = 52.05 - (-1.05) = 53.10
    expect(q.changePct).toBeCloseTo((-1.05 / 53.1) * 100, 10);
    expect(q.symbol).toBe('RELIANCE');
    expect(q.volume).toBe(123456);
  });

  it('returns null instead of a zero price when last_price is missing', () => {
    const item = { ...upstoxItem(RELIANCE, 'RELIANCE', 1, 0), last_price: undefined };
    expect(parseFullQuote(RELIANCE, item)).toBeNull();
  });
});

describe('fetchFullQuotes', () => {
  it('fetches several instruments in one Upstox call and maps them by instrument_token', async () => {
    const fetchMock = answer({
      status: 'success',
      data: {
        'NSE_EQ:RELIANCE': upstoxItem(RELIANCE, 'RELIANCE', 2950.5, 12.25),
        'NSE_INDEX:Nifty 50': upstoxItem(NIFTY, 'Nifty 50', 25100, -80),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const quotes = await fetchFullQuotes([RELIANCE, NIFTY, HDFCBANK], 'test-token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${[RELIANCE, NIFTY, HDFCBANK].map(encodeURIComponent).join(',')}`
    );
    expect(init.headers.Authorization).toBe('Bearer test-token');

    expect(quotes.get(RELIANCE)?.lastPrice).toBe(2950.5);
    expect(quotes.get(RELIANCE)?.change).toBe(12.25);
    expect(quotes.get(NIFTY)?.lastPrice).toBe(25100);
    // Upstox sent nothing for HDFCBANK, so it has no quote
    expect(quotes.has(HDFCBANK)).toBe(false);
  });

  it.each([
    ['Upstox answers with an error', () => answer({ status: 'error' }, false, 401)],
    ['the request throws', () => vi.fn().mockRejectedValue(new Error('offline'))],
  ])('returns no quotes when %s', async (_case, makeFetch) => {
    vi.stubGlobal('fetch', makeFetch());
    const quotes = await fetchFullQuotes([RELIANCE, HDFCBANK], 'test-token');
    expect(quotes.size).toBe(0);
  });

  it('splits more than 500 instruments into several calls', async () => {
    const fetchMock = answer({ status: 'success', data: {} });
    vi.stubGlobal('fetch', fetchMock);
    const keys = Array.from({ length: MAX_KEYS_PER_QUOTE_CALL + 1 }, (_, i) => `NSE_EQ|TEST${i}`);

    await fetchFullQuotes(keys, 'test-token');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('createQuoteLoader', () => {
  it('folds requests made together into one batch and gives each caller its own quotes', async () => {
    const q = (key: string): LiveQuote => ({
      key, symbol: key, lastPrice: 1, open: 1, high: 1, low: 1, close: 1, volume: 0, change: 0, changePct: 0, timestamp: 0,
    });
    const fetchBatch = vi.fn(async (keys: string[]) => new Map(keys.map((k) => [k, q(k)])));
    const load = createQuoteLoader(fetchBatch, 5);

    const [chart, watchlist] = await Promise.all([load([RELIANCE]), load([NIFTY, RELIANCE, HDFCBANK])]);

    expect(fetchBatch).toHaveBeenCalledTimes(1);
    expect(fetchBatch.mock.calls[0][0].sort()).toEqual([HDFCBANK, NIFTY, RELIANCE].sort());
    expect([...chart.keys()]).toEqual([RELIANCE]);
    expect([...watchlist.keys()]).toEqual([NIFTY, RELIANCE, HDFCBANK]);

    // A later request starts a new batch
    await load([HDFCBANK]);
    expect(fetchBatch).toHaveBeenCalledTimes(2);
  });
});
