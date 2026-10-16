import { registerIndicator, KLineData, IndicatorTemplate } from 'klinecharts';
import { useAppStore } from '../store/useAppStore.ts';

/**
 * Custom indicator registrations ensuring:
 * 1. Indicators are plotted directly OVER the candlesticks in the candle pane.
 * 2. Robust mathematical calculations that NEVER produce NaN with single-parameter or custom parameter inputs.
 * 3. Overlaid Volume histogram rendered at the bottom 18% of the candle pane without distorting price scaling.
 */

let isRegistered = false;

export function registerCustomIndicators() {
  if (isRegistered) return;
  isRegistered = true;

  // 1. Robust Simple Moving Average (SMA) — overlaid directly over candles
  registerIndicator({
    name: 'SMA',
    shortName: 'SMA',
    series: 'price',
    calcParams: [44],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'sma', title: 'SMA: ', type: 'line' }],
    regenerateFigures: (params: number[]) => {
      return (params || [44]).map((p, i) => ({
        key: `sma${i + 1}`,
        title: `SMA${p}: `,
        type: 'line',
      }));
    },
    calc: (dataList: KLineData[], indicator: any) => {
      const rawParams: number[] = Array.isArray(indicator.calcParams) && indicator.calcParams.length > 0
        ? indicator.calcParams
        : [44];
      const figures = indicator.figures || [];
      const closeSums: number[] = [];

      return dataList.map((kLineData, i) => {
        const res: Record<string, number> = {};
        const close = kLineData.close;

        rawParams.forEach((p, index) => {
          const period = Math.max(1, Math.round(Number(p) || 44));
          closeSums[index] = (closeSums[index] ?? 0) + close;

          if (i >= period - 1) {
            const figKey = figures[index]?.key || `sma${index + 1}`;
            res[figKey] = closeSums[index] / period;
            closeSums[index] -= dataList[i - (period - 1)].close;
          }
        });

        return res;
      });
    },
  });

  // 2. Robust Exponential Moving Average (EMA) — overlaid directly over candles
  registerIndicator({
    name: 'EMA',
    shortName: 'EMA',
    series: 'price',
    calcParams: [20],
    precision: 2,
    shouldOhlc: true,
    figures: [{ key: 'ema', title: 'EMA: ', type: 'line' }],
    regenerateFigures: (params: number[]) => {
      return (params || [20]).map((p, i) => ({
        key: `ema${i + 1}`,
        title: `EMA${p}: `,
        type: 'line',
      }));
    },
    calc: (dataList: KLineData[], indicator: any) => {
      const rawParams: number[] = Array.isArray(indicator.calcParams) && indicator.calcParams.length > 0
        ? indicator.calcParams
        : [20];
      const figures = indicator.figures || [];
      const emaValues: number[] = [];
      const closeSums: number[] = [];

      return dataList.map((kLineData, i) => {
        const res: Record<string, number> = {};
        const close = kLineData.close;

        rawParams.forEach((p, index) => {
          const period = Math.max(1, Math.round(Number(p) || 20));
          closeSums[index] = (closeSums[index] ?? 0) + close;

          if (i >= period - 1) {
            if (emaValues[index] === undefined) {
              emaValues[index] = closeSums[index] / period;
            } else {
              const alpha = 2 / (period + 1);
              emaValues[index] = close * alpha + emaValues[index] * (1 - alpha);
            }
            const figKey = figures[index]?.key || `ema${index + 1}`;
            res[figKey] = emaValues[index];
          }
        });

        return res;
      });
    },
  });

  // 3. Overlaid Volume (VOL) — plotted directly OVER the bottom of the candlestick pane
  // Uses custom draw to prevent 10M+ volume numbers from compressing the price scale
  registerIndicator({
    name: 'VOL',
    shortName: 'VOL',
    series: 'normal',
    calcParams: [5, 10, 20],
    precision: 0,
    shouldFormatBigNumber: true,
    shouldOhlc: false,
    figures: [], // Empty figures so price Y-axis remains strictly scaled to candlestick prices
    calc: (dataList: KLineData[], indicator: any) => {
      const params = indicator.calcParams || [5, 10, 20];
      const volSums: number[] = [];

      return dataList.map((kLineData, i) => {
        const vol = kLineData.volume ?? 0;
        const res: Record<string, number> = { volume: vol };

        params.forEach((p: number, index: number) => {
          const period = Math.max(1, Math.round(Number(p) || 5));
          volSums[index] = (volSums[index] ?? 0) + vol;
          if (i >= period - 1) {
            res[`ma${index + 1}`] = volSums[index] / period;
            const pastVol = dataList[i - (period - 1)]?.volume ?? 0;
            volSums[index] -= pastVol;
          }
        });

        return res;
      });
    },
    draw: ({ ctx, chart, bounding, xAxis }: any) => {
      const dataList: KLineData[] = chart.getDataList() || [];
      const visibleRange = chart.getVisibleRange?.();
      if (!dataList.length || !visibleRange) return true;

      const from = Math.max(0, visibleRange.from);
      const to = Math.min(dataList.length, visibleRange.to);

      let maxVol = 0;
      for (let i = from; i < to; i++) {
        const v = dataList[i]?.volume || 0;
        if (v > maxVol) maxVol = v;
      }
      if (maxVol <= 0) return true;

      const barSpace = (chart as any).getChartStore?.().getBarSpace?.() || { bar: 6, gapBar: 5 };
      const maxBarHeight = Math.max(20, bounding.height * 0.18);
      const baseY = bounding.height;
      const barWidth = Math.max(1.5, (barSpace.gapBar || barSpace.bar - 2 || 4));

      for (let i = from; i < to; i++) {
        const k = dataList[i];
        if (!k) continue;

        const x = xAxis.convertToPixel(i);
        const kVol = k.volume ?? 0;
        const h = Math.max(1, (kVol / maxVol) * maxBarHeight);
        const isUp = k.close >= k.open;

        // Semi-transparent histogram over candlesticks
        ctx.fillStyle = isUp ? 'rgba(38, 166, 154, 0.32)' : 'rgba(239, 83, 80, 0.32)';
        ctx.fillRect(x - barWidth / 2, baseY - h, barWidth, h);
      }

      return true;
    },
  });

  // 4. Strategy Overlay: renders BUY signals, Target/SL lines, and Trade execution connectors
  registerIndicator({
    name: 'STRATEGY_OVERLAY',
    shortName: 'Strategy',
    series: 'price',
    calcParams: [],
    precision: 2,
    shouldOhlc: true,
    figures: [],
    calc: (dataList: KLineData[]) => {
      return dataList.map(() => ({}));
    },
    draw: ({ ctx, chart, bounding, xAxis, yAxis }: any) => {
      const state = useAppStore.getState();
      if (!state.showStrategyOverlay) return false;
      const backtestResult = state.backtestResult;
      if (!backtestResult) return false;

      const dataList: KLineData[] = chart.getDataList() || [];
      if (!dataList.length) return false;

      const visibleRange = chart.getVisibleRange?.();
      if (!visibleRange) return false;

      const from = Math.max(0, visibleRange.from - 2);
      const to = Math.min(dataList.length - 1, visibleRange.to + 2);
      const fromTime = dataList[from]?.timestamp ?? 0;
      const toTime = dataList[to]?.timestamp ?? Infinity;

      const signals = backtestResult.signals || [];
      const trades = backtestResult.trades || [];
      const inspectedSignalId = state.inspectedSignalId;
      const inspectedTradeId = state.inspectedTradeId;

      const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(x, y, w, h, r);
        } else {
          ctx.rect(x, y, w, h);
        }
      };

      // 1. Draw trade execution paths (Entry to Exit)
      for (const trade of trades) {
        if (trade.entryTime > toTime || trade.exitTime < fromTime) continue;

        let entryIdx = -1;
        let exitIdx = -1;
        for (let i = from; i <= to; i++) {
          if (dataList[i]?.timestamp === trade.entryTime) entryIdx = i;
          if (dataList[i]?.timestamp === trade.exitTime) exitIdx = i;
        }
        if (entryIdx < 0) {
          entryIdx = dataList.findIndex((k) => k.timestamp === trade.entryTime);
        }
        if (exitIdx < 0) {
          exitIdx = dataList.findIndex((k) => k.timestamp === trade.exitTime);
        }

        if (entryIdx < 0 || exitIdx < 0) continue;

        const xEntry = xAxis.convertToPixel(entryIdx);
        const yEntry = yAxis.convertToPixel(trade.entryPrice);
        const xExit = xAxis.convertToPixel(exitIdx);
        const yExit = yAxis.convertToPixel(trade.exitPrice);

        const isWin = trade.pnl >= 0;
        const isInspected = inspectedTradeId === trade.id;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isWin ? 'rgba(38, 166, 154, 0.75)' : 'rgba(239, 83, 80, 0.75)';
        ctx.lineWidth = isInspected ? 2.5 : 1.5;
        ctx.moveTo(xEntry, yEntry);
        ctx.lineTo(xExit, yExit);
        ctx.stroke();

        // Exit marker dot
        ctx.setLineDash([]);
        ctx.fillStyle = isWin ? '#26A69A' : '#EF5350';
        ctx.beginPath();
        ctx.arc(xExit, yExit, isInspected ? 5 : 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Exit PnL Pill Badge
        const sign = trade.pnlPct >= 0 ? '+' : '';
        const text = `${sign}${trade.pnlPct.toFixed(1)}%`;
        ctx.font = 'bold 9px monospace';
        const tw = ctx.measureText(text).width;
        const badgeW = tw + 8;
        const badgeH = 15;
        const badgeX = xExit - badgeW / 2;
        const badgeY = isWin ? yExit - badgeH - 3 : yExit + 5;

        ctx.fillStyle = isWin ? '#132B25' : '#311A1B';
        ctx.strokeStyle = isWin ? '#26A69A' : '#EF5350';
        ctx.lineWidth = 1;
        ctx.beginPath();
        drawRoundRect(badgeX, badgeY, badgeW, badgeH, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isWin ? '#26A69A' : '#EF5350';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, xExit, badgeY + badgeH / 2);

        ctx.restore();
      }

      // 2. Draw Buy Strategy Signals
      for (let sIdx = 0; sIdx < signals.length; sIdx++) {
        const sig = signals[sIdx];
        if (sig.time < fromTime || sig.time > toTime) continue;

        let idx = -1;
        for (let i = from; i <= to; i++) {
          if (dataList[i]?.timestamp === sig.time) {
            idx = i;
            break;
          }
        }
        if (idx < 0) {
          idx = dataList.findIndex((k) => k.timestamp === sig.time);
        }
        if (idx < 0) continue;

        const candle = dataList[idx];
        const x = xAxis.convertToPixel(idx);
        const yLow = yAxis.convertToPixel(candle.low);
        const isInspected = inspectedSignalId === sig.id;
        const isLatest = sIdx === signals.length - 1;

        ctx.save();

        // Upward chevron pointing to candle low
        const arrowY = yLow + 6;
        ctx.fillStyle = '#26A69A';
        ctx.beginPath();
        ctx.moveTo(x, arrowY);
        ctx.lineTo(x - 5, arrowY + 7);
        ctx.lineTo(x + 5, arrowY + 7);
        ctx.closePath();
        ctx.fill();

        // Buy badge
        const priceLabel = sig.price >= 1000 ? sig.price.toFixed(0) : sig.price.toFixed(1);
        const badgeText = `▲ BUY ₹${priceLabel}`;
        ctx.font = 'bold 9px monospace';
        const bw = ctx.measureText(badgeText).width + 8;
        const bh = 16;
        const bx = x - bw / 2;
        const by = arrowY + 8;

        ctx.fillStyle = isInspected ? '#1D453B' : '#132B25';
        ctx.strokeStyle = isInspected ? '#F0B90B' : '#26A69A';
        ctx.lineWidth = isInspected ? 2 : 1;
        ctx.beginPath();
        drawRoundRect(bx, by, bw, bh, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isInspected ? '#F0B90B' : '#26A69A';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, x, by + bh / 2);

        // For inspected or latest active setup: draw dashed Target 1 and Stop Loss projection lines
        if (isInspected || isLatest) {
          const yTarget = yAxis.convertToPixel(sig.target1);
          const ySL = yAxis.convertToPixel(sig.stopLoss);
          const rightLimit = bounding.width - 70;

          // Target line
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(38, 166, 154, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.moveTo(x, yTarget);
          ctx.lineTo(rightLimit, yTarget);
          ctx.stroke();

          // Target badge
          ctx.setLineDash([]);
          ctx.fillStyle = '#132B25';
          ctx.strokeStyle = '#26A69A';
          ctx.lineWidth = 1;
          ctx.beginPath();
          drawRoundRect(rightLimit - 60, yTarget - 8, 65, 16, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#26A69A';
          ctx.font = 'bold 8.5px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`T1 ₹${sig.target1.toFixed(1)}`, rightLimit - 27, yTarget);

          // Stop Loss line
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(239, 83, 80, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.moveTo(x, ySL);
          ctx.lineTo(rightLimit, ySL);
          ctx.stroke();

          // SL badge
          ctx.setLineDash([]);
          ctx.fillStyle = '#311A1B';
          ctx.strokeStyle = '#EF5350';
          ctx.lineWidth = 1;
          ctx.beginPath();
          drawRoundRect(rightLimit - 60, ySL - 8, 65, 16, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#EF5350';
          ctx.font = 'bold 8.5px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`SL ₹${sig.stopLoss.toFixed(1)}`, rightLimit - 27, ySL);
        }

        ctx.restore();
      }

      return false;
    },
  });
}
