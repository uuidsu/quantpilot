import type { StockTrade, SymbolMeta, Position } from "./types";

// Use a minimal interface so both DB types and API types work
interface HoldingLike {
  shares: number;
  currentPrice: number;
  costBasis: number;
  beta: number | null;
}

type Holding = HoldingLike;

// ── Compute Positions from Stock Trades ──

/**
 * 從股票交易事件計算當前持倉。
 * shares = Σ BUY qty - Σ SELL qty（加權平均成本法）
 * currentPrice / beta 從 symbolMeta 取，無則用成本價 / 1.0
 */
export function computePositions(
  stockTrades: StockTrade[],
  symbolMetas: SymbolMeta[]
): Position[] {
  const metaMap = new Map(symbolMetas.map(m => [m.symbol, m]));
  const symbolTradesMap = new Map<string, StockTrade[]>();

  for (const t of stockTrades) {
    const arr = symbolTradesMap.get(t.symbol) ?? [];
    arr.push(t);
    symbolTradesMap.set(t.symbol, arr);
  }

  const positions: Position[] = [];

  for (const [symbol, trades] of symbolTradesMap) {
    const sorted = [...trades].sort((a, b) => {
      const d = a.tradeDate.localeCompare(b.tradeDate);
      return d !== 0 ? d : (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    });

    let shares = 0;
    let totalCost = 0;

    for (const t of sorted) {
      if (t.action === "BUY") {
        totalCost += t.price * t.quantity;
        shares += t.quantity;
      } else if (t.action === "SELL") {
        if (shares > 0) {
          const avgCost = totalCost / shares;
          shares = Math.max(shares - t.quantity, 0);
          totalCost = avgCost * shares;
        }
      }
    }

    if (shares <= 0) continue;

    const costBasis = totalCost / shares;
    const meta = metaMap.get(symbol);

    positions.push({
      symbol,
      shares,
      currentPrice: meta?.currentPrice && meta.currentPrice > 0 ? meta.currentPrice : costBasis,
      costBasis,
      beta: meta?.beta ?? 1.0,
      priceUpdatedAt: meta?.priceUpdatedAt ?? null,
    });
  }

  return positions;
}

// ── Portfolio Metrics ──

export interface PortfolioMetrics {
  totalCost: number;
  totalCurrentValue: number;
  totalAdjustedStockValue: number;
  totalAdjustedValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}

/**
 * Compute core portfolio metrics.
 * `marketAdjustPercent` is the simulated market change in percent (e.g. 5 = +5%).
 * When `perBetaAdjust` is true, each holding is adjusted by its own beta × marketAdjust
 * (Web behaviour). When false, a uniform multiplier is used (legacy Mobile behaviour).
 */
export function computePortfolioMetrics(
  holdings: Holding[],
  cash: number,
  marketAdjustPercent: number,
  perBetaAdjust = true
): PortfolioMetrics {
  const totalCost = holdings.reduce((s, h) => s + h.shares * h.costBasis, 0);
  const totalCurrentValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice, 0);

  const totalAdjustedStockValue = perBetaAdjust
    ? holdings.reduce(
        (s, h) => s + h.shares * h.currentPrice * (1 + (marketAdjustPercent / 100) * (h.beta ?? 1.0)),
        0
      )
    : totalCurrentValue * (1 + marketAdjustPercent / 100);

  const totalAdjustedValue = totalAdjustedStockValue + cash;
  const totalPnL = totalAdjustedValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return { totalCost, totalCurrentValue, totalAdjustedStockValue, totalAdjustedValue, totalPnL, totalPnLPercent };
}

// ── Leverage ──

export interface LeverageResult {
  portfolioLeverage: number;
  leveragePercent: number;
  isOverLeverage: boolean;
  isInfiniteOrNegative: boolean;
  effectiveLeverageLimit: number;
}

export function computeLeverage(
  totalAdjustedStockValue: number,
  totalAdjustedValue: number,
  totalCurrentValue: number,
  leverageLimitRatio: number,
  leverageCap: number | null
): LeverageResult {
  const maxStockByRatio = leverageLimitRatio * totalAdjustedValue;
  const maxStock = leverageCap != null ? Math.min(maxStockByRatio, leverageCap) : maxStockByRatio;
  const effectiveLeverageLimit = totalAdjustedValue > 0 ? maxStock / totalAdjustedValue : leverageLimitRatio;

  const portfolioLeverage =
    totalAdjustedValue > 0
      ? totalAdjustedStockValue / totalAdjustedValue
      : totalCurrentValue > 0
        ? Infinity
        : 0;

  const leveragePercent = Math.min(portfolioLeverage / Math.max(effectiveLeverageLimit, 0.01) * 100, 200);
  const isOverLeverage = portfolioLeverage > effectiveLeverageLimit && portfolioLeverage !== Infinity;
  const isInfiniteOrNegative = totalAdjustedValue <= 0 && totalCurrentValue > 0;

  return { portfolioLeverage, leveragePercent, isOverLeverage, isInfiniteOrNegative, effectiveLeverageLimit };
}

// ── Exposure ──

export interface ExposureResult {
  betaWeightedExposure: number;
  isBetaOverLimit: boolean;
  totalBetaValue: number;
  avgBeta: number;
  targetBetaValue: number;
  betaGapValue: number;
  maxBuyByLeverage: number;
  highBetaHoldings: Holding[];
  lowBetaHoldings: Holding[];
  highBetaMV: number;
  lowBetaMV: number;
  avgHighBeta: number;
  avgLowBeta: number;
  betaSpread: number;
}

export function computeExposure(
  holdings: Holding[],
  totalAdjustedValue: number,
  totalAdjustedStockValue: number,
  totalCurrentValue: number,
  marketAdjustPercent: number,
  exposureTarget: number,
  leverageLimit: number
): ExposureResult {
  const hMult = (h: Holding) => 1 + (marketAdjustPercent / 100) * (h.beta ?? 1.0);

  const betaWeightedExposure =
    totalAdjustedValue > 0
      ? holdings.reduce((s, h) => s + h.shares * h.currentPrice * hMult(h) * (h.beta ?? 1.0), 0) / totalAdjustedValue
      : holdings.length > 0
        ? Infinity
        : 0;
  const isBetaOverLimit = betaWeightedExposure > leverageLimit && betaWeightedExposure !== Infinity;

  const totalBetaValue = holdings.reduce((s, h) => s + h.shares * h.currentPrice * hMult(h) * (h.beta ?? 1.0), 0);
  const avgBeta =
    totalCurrentValue > 0
      ? holdings.reduce((s, h) => s + (h.shares * h.currentPrice / totalCurrentValue) * (h.beta ?? 1.0), 0)
      : 1.0;
  const targetBetaValue = exposureTarget * totalAdjustedValue;
  const betaGapValue = targetBetaValue - totalBetaValue;
  const maxBuyByLeverage = leverageLimit * totalAdjustedValue - totalAdjustedStockValue;

  const highBetaHoldings = holdings.filter((h) => (h.beta ?? 1.0) > avgBeta);
  const lowBetaHoldings = holdings.filter((h) => (h.beta ?? 1.0) <= avgBeta);
  const highBetaMV = highBetaHoldings.reduce((s, h) => s + h.shares * h.currentPrice * hMult(h), 0);
  const lowBetaMV = lowBetaHoldings.reduce((s, h) => s + h.shares * h.currentPrice * hMult(h), 0);
  const avgHighBeta =
    highBetaMV > 0
      ? highBetaHoldings.reduce((s, h) => s + h.shares * h.currentPrice * hMult(h) * (h.beta ?? 1.0), 0) / highBetaMV
      : avgBeta;
  const avgLowBeta =
    lowBetaMV > 0
      ? lowBetaHoldings.reduce((s, h) => s + h.shares * h.currentPrice * hMult(h) * (h.beta ?? 1.0), 0) / lowBetaMV
      : avgBeta;
  const betaSpread = avgHighBeta - avgLowBeta;

  return {
    betaWeightedExposure, isBetaOverLimit, totalBetaValue, avgBeta,
    targetBetaValue, betaGapValue, maxBuyByLeverage,
    highBetaHoldings, lowBetaHoldings, highBetaMV, lowBetaMV,
    avgHighBeta, avgLowBeta, betaSpread,
  };
}

// ── Rebalancing ──

export interface RebalancingResult {
  buyAmount: number;
  sellAmount: number;
  swapAmount: number;
  isMixedMode: boolean;
  isLeverageCapped: boolean;
  isLeverageForced: boolean;
  isOnTarget: boolean;
  projectedBetaDelta: number;
  projectedBetaExposure: number;
}

export function computeRebalancing(params: {
  betaGapValue: number;
  avgBeta: number;
  maxBuyByLeverage: number;
  totalAdjustedValue: number;
  totalAdjustedStockValue: number;
  leverageLimit: number;
  highBetaHoldings: Holding[];
  lowBetaHoldings: Holding[];
  highBetaMV: number;
  lowBetaMV: number;
  betaSpread: number;
  totalBetaValue: number;
}): RebalancingResult {
  const {
    betaGapValue, avgBeta, maxBuyByLeverage, totalAdjustedValue,
    totalAdjustedStockValue, leverageLimit,
    highBetaHoldings, lowBetaHoldings, lowBetaMV, betaSpread, totalBetaValue,
  } = params;

  let buyAmount = 0;
  let sellAmount = 0;
  let swapAmount = 0;
  let isMixedMode = false;
  let isLeverageCapped = false;
  let isLeverageForced = false;

  const minSellByLeverage = Math.max(0, totalAdjustedStockValue - leverageLimit * totalAdjustedValue);

  if (betaGapValue > 0 && avgBeta > 0 && minSellByLeverage <= 0) {
    const rawBuyNeeded = betaGapValue / avgBeta;
    buyAmount = Math.min(rawBuyNeeded, Math.max(maxBuyByLeverage, 0));
    isLeverageCapped = buyAmount < rawBuyNeeded;

    const betaFilledByBuy = buyAmount * avgBeta;
    const remainingBetaGap = betaGapValue - betaFilledByBuy;

    if (
      isLeverageCapped &&
      remainingBetaGap > totalAdjustedValue * 0.005 &&
      betaSpread > 0.01 &&
      highBetaHoldings.length > 0 &&
      lowBetaHoldings.length > 0
    ) {
      isMixedMode = true;
      const rawSwap = remainingBetaGap / betaSpread;
      swapAmount = Math.min(rawSwap, lowBetaMV);
    }
  } else if (minSellByLeverage > 0) {
    const sellByExposure = betaGapValue < 0 && avgBeta > 0 ? Math.abs(betaGapValue / avgBeta) : 0;
    sellAmount = Math.max(minSellByLeverage, sellByExposure);
    isLeverageForced = sellAmount >= minSellByLeverage && minSellByLeverage > 0;
  } else if (betaGapValue < 0 && avgBeta > 0) {
    sellAmount = Math.abs(betaGapValue / avgBeta);
  }

  const isOnTarget =
    sellAmount < totalAdjustedValue * 0.01 &&
    buyAmount < totalAdjustedValue * 0.01 &&
    swapAmount < totalAdjustedValue * 0.01;

  const projectedBetaDelta = buyAmount * avgBeta + swapAmount * betaSpread - sellAmount * avgBeta;
  const projectedBetaExposure =
    totalAdjustedValue > 0 ? (totalBetaValue + projectedBetaDelta) / totalAdjustedValue : 0;

  return {
    buyAmount, sellAmount, swapAmount, isMixedMode,
    isLeverageCapped, isLeverageForced, isOnTarget,
    projectedBetaDelta, projectedBetaExposure,
  };
}

// ── Per-Holding Recommendations ──

export interface HoldingRecommendation {
  holdingTradeAmount: number;
  suggestedSharesDelta: number;
}

export function computeHoldingRecommendations<T extends HoldingLike>(
  holdings: T[],
  marketAdjustPercent: number,
  rebalance: RebalancingResult,
  exposure: ExposureResult
): (T & HoldingRecommendation)[] {
  const { buyAmount, sellAmount, swapAmount } = rebalance;
  const { betaGapValue, totalBetaValue, avgBeta, highBetaMV, lowBetaMV } = exposure;
  const hMult = (h: Holding) => 1 + (marketAdjustPercent / 100) * (h.beta ?? 1.0);

  return holdings.map((h) => {
    const beta = h.beta ?? 1.0;
    const mv = h.shares * h.currentPrice * hMult(h);
    let holdingTradeAmount = 0;

    if (betaGapValue > 0) {
      if (buyAmount > 0 && totalBetaValue > 0) {
        const bw = (mv * beta) / totalBetaValue;
        holdingTradeAmount += buyAmount * bw;
      }
      if (swapAmount > 0) {
        if (beta > avgBeta && highBetaMV > 0) {
          holdingTradeAmount += swapAmount * (mv / highBetaMV);
        } else if (beta <= avgBeta && lowBetaMV > 0) {
          holdingTradeAmount -= swapAmount * (mv / lowBetaMV);
        }
      }
    } else if (betaGapValue < 0) {
      if (totalBetaValue > 0) {
        const bw = (mv * beta) / totalBetaValue;
        holdingTradeAmount = -sellAmount * bw;
      }
    }

    const suggestedSharesDelta = h.currentPrice > 0 ? holdingTradeAmount / h.currentPrice : 0;
    return { ...h, holdingTradeAmount, suggestedSharesDelta };
  });
}
