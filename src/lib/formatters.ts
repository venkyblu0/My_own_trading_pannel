/**
 * Formats a number to Indian Rupee representation (e.g. ₹1,45,230.50).
 */
export function formatINR(val: number | null | undefined, showSymbol: boolean = true): string {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Formats percentage with sign (e.g. +1.45% or -0.80%).
 */
export function formatPct(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0.00%';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${val.toFixed(2)}%`;
}

/**
 * Formats volume to readable Indian notation (Cr, L, K) or standard commas.
 */
export function formatVolume(vol: number | null | undefined): string {
  if (!vol || isNaN(vol)) return '0';
  if (vol >= 10_000_000) {
    return `${(vol / 10_000_000).toFixed(2)} Cr`;
  }
  if (vol >= 100_000) {
    return `${(vol / 100_000).toFixed(2)} L`;
  }
  if (vol >= 1_000) {
    return `${(vol / 1_000).toFixed(1)} K`;
  }
  return vol.toLocaleString('en-IN');
}

/**
 * Formats UTC timestamp in Asia/Kolkata (IST).
 */
export function formatISTTime(timestamp: number | Date, includeDate: boolean = true): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return '-';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  if (includeDate) {
    options.year = 'numeric';
    options.month = 'short';
    options.day = '2-digit';
  }

  return new Intl.DateTimeFormat('en-IN', options).format(date);
}

/**
 * Checks if current time is within Indian market hours (09:15 - 15:30 IST, Mon-Fri).
 */
export function isMarketOpenNow(): boolean {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  });
  const parts = istFormatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0);

  // Closed on Saturday and Sunday
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false;
  }

  const currentMinutes = hour * 60 + minute;
  const marketOpen = 9 * 60 + 15; // 09:15
  const marketClose = 15 * 60 + 30; // 15:30

  return currentMinutes >= marketOpen && currentMinutes <= marketClose;
}
