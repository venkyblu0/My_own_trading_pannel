import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Candle, Instrument, CandleLogEntry } from '../types.js';
import { getTimeframeConfig, splitDateRange, mergeAndSortCandles } from '../utils/chunking.js';
import { LiveQuote, createQuoteLoader, fetchFullQuotes } from './quotes.js';

const CACHE_DIR = path.resolve(process.cwd(), 'server', 'cache');
const CANDLES_CACHE_DIR = path.resolve(CACHE_DIR, 'candles');

// Ensure cache directories exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
if (!fs.existsSync(CANDLES_CACHE_DIR)) {
  fs.mkdirSync(CANDLES_CACHE_DIR, { recursive: true });
}

// In-memory logs of data requests for Phase 1 "Logs" tab
const requestLogs: CandleLogEntry[] = [];

export function getRequestLogs(): CandleLogEntry[] {
  return requestLogs.slice(0, 100); // return 100 most recent requests (newest first)
}

export function addRequestLog(entry: CandleLogEntry): void {
  requestLogs.unshift(entry);
  if (requestLogs.length > 200) {
    requestLogs.pop();
  }
}

// Upstox Session Management
const TOKEN_CACHE_FILE = path.resolve(CACHE_DIR, 'token_session.json');

export interface UpstoxSession {
  accessToken: string;
  extendedToken?: string;
  userId?: string;
  userName?: string;
  email?: string;
  expiresAt?: string;
  source: 'env' | 'totp' | 'code' | 'manual';
  updatedAt: number;
}

let memorySession: UpstoxSession | null = null;

function initSession(): void {
  if (process.env.UPSTOX_TOKEN && process.env.UPSTOX_TOKEN.trim().length > 0) {
    memorySession = {
      accessToken: process.env.UPSTOX_TOKEN.trim(),
      source: 'env',
      updatedAt: Date.now(),
    };
    return;
  }

  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8'));
      if (data && data.accessToken) {
        memorySession = data;
        process.env.UPSTOX_TOKEN = data.accessToken;
      }
    } catch {
      // ignore
    }
  }
}
initSession();

export function getActiveToken(): string | null {
  if (memorySession?.accessToken) return memorySession.accessToken;
  if (process.env.UPSTOX_TOKEN && process.env.UPSTOX_TOKEN.trim().length > 0) {
    return process.env.UPSTOX_TOKEN.trim();
  }
  return null;
}

export function getSessionStatus() {
  const token = getActiveToken();
  return {
    authenticated: Boolean(token),
    source: memorySession?.source || (process.env.UPSTOX_TOKEN ? 'env' : 'none'),
    userName: memorySession?.userName,
    userId: memorySession?.userId,
    email: memorySession?.email,
    expiresAt: memorySession?.expiresAt,
  };
}

export function setServerSession(session: UpstoxSession): void {
  memorySession = session;
  process.env.UPSTOX_TOKEN = session.accessToken;
  try {
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(session, null, 2));
  } catch (err) {
    console.warn('Failed to cache token to disk:', err);
  }
}

export function clearServerSession(): void {
  memorySession = null;
  delete process.env.UPSTOX_TOKEN;
  if (fs.existsSync(TOKEN_CACHE_FILE)) {
    try {
      fs.unlinkSync(TOKEN_CACHE_FILE);
    } catch {}
  }
}

/**
 * Acquire Upstox access token using TOTP and PIN.
 * POST https://api.upstox.com/v2/totp-login/authorization/token
 */
export async function loginViaTotp(apiKey: string, pin: string, totp: string) {
  const cleanKey = apiKey.trim();
  const cleanPin = pin.trim();
  const cleanTotp = totp.trim();

  if (!cleanKey) throw new Error('API Key is required');
  if (cleanPin.length !== 6) throw new Error("The 'pin' must be exactly 6 digits");
  if (cleanTotp.length !== 6) throw new Error("The 'totp' must be exactly 6 digits");

  const res = await fetch('https://api.upstox.com/v2/totp-login/authorization/token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': cleanKey,
    },
    body: JSON.stringify({
      totp: cleanTotp,
      pin: cleanPin,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errMsg = json?.errors?.[0]?.message || json?.message || `Upstox TOTP Login failed (${res.status})`;
    throw new Error(errMsg);
  }

  const accessToken = json.access_token;
  if (!accessToken) {
    throw new Error('No access_token returned by Upstox');
  }

  setServerSession({
    accessToken,
    extendedToken: json.extended_token,
    userId: json.user_id,
    userName: json.user_name,
    email: json.email,
    expiresAt: '3:30 AM',
    source: 'totp',
    updatedAt: Date.now(),
  });

  return {
    userName: json.user_name,
    userId: json.user_id,
    email: json.email,
  };
}

/**
 * Acquire Upstox access token using authorization code.
 * POST https://api.upstox.com/v2/login/authorization/token
 */
export async function loginViaAuthCode(code: string, clientId: string, clientSecret: string, redirectUri: string) {
  const res = await fetch('https://api.upstox.com/v2/login/authorization/token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: code.trim(),
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      redirect_uri: redirectUri.trim(),
      grant_type: 'authorization_code',
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errMsg = json?.errors?.[0]?.message || json?.message || `Upstox Auth Code Login failed (${res.status})`;
    throw new Error(errMsg);
  }

  const accessToken = json.access_token;
  if (!accessToken) {
    throw new Error('No access_token returned by Upstox');
  }

  setServerSession({
    accessToken,
    extendedToken: json.extended_token,
    userId: json.user_id,
    userName: json.user_name,
    email: json.email,
    expiresAt: '3:30 AM',
    source: 'code',
    updatedAt: Date.now(),
  });

  return {
    userName: json.user_name,
    userId: json.user_id,
    email: json.email,
  };
}

/**
 * Directly set token (e.g. Analytics Token or Access Token pasted by user).
 */
export async function setTokenDirect(rawToken: string) {
  const clean = rawToken.trim();
  if (!clean) throw new Error('Token cannot be empty');

  let userName: string | undefined;
  let userId: string | undefined;
  let email: string | undefined;

  try {
    const profileRes = await fetch('https://api.upstox.com/v2/user/profile', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${clean}`,
      },
    });
    if (profileRes.ok) {
      const pJson = await profileRes.json();
      if (pJson.status === 'success' && pJson.data) {
        userName = pJson.data.user_name;
        userId = pJson.data.user_id;
        email = pJson.data.email;
      }
    }
  } catch {
    // profile check is non-fatal for 1-year Analytics tokens
  }

  setServerSession({
    accessToken: clean,
    userName,
    userId,
    email,
    source: 'manual',
    updatedAt: Date.now(),
  });

  return {
    userName,
    userId,
    email,
  };
}

export type { LiveQuote } from './quotes.js';

// Concurrent quote requests (chart poll + watchlist refresh) share one Upstox call
const loadQuotes = createQuoteLoader(async (keys) => {
  const token = getActiveToken();
  if (!token) return new Map<string, LiveQuote>();
  return fetchFullQuotes(keys, token);
});

/**
 * Fetches real-time full market quotes for several instruments.
 * Instruments without a quote are left out of the result.
 */
export async function getMarketQuotes(instrumentKeys: string[]): Promise<Record<string, LiveQuote>> {
  const token = getActiveToken();
  if (!token) {
    throw new Error('UPSTOX_TOKEN secret not set');
  }
  return Object.fromEntries(await loadQuotes(instrumentKeys));
}

/**
 * Fetches real-time live market quote for an instrument from Upstox API v2.
 * GET https://api.upstox.com/v2/market-quote/quotes?instrument_key={key}
 */
export async function getMarketQuote(instrumentKey: string): Promise<LiveQuote | null> {
  const token = getActiveToken();
  if (!token) {
    throw new Error('UPSTOX_TOKEN secret not set');
  }

  try {
    const quote = (await loadQuotes([instrumentKey])).get(instrumentKey);
    if (quote) return quote;

    // If full quote is restricted or error, try LTP endpoint
    const encodedKey = encodeURIComponent(instrumentKey);
    const ltpUrl = `https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodedKey}`;
    const ltpRes = await fetch(ltpUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (ltpRes.ok) {
      const ltpJson = await ltpRes.json();
      const first = Object.values(ltpJson?.data || {})[0] as any;
      if (first && typeof first.last_price === 'number') {
        return {
          key: instrumentKey,
          symbol: first.trading_symbol || instrumentKey.split('|')[1] || instrumentKey,
          lastPrice: first.last_price,
          open: first.last_price,
          high: first.last_price,
          low: first.last_price,
          close: first.last_price,
          volume: 0,
          change: 0,
          changePct: 0,
          timestamp: Date.now(),
        };
      }
    }
    return null;
  } catch (err) {
    console.warn(`Error fetching market quote for ${instrumentKey}:`, err);
    return null;
  }
}


// Pre-seeded high quality equity & index symbols so search works instantaneously
const PRESEEDED_INSTRUMENTS: Instrument[] = [
  { key: 'NSE_EQ|INE002A01018', symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE040A01034', symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE090A01021', symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE009A01021', symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE467B01029', symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE062A01020', symbol: 'SBIN', name: 'STATE BANK OF INDIA', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE154A01025', symbol: 'ITC', name: 'ITC LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE030A01027', symbol: 'HINDUNILVR', name: 'HINDUSTAN UNILEVER LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE238A01034', symbol: 'AXISBANK', name: 'AXIS BANK LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE237A01028', symbol: 'KOTAKBANK', name: 'KOTAK MAHINDRA BANK LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE018A01030', symbol: 'LT', name: 'LARSEN & TOUBRO LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE397D01024', symbol: 'BHARTIARTL', name: 'BHARTI AIRTEL LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE155A01022', symbol: 'TATAMOTORS', name: 'TATA MOTORS LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE081A01012', symbol: 'TATASTEEL', name: 'TATA STEEL LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE752E01010', symbol: 'POWERGRID', name: 'POWER GRID CORP OF INDIA LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE733E01010', symbol: 'NTPC', name: 'NTPC LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE216A01030', symbol: 'BAJFINANCE', name: 'BAJAJ FINANCE LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE296A01024', symbol: 'BAJAJFINSV', name: 'BAJAJ FINSERV LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE423A01024', symbol: 'ADANIENT', name: 'ADANI ENTERPRISES LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE742F01042', symbol: 'ADANIPORTS', name: 'ADANI PORTS & SEZ LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE044A01036', symbol: 'SUNPHARMA', name: 'SUN PHARMACEUTICAL IND LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE075A01022', symbol: 'WIPRO', name: 'WIPRO LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE860A01027', symbol: 'HCLTECH', name: 'HCL TECHNOLOGIES LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE585B01010', symbol: 'MARUTI', name: 'MARUTI SUZUKI INDIA LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE101A01026', symbol: 'M&M', name: 'MAHINDRA & MAHINDRA LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE021A01026', symbol: 'ASIANPAINT', name: 'ASIAN PAINTS LTD', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_EQ|INE121A01024', symbol: 'CHOLAFIN', name: 'CHOLAMANDALAM INVEST & FIN', exchange: 'NSE', segment: 'NSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'NSE_INDEX|Nifty 50', symbol: 'NIFTY 50', name: 'Nifty 50 Index', exchange: 'NSE', segment: 'NSE_INDEX', type: 'INDEX', tickSize: 0.05, lotSize: 25 },
  { key: 'NSE_INDEX|Nifty Bank', symbol: 'BANKNIFTY', name: 'Nifty Bank Index', exchange: 'NSE', segment: 'NSE_INDEX', type: 'INDEX', tickSize: 0.05, lotSize: 15 },
  { key: 'BSE_EQ|500325', symbol: 'RELIANCE', name: 'RELIANCE INDUSTRIES LTD', exchange: 'BSE', segment: 'BSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'BSE_EQ|500180', symbol: 'HDFCBANK', name: 'HDFC BANK LTD', exchange: 'BSE', segment: 'BSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'BSE_EQ|532174', symbol: 'ICICIBANK', name: 'ICICI BANK LTD', exchange: 'BSE', segment: 'BSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'BSE_EQ|500209', symbol: 'INFY', name: 'INFOSYS LTD', exchange: 'BSE', segment: 'BSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
  { key: 'BSE_EQ|532540', symbol: 'TCS', name: 'TATA CONSULTANCY SERVICES LTD', exchange: 'BSE', segment: 'BSE_EQ', type: 'EQUITY', tickSize: 0.05, lotSize: 1 },
];

let instrumentsMemoryCache: Instrument[] = [...PRESEEDED_INSTRUMENTS];
let isDownloadingInstruments = false;

/**
 * Downloads and parses the Upstox instrument master files.
 * Caches them on disk for 24 hours.
 */
export async function loadInstrumentMaster(): Promise<void> {
  const nseCacheFile = path.resolve(CACHE_DIR, 'instruments_NSE.json');
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // Check if cache file exists and is recent (< 24 hours)
  if (fs.existsSync(nseCacheFile)) {
    try {
      const stats = fs.statSync(nseCacheFile);
      if (now - stats.mtimeMs < ONE_DAY_MS) {
        const data = JSON.parse(fs.readFileSync(nseCacheFile, 'utf-8'));
        if (Array.isArray(data) && data.length > 0) {
          instrumentsMemoryCache = data;
          return;
        }
      }
    } catch {
      // If reading cache fails, proceed to download
    }
  }

  if (isDownloadingInstruments) return;
  isDownloadingInstruments = true;

  try {
    const urls = [
      'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz',
      'https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz',
    ];

    const allInstruments: Instrument[] = [];

    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const decompressed = zlib.gunzipSync(buffer);
        const rawItems = JSON.parse(decompressed.toString('utf-8'));

        if (Array.isArray(rawItems)) {
          for (const item of rawItems) {
            if (!item.instrument_key || !item.trading_symbol) continue;
            allInstruments.push({
              key: item.instrument_key,
              symbol: item.trading_symbol,
              name: item.name || item.trading_symbol,
              exchange: (item.exchange || 'NSE') as any,
              segment: item.segment || '',
              type: item.instrument_type || item.type || 'EQUITY',
              tickSize: Number(item.tick_size) || 0.05,
              lotSize: Number(item.lot_size) || 1,
            });
          }
        }
      } catch (err) {
        console.warn(`Could not load instrument master from ${url}:`, err);
      }
    }

    if (allInstruments.length > 0) {
      // Merge with preseeded items to ensure no missing critical instruments
      const keySet = new Set(allInstruments.map((i) => i.key));
      for (const p of PRESEEDED_INSTRUMENTS) {
        if (!keySet.has(p.key)) {
          allInstruments.push(p);
        }
      }
      instrumentsMemoryCache = allInstruments;
      fs.writeFileSync(nseCacheFile, JSON.stringify(allInstruments));
    }
  } catch (err) {
    console.error('Failed to update instrument master:', err);
  } finally {
    isDownloadingInstruments = false;
  }
}

// Background initialize
loadInstrumentMaster().catch(() => {});

/**
 * Searches instruments by exchange, query string, and derivative filter.
 */
export function searchInstruments(
  query: string,
  exchange: string = 'NSE',
  includeDerivatives: boolean = false
): Instrument[] {
  const q = (query || '').trim().toLowerCase();
  const ex = exchange.toUpperCase();

  return instrumentsMemoryCache
    .filter((inst) => {
      // Filter exchange
      if (ex === 'NSE INDICES' || ex === 'NSE_INDEX') {
        if (inst.segment !== 'NSE_INDEX' && inst.type !== 'INDEX') return false;
      } else if (ex === 'NSE') {
        if (inst.exchange !== 'NSE') return false;
      } else if (ex === 'BSE') {
        if (inst.exchange !== 'BSE') return false;
      } else if (ex === 'MCX') {
        if (inst.exchange !== 'MCX') return false;
      }

      // Filter derivatives (default equity & index only)
      if (!includeDerivatives) {
        const isEquity = inst.type === 'EQUITY' || inst.segment.includes('_EQ');
        const isIndex = inst.type === 'INDEX' || inst.segment.includes('_INDEX');
        if (!isEquity && !isIndex) return false;
      }

      // Query match: match symbol or name
      if (!q) return true;
      const symbolMatch = inst.symbol.toLowerCase().includes(q);
      const nameMatch = inst.name.toLowerCase().includes(q);
      return symbolMatch || nameMatch;
    })
    .sort((a, b) => {
      // Exact symbol match first, then starts with symbol, then alphabetical
      const aExact = a.symbol.toLowerCase() === q;
      const bExact = b.symbol.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.symbol.toLowerCase().startsWith(q);
      const bStarts = b.symbol.toLowerCase().startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return a.symbol.localeCompare(b.symbol);
    })
    .slice(0, 20);
}

/**
 * Sleep helper for rate limiting and backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches historical candles from Upstox API v3 for a single date chunk.
 * Implements exponential backoff on HTTP 429.
 */
async function fetchCandleChunk(
  instrumentKey: string,
  unit: string,
  interval: number,
  toDate: string,
  fromDate: string,
  token: string
): Promise<Array<[string, number, number, number, number, number, number?]>> {
  const encodedKey = encodeURIComponent(instrumentKey);
  const url = `https://api.upstox.com/v3/historical-candle/${encodedKey}/${unit}/${interval}/${toDate}/${fromDate}`;

  let retries = 3;
  let delayMs = 300;

  while (retries >= 0) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 429) {
        // Rate limited, backoff
        await sleep(delayMs);
        delayMs *= 2;
        retries--;
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Upstox API error (${res.status}): ${errBody || res.statusText}`);
      }

      const json = await res.json();
      if (json.status === 'success' && json.data && Array.isArray(json.data.candles)) {
        return json.data.candles;
      }
      return [];
    } catch (err: any) {
      if (retries === 0) throw err;
      retries--;
      await sleep(delayMs);
      delayMs *= 2;
    }
  }

  return [];
}

/**
 * Fetches today's intraday candle if available
 */
async function fetchIntradayToday(
  instrumentKey: string,
  unit: string,
  interval: number,
  token: string
): Promise<Array<[string, number, number, number, number, number, number?]>> {
  try {
    const encodedKey = encodeURIComponent(instrumentKey);
    const url = `https://api.upstox.com/v3/historical-candle/intraday/${encodedKey}/${unit}/${interval}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json.status === 'success' && json.data && Array.isArray(json.data.candles)) {
      return json.data.candles;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Main function to fetch candles across date ranges with chunking and disk cache.
 */
export async function getHistoricalCandles(
  instrumentKey: string,
  tf: string,
  fromDate: string,
  toDate: string
): Promise<{ candles: Candle[]; cached: boolean; durationMs: number }> {
  const startTime = Date.now();
  const token = getActiveToken();

  // Hard Rule 1: Secrets must be set on server. Never send token.
  if (!token) {
    const errorEntry: CandleLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      symbol: instrumentKey,
      timeframe: tf,
      from: fromDate,
      to: toDate,
      durationMs: Date.now() - startTime,
      candleCount: 0,
      cached: false,
      status: 'error',
      errorMessage: 'UPSTOX_TOKEN secret not set',
    };
    addRequestLog(errorEntry);
    throw new Error('UPSTOX_TOKEN secret not set');
  }

  const tfConfig = getTimeframeConfig(tf);
  const chunks = splitDateRange(tfConfig, fromDate, toDate);

  // Generate disk cache key
  const safeKey = instrumentKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cacheKey = `${safeKey}_${tf}_${fromDate}_${toDate}.json`;
  const cachePath = path.resolve(CANDLES_CACHE_DIR, cacheKey);

  // Check if fully cached (only for completed ranges; today might have newer data)
  const todayStr = new Date().toISOString().slice(0, 10);
  const isQueryingToday = toDate >= todayStr;

  if (!isQueryingToday && fs.existsSync(cachePath)) {
    try {
      const cachedData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      if (Array.isArray(cachedData)) {
        const durationMs = Date.now() - startTime;
        addRequestLog({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
          symbol: instrumentKey,
          timeframe: tf,
          from: fromDate,
          to: toDate,
          durationMs,
          candleCount: cachedData.length,
          cached: true,
          status: 'ok',
        });
        return { candles: cachedData, cached: true, durationMs };
      }
    } catch {
      // cache read failed, proceed to fetch
    }
  }

  const rawChunks: Array<Array<[string, number, number, number, number, number, number?]>> = [];

  for (const chunk of chunks) {
    // Respect rate limit: ~5 req/sec = 200ms delay between calls
    await sleep(150);
    const chunkCandles = await fetchCandleChunk(
      instrumentKey,
      tfConfig.unit,
      tfConfig.interval,
      chunk.to,
      chunk.from,
      token
    );
    rawChunks.push(chunkCandles);
  }

  // If querying today and intraday interval, also attempt intraday-today endpoint
  if (isQueryingToday && (tfConfig.unit === 'minutes' || tfConfig.unit === 'hours')) {
    const todayCandles = await fetchIntradayToday(
      instrumentKey,
      tfConfig.unit,
      tfConfig.interval,
      token
    );
    if (todayCandles.length > 0) {
      rawChunks.push(todayCandles);
    }
  }

  const sortedCandles = mergeAndSortCandles(rawChunks);
  const durationMs = Date.now() - startTime;

  // Cache permanently on disk if not querying today or if range is in past
  if (!isQueryingToday && sortedCandles.length > 0) {
    try {
      fs.writeFileSync(cachePath, JSON.stringify(sortedCandles));
    } catch (e) {
      console.warn('Failed to write candle disk cache:', e);
    }
  }

  addRequestLog({
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
    symbol: instrumentKey,
    timeframe: tf,
    from: fromDate,
    to: toDate,
    durationMs,
    candleCount: sortedCandles.length,
    cached: false,
    status: 'ok',
  });

  return {
    candles: sortedCandles,
    cached: false,
    durationMs,
  };
}
