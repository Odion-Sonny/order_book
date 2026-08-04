import type { MarketContext } from './analysis';
import { rsiLabel, trendLabel } from './analysis';
import { compact, price as fmtPrice, pct } from './format';

/**
 * Deterministic trading coach.
 *
 * Every sentence is derived from the bars and quote the terminal already holds
 * — there is no model call and nothing is invented. It reads the same numbers
 * the Analysis tab shows and turns them into the running commentary a desk
 * mentor would give.
 */

export interface CoachInput extends MarketContext {
  bid?: number;
  ask?: number;
  changePercent?: number;
}

const TIPS = [
  'Risk only 1–2% of capital on a single trade. Size from stop distance, not conviction.',
  'Wait for confluence: trend + momentum + level. One signal alone is noise.',
  'Define invalidation before entry. If price hits it, exit without renegotiating.',
  'Volume confirms breakouts — thin breakouts fail more often than they hold.',
  'In strong trends buy pullbacks to VWAP or a rising MA instead of chasing extensions.',
  'After a loss, reset before re-entering. Revenge trades are the expensive ones.',
  'Backtest across regimes (bull, bear, chop). Curve-fit strategies die live.',
  'Spread and slippage decide whether a mean-reversion edge survives contact.',
];

/** `$123.45`, or `n/a` when the window was too short to compute the value. */
const dollars = (value: number | null | undefined): string =>
  value === null || value === undefined ? 'n/a' : `$${fmtPrice(value)}`;

const decimal = (value: number | null | undefined, digits = 3): string =>
  value === null || value === undefined ? 'n/a' : value.toFixed(digits);

export function analyzeMarket(ctx: CoachInput): string {
  const s = ctx.snapshot;
  const structure = trendLabel(s);
  const lines: string[] = [];

  lines.push(
    `**${ctx.symbol}** last traded at **${dollars(s.price)}**` +
      (ctx.changePercent !== undefined ? ` (${pct(ctx.changePercent)} on the session)` : '') +
      ` — reading ${ctx.bars} ${ctx.timeframe} bars.`,
  );

  lines.push(
    `Structure looks like a **${structure}**. Price is ${
      s.sma20 === null ? 'without an SMA 20 on this window' : s.price >= s.sma20 ? 'above' : 'below'
    } SMA 20 (${dollars(s.sma20)}), SMA 50 ${dollars(s.sma50)}, SMA 200 ${dollars(s.sma200)}.`,
  );

  lines.push(
    s.rsi === null
      ? 'Momentum: not enough bars loaded for RSI(14).'
      : `Momentum: RSI **${s.rsi.toFixed(1)}** (${rsiLabel(s.rsi)}). MACD histogram is **${
          (s.macdHist ?? 0) >= 0 ? 'positive' : 'negative'
        }** (${decimal(s.macdHist)}).`,
  );

  lines.push(
    `Bollinger position ~**${
      s.bbPosition === null ? 'n/a' : `${(s.bbPosition * 100).toFixed(0)}%`
    }** of the channel (0% = lower band, 100% = upper). ATR(14) ${dollars(
      s.atr,
    )} — use it to place stops beyond noise.`,
  );

  lines.push(
    `Volume on the last bar is **${ctx.volume.ratio.toFixed(2)}×** the window average (${compact(
      ctx.volume.last,
    )} vs ${compact(ctx.volume.average)}). Last 5 bars: **${ctx.recent.up}** up / **${
      ctx.recent.down
    }** down.`,
  );

  const rangeLabel = ctx.session ? 'Session range' : 'Loaded range';
  const range = ctx.session ?? ctx.window;
  lines.push(
    `${rangeLabel}: ${dollars(range.low)} — ${dollars(range.high)}, price sits at **${(
      range.position * 100
    ).toFixed(0)}%** of it.`,
  );

  lines.push(`**Bias:** ${biasFor(ctx)}`);
  lines.push(`💡 *Coach tip:* ${TIPS[Math.floor(Math.random() * TIPS.length)]}`);

  return lines.join('\n\n');
}

/** The one judgement call: structure + momentum + band position into a plan. */
function biasFor(ctx: CoachInput): string {
  const s = ctx.snapshot;
  const structure = trendLabel(s);
  const rsi = s.rsi;
  const bb = s.bbPosition;

  if (rsi === null) {
    return 'Insufficient — load more history before reading momentum into this chart.';
  }
  if (structure.includes('uptrend') && rsi < 65 && s.vwap !== null && s.price > s.vwap) {
    return `Bullish lean. Look for pullbacks toward VWAP (${dollars(
      s.vwap,
    )}) or SMA 20 while RSI holds above 40. Invalidation below SMA 50 (${dollars(s.sma50)}).`;
  }
  if (structure.includes('downtrend') && rsi > 35 && s.vwap !== null && s.price < s.vwap) {
    return `Bearish lean. Rallies into VWAP (${dollars(
      s.vwap,
    )}) or SMA 20 are the supply zones. Stop above the recent swing high or SMA 50.`;
  }
  if (rsi <= 30 && bb !== null && bb < 0.15) {
    return `Mean-reversion long watch. Oversold at the lower band — wait for a VWAP reclaim or a bullish engulfing bar before sizing in.`;
  }
  if (rsi >= 70 && bb !== null && bb > 0.85) {
    return `Extended. Prefer scaling out or waiting for a pullback; trail stops if you stay long.`;
  }
  return `Neutral — trade the band between ${dollars(s.bbLower)} and ${dollars(
    s.bbUpper,
  )} until a band walk develops.`;
}

export function answerQuestion(question: string, ctx: CoachInput): string {
  const q = question.toLowerCase();
  const s = ctx.snapshot;

  if (/\b(rsi|momentum)\b/.test(q)) {
    if (s.rsi === null) return `RSI(14) needs more bars than the ${ctx.bars} currently loaded.`;
    return (
      `RSI(14) on **${ctx.symbol}** is **${s.rsi.toFixed(1)}** — ${rsiLabel(s.rsi)}.\n\n` +
      `• <30 oversold — bounce risk rises, but downtrends can stay oversold for weeks.\n` +
      `• >70 overbought — take-profit / trailing-stop territory inside uptrends.\n` +
      `• Divergence (price makes a new high, RSI does not) often precedes reversals.\n\n` +
      `MACD histogram is ${decimal(s.macdHist)}, so momentum currently **${
        (s.macdHist ?? 0) >= 0 ? 'supports longs' : 'argues for caution on longs'
      }**.`
    );
  }

  if (/\bmacd\b/.test(q)) {
    return (
      `MACD line **${decimal(s.macd)}**, signal **${decimal(s.macdSignal)}**, histogram **${decimal(
        s.macdHist,
      )}**.\n\n` +
      `${
        s.macd !== null && s.macdSignal !== null && s.macd > s.macdSignal
          ? 'MACD is above its signal — bullish cross state.'
          : 'MACD is below its signal — bearish cross state.'
      } Histogram ${
        (s.macdHist ?? 0) >= 0
          ? 'expanding above zero favours continuation.'
          : 'below zero favours downside or consolidation.'
      }`
    );
  }

  if (/\b(trend|sma|ema|moving average|ma)\b/.test(q)) {
    return (
      `Structure on ${ctx.timeframe}: **${trendLabel(s)}**.\n\n` +
      `Stack: SMA 20 ${dollars(s.sma20)} · SMA 50 ${dollars(s.sma50)} · SMA 200 ${dollars(
        s.sma200,
      )} · VWAP ${dollars(s.vwap)}.\n\n` +
      (s.sma200 === null
        ? 'The 200 needs 200 bars — widen the range to get your regime filter.'
        : `Price is ${
            s.price > s.sma200 ? 'above' : 'below'
          } the 200 — that is the primary regime filter.`)
    );
  }

  if (/\b(volume|liquidity|participation)\b/.test(q)) {
    return (
      `Last bar traded **${compact(ctx.volume.last)}** against a window average of **${compact(
        ctx.volume.average,
      )}** — **${ctx.volume.ratio.toFixed(2)}×**.\n\n` +
      `Above 1.5× on a breakout is confirmation; below 0.7× on a breakout is a fade candidate. ` +
      `Volume tells you whether the move has participants behind it.`
    );
  }

  if (/\b(order book|depth|bid|ask|spread)\b/.test(q)) {
    const spread = ctx.bid !== undefined && ctx.ask !== undefined ? ctx.ask - ctx.bid : null;
    return (
      `The order book panel shows resting **bids** and **asks** with cumulative depth.\n\n` +
      `• **Spread** = best ask − best bid. Tighter spread, cheaper round trip.\n` +
      `• Large resting size acts as short-term support or resistance — until it is pulled.\n` +
      `• Confirm book levels against the tape in Time & Sales; displayed size can vanish.\n\n` +
      `**${ctx.symbol}**: bid ${dollars(ctx.bid ?? null)} / ask ${dollars(ctx.ask ?? null)}` +
      (spread !== null ? ` · spread ${dollars(spread)}` : '') +
      '.'
    );
  }

  if (/\b(risk|stop|position size|sizing|money management)\b/.test(q)) {
    const stop = s.atr !== null ? s.price - 2 * s.atr : null;
    return (
      `Risk framework for **${ctx.symbol}**:\n\n` +
      `• ATR(14) ≈ **${dollars(s.atr)}** — stops usually sit 1.5–2× ATR from entry.\n` +
      `• A 2× ATR long stop from here is **${dollars(stop)}**.\n` +
      `• Position size = (account × risk%) ÷ (entry − stop).\n` +
      `• $100k account, 1% risk, $2 stop → 500 shares maximum.\n\n` +
      `Never widen a stop after entry. Journal every rule you break.`
    );
  }

  if (/\b(backtest|strategy|python|script|on_data)\b/.test(q)) {
    return (
      `Strategies run server-side in the **Python Editor** tab, against real historical bars.\n\n` +
      `Entry point:\n` +
      '`on_data(data, cash, positions, buy, sell)`\n\n' +
      `• \`data\` — pandas DataFrame up to the current bar (timestamp, symbol, open, high, low, close, volume)\n` +
      `• \`cash\` — uninvested cash · \`positions\` — {symbol: quantity}\n` +
      `• \`buy(symbol, qty)\` / \`sell(symbol, qty)\` — fills at that bar's close\n\n` +
      `It executes under RestrictedPython, so imports and file access are unavailable.\n\n` +
      `Robustness checklist:\n` +
      `1. Few parameters — every extra knob is a chance to curve-fit.\n` +
      `2. Gate mean-reversion longs behind a trend filter.\n` +
      `3. Read Sharpe, max drawdown and profit factor together, never return alone.\n` +
      `4. Walk forward: tune on one window, validate on the next.`
    );
  }

  if (/\b(help|what can you|how do|teach|learn)\b/.test(q)) {
    return (
      `I read the bars this terminal has loaded and explain what they say. I can:\n\n` +
      `• Break down structure, RSI, MACD, moving averages, Bollinger and VWAP for **${ctx.symbol}**\n` +
      `• Turn ATR into stop distance and position size\n` +
      `• Explain the order book, the tape, and how the backtester runs your \`on_data\`\n\n` +
      `Try "Analyze this chart", "Is RSI overbought?", "Help me size risk", or "Backtest strategy tips".`
    );
  }

  if (/\b(buy|sell|long|short|should i|entry|exit)\b/.test(q)) {
    return (
      analyzeMarket(ctx) +
      `\n\n⚠️ Educational analysis of loaded market data — not financial advice. Size the risk first.`
    );
  }

  return analyzeMarket(ctx);
}
