export interface LiveQuote {
  key: string;
  symbol: string;
  lastPrice: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePct: number;
  timestamp: number;
}

// Upstox full market quote accepts up to 500 comma-separated instrument keys per call
export const MAX_KEYS_PER_QUOTE_CALL = 500;

// Quote requests arriving within this window share one Upstox call, so the chart's
// live-quote poll and the watchlist refresh fired on the same tick cost one request
export const QUOTE_BATCH_WINDOW_MS = 25;

/**
 * Converts one item of the Upstox full market quote response into a LiveQuote.
 * Returns null when the item carries no usable last price.
 */
export function parseFullQuote(instrumentKey: string, item: any): LiveQuote | null {
  const lastPrice = Number(item?.last_price);
  if (!Number.isFinite(lastPrice) || lastPrice <= 0) return null;

  const ohlc = item.ohlc || {};
  const open = Number(ohlc.open) || lastPrice;
  const high = Number(ohlc.high) || lastPrice;
  const low = Number(ohlc.low) || lastPrice;
  const volume = Number(item.volume) || 0;
  const netChange = Number(item.net_change);
  const change = Number.isFinite(netChange) ? netChange : lastPrice - (Number(ohlc.close) || lastPrice);
  // ohlc.close is today's close (equal to the last price intraday), so the previous close is last price - net change
  const prevClose = lastPrice - change;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();

  return {
    key: instrumentKey,
    symbol: item.symbol || item.trading_symbol || instrumentKey.split('|')[1] || instrumentKey,
    lastPrice,
    open,
    high,
    low,
    close: lastPrice,
    volume,
    change,
    changePct,
    timestamp,
  };
}

/**
 * Fetches full market quotes for many instruments, up to 500 keys per Upstox call.
 * GET https://api.upstox.com/v2/market-quote/quotes?instrument_key={key1},{key2},...
 * Keys Upstox does not answer for, or whose call fails, are left out of the result.
 */
export async function fetchFullQuotes(instrumentKeys: string[], token: string): Promise<Map<string, LiveQuote>> {
  const quotes = new Map<string, LiveQuote>();
  const keys = [...new Set(instrumentKeys)];

  for (let i = 0; i < keys.length; i += MAX_KEYS_PER_QUOTE_CALL) {
    const chunk = keys.slice(i, i + MAX_KEYS_PER_QUOTE_CALL);
    const url = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${chunk.map(encodeURIComponent).join(',')}`;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        console.warn(`Upstox market quote call failed (${res.status}) for ${chunk.length} instruments`);
        continue;
      }

      const json = await res.json();
      if (json?.status !== 'success' || !json.data) continue;

      // Response items are keyed "NSE_EQ:RELIANCE"; instrument_token holds the requested "NSE_EQ|..." key
      for (const item of Object.values(json.data) as any[]) {
        const key = item?.instrument_token ?? (chunk.length === 1 ? chunk[0] : undefined);
        if (!key || !chunk.includes(key)) continue;
        const quote = parseFullQuote(key, item);
        if (quote) quotes.set(key, quote);
      }
    } catch (err) {
      console.warn(`Error fetching market quotes for ${chunk.length} instruments:`, err);
    }
  }

  return quotes;
}

/**
 * Collects the keys asked for within `windowMs` and fetches them with a single
 * `fetchBatch` call. Each caller receives the quotes for its own keys.
 */
export function createQuoteLoader(
  fetchBatch: (keys: string[]) => Promise<Map<string, LiveQuote>>,
  windowMs: number = QUOTE_BATCH_WINDOW_MS
): (keys: string[]) => Promise<Map<string, LiveQuote>> {
  let open: { keys: Set<string>; result: Promise<Map<string, LiveQuote>> } | null = null;

  return async (keys) => {
    if (!open) {
      const keySet = new Set<string>();
      const result = new Promise<void>((resolve) => setTimeout(resolve, windowMs)).then(() => {
        open = null;
        return fetchBatch([...keySet]);
      });
      open = { keys: keySet, result };
    }

    const batch = open;
    keys.forEach((k) => batch.keys.add(k));
    const all = await batch.result;

    const mine = new Map<string, LiveQuote>();
    for (const k of keys) {
      const q = all.get(k);
      if (q) mine.set(k, q);
    }
    return mine;
  };
}
