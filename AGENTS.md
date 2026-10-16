# Trading Studio: rules for AI coding agents

This file is for any AI agent that edits this repo: Google AI Studio (Build mode), Claude Code, Gemini, or others.
**Read it at the start of every session, and follow it for every change.**
If a request conflicts with a rule here, say which rule and ask the user before breaking it.

These rules come from the SMA44 audit (PR #1) and the watchlist quotes work (PR #2), both merged on 16 Oct 2026.

---

## 1. Never show made-up market data

- **No hardcoded prices**: no prices, changes, volumes or session highs/lows as defaults, placeholders or "demo" values.
  Unknown values are `null` and display as `-`. The helpers in `src/lib/formatters.ts` (`formatINR`, `formatPct`,
  `formatVolume`, `formatRatio`) already show `-` for missing values. Use them.
- **When a data fetch fails**, show it as unavailable, e.g. `unavailableScanItem()` in `src/strategies/scanner.ts`
  ("Data unavailable"). Never invent a BULLISH/BEARISH signal, a score or a quote to fill the gap.
- **No fallback numbers for metrics** (the old `?? '1.45'` Sharpe). A metric that can't be computed is
  `undefined`/`null` and shows `-`.
- **A missing price from Upstox means no quote.** Never turn it into `0`.
- **No unlabelled simulated data.** Random or simulated data must never pass as real. If a demo mode is ever wanted,
  it needs the user's OK and a clear label in the UI.

## 2. SMA44 follows the agreed spec, exactly

| Rule | Spec |
|---|---|
| Trend | SMA(44) today > SMA(44) 5 bars ago |
| Setup candle | green (close > open), low <= SMA x 1.01, close > SMA, close >= ₹20 |
| Entry | buy-stop at setup high + 0.05, valid 2 bars; if the open is at or above the trigger, fill at the open |
| Stop | min(setup low, previous low); a gap below the stop exits at the open; skip if risk > 15% |
| Same candle hits stop and target | count it as the stop. A stop hit on the entry candle stops out on that bar |
| Exits (`exitMode`) | `fixed` = 2R target · `half` = half at 2R, stop to breakeven, rest trails · `trail` = exit next open after a close below the SMA |
| Costs | 0.15% of traded value per side (`costPerSidePct`) |
| Sizing | risk 1% of equity (`riskPerTradePct`), capped by `maxAllocationPct` |
| Trend filter | optional `trendFilterSma`, default `0` = off |

- The spec constants are the `SMA44_*` values at the top of `src/strategies/engine.ts`.
- **Don't add conditions** without the user agreeing a spec change first. That covers close > previous close, stop
  buffers, extra distance checks and default-on filters.
- **Don't change the rules of the other four strategies** (EMA crossover, Supertrend, RSI reversal, Bollinger breakout)
  unless the user asks.

## 3. One rule, one place

- Strategy rules live only in `generateSignals()` in `src/strategies/engine.ts`. The scanner, the UI and anything else
  must call it; never write a second copy of a rule.
- `runBacktest()` must not mutate the signals it receives. It returns new signal objects that carry their final
  status.

## 4. The backtest must stay honest

- **Costs** come off every fill, including half exits. P&L and P&L % are net of costs.
- **Equity is marked to market every bar**, including any open position. Drawdown is measured on that curve. Sharpe is
  mean / sample std of daily returns x sqrt(252) (52 for `1W`, 12 for `1M`), and `undefined` when equity never moves.
- **No look-ahead.** Signals form at the bar's close. A buy-stop can only fill on a later bar.
- **R-multiples.** Every trade records `rMultiple` = P&L / (shares x (entry - initial stop)). Results include `avgR`,
  `totalCosts` and `exitMode`.

## 5. Read params with `numParam()`

- Use `numParam(value, fallback)` from `src/strategies/engine.ts`. `0` is a real value: `trendFilterSma: 0` means
  "filter off".
- **Never write `Number(x) || default`.** It silently turns 0 into the default.

## 6. Upstox data and secrets

- **Upstox calls go through the Express server** (`server/`), never straight from the browser.
- **The login token is saved server-side** in `server/cache/token_session.json`. It must never reach the browser, a log
  or a commit; `server/cache/` is in `.gitignore`.
- **Never commit secrets**: no `.env`, tokens, API keys or `server/cache/`. Only `.env.example` is committed, and it
  holds placeholders only.
- **Quotes:**
  - `GET /api/quote?key=...` gives one instrument.
  - `GET /api/quotes?keys=a,b,c` gives many. Quote requests that arrive within 25 ms share one Upstox call.
  - The chart's 1-second poll already refreshes the watchlist too. Don't add another polling loop: Upstox
    rate-limits requests.

## 7. Tests are part of every change

- **Install** with `npm install --legacy-peer-deps`. The `esbuild` dev dependency clashes with Vite 8's peer range.
  The repo uses `bun.lock`, so don't commit `package-lock.json`.
- **Before calling a change done**, all three must pass:
  `npx vitest run`, `npx tsc --noEmit`, `npm run build`.
- **Strategy or backtest changes need hand-made-candle tests** where the right answer is known in advance, in
  `src/strategies/sma44.test.ts` or a new test file. Existing examples:
  - a 2R target hit = +2.00R at zero cost
  - a stop hit = -1.00R
  - a gap-up fills at the open
  - an unfilled order expires after 2 bars
- **Never delete, skip or loosen an existing test** to make a change pass. If a test looks wrong, explain why and ask.

## 8. Don't change without asking

- The `DISABLE_HMR` / `watch` settings in `vite.config.ts`, which AI Studio relies on.
- `metadata.json` capabilities.
- Dependency versions, especially `vite`, `esbuild` and `vitest`.
- The data source (Upstox), or where secrets are stored.

## 9. Working alongside GitHub sync

Claude Code also edits this repo, from the user's computer.

- **Pull changes from GitHub into AI Studio before you start**, and push when you finish, so the two copies don't
  drift apart.
- **If AI Studio shows "Resolve conflicts"**, keep the GitHub version of any file you didn't mean to change.
- **Keep each change small and focused**, with a commit message that says what changed and why.
- **Never force-push or rewrite `main`'s history.**
