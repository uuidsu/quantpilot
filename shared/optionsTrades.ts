import type { OptionsTrade, OptionsHolding, OptionsPnlSummary, OptionsPnlPoint } from "./types";

const TXO_MULTIPLIER = 50; // 台指選擇權每點 50 元

function holdingKey(t: { contractId: string; contractMonth: string; callPut: string; strikePrice: number }) {
  return `${t.contractId}|${t.contractMonth}|${t.callPut}|${t.strikePrice}`;
}

export function computeHoldings(
  trades: OptionsTrade[],
  currentPriceMap?: Map<string, number>
): OptionsHolding[] {
  const map = new Map<string, { qty: number; totalCost: number; contractId: string; contractMonth: string; callPut: string; strikePrice: number }>();

  // Sort by date asc so FIFO cost tracking is correct
  const sorted = [...trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.id - b.id);

  for (const t of sorted) {
    const key = holdingKey(t);
    const h = map.get(key) ?? { qty: 0, totalCost: 0, contractId: t.contractId, contractMonth: t.contractMonth, callPut: t.callPut, strikePrice: t.strikePrice };

    if (t.action === "BUY") {
      h.totalCost += t.price * t.quantity * TXO_MULTIPLIER;
      h.qty += t.quantity;
    } else {
      // SELL — reduce position
      if (h.qty > 0) {
        const avgCost = h.totalCost / h.qty;
        const sellQty = Math.min(t.quantity, h.qty);
        h.totalCost -= avgCost * sellQty;
        h.qty -= sellQty;
      } else {
        // Short selling
        h.totalCost -= t.price * t.quantity * TXO_MULTIPLIER;
        h.qty -= t.quantity;
      }
    }
    map.set(key, h);
  }

  const result: OptionsHolding[] = [];
  for (const [key, h] of map) {
    if (h.qty === 0) continue;
    const avgCost = h.qty !== 0 ? Math.abs(h.totalCost / h.qty) / TXO_MULTIPLIER : 0;
    const cp = currentPriceMap?.get(key) ?? null;
    const unrealizedPnl = cp != null ? (cp - avgCost) * h.qty * TXO_MULTIPLIER : null;
    result.push({
      contractId: h.contractId,
      contractMonth: h.contractMonth,
      callPut: h.callPut,
      strikePrice: h.strikePrice,
      netQuantity: h.qty,
      avgCost,
      totalCost: Math.abs(h.totalCost),
      currentPrice: cp,
      unrealizedPnl,
    });
  }
  return result;
}

export function computePnlSummary(
  trades: OptionsTrade[],
  currentPriceMap?: Map<string, number>
): OptionsPnlSummary {
  let realizedPnl = 0;
  let totalFees = 0;

  // Track avg cost per position for realized P&L
  const costMap = new Map<string, { qty: number; totalCost: number }>();
  const sorted = [...trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.id - b.id);

  for (const t of sorted) {
    totalFees += t.fee;
    const key = holdingKey(t);
    const h = costMap.get(key) ?? { qty: 0, totalCost: 0 };

    if (t.action === "BUY") {
      h.totalCost += t.price * t.quantity * TXO_MULTIPLIER;
      h.qty += t.quantity;
    } else {
      if (h.qty > 0) {
        const avgCostPerContract = h.totalCost / h.qty;
        const sellQty = Math.min(t.quantity, h.qty);
        realizedPnl += (t.price * TXO_MULTIPLIER - avgCostPerContract) * sellQty;
        h.totalCost -= avgCostPerContract * sellQty;
        h.qty -= sellQty;
      }
    }
    costMap.set(key, h);
  }

  const holdings = computeHoldings(trades, currentPriceMap);
  const unrealizedPnl = holdings.reduce((s, h) => s + (h.unrealizedPnl ?? 0), 0);

  return {
    realizedPnl,
    unrealizedPnl,
    totalPnl: realizedPnl + unrealizedPnl - totalFees,
    totalFees,
  };
}

/**
 * @param dailyPriceMap  tradeDate (YYYYMMDD) → holdingKey → closePrice
 *                       每天用那天的收盤價算未實現損益
 */
export function computePnlHistory(
  trades: OptionsTrade[],
  days: number = 45,
  dailyPriceMap?: Record<string, Record<string, number>>
): OptionsPnlPoint[] {
  const now = new Date();
  const points: OptionsPnlPoint[] = [];

  // 預先把每個可用日期的 priceMap 轉成 Map，找不到就用最近一天的
  const availableDates = dailyPriceMap ? Object.keys(dailyPriceMap).sort() : [];

  function getPriceMapForDate(dateStr: string): Map<string, number> | undefined {
    if (!dailyPriceMap || availableDates.length === 0) return undefined;
    // 找 <= dateStr 的最近一天
    let best: string | undefined;
    for (const d of availableDates) {
      if (d <= dateStr) best = d;
      else break;
    }
    if (!best) return undefined;
    const obj = dailyPriceMap[best];
    const map = new Map<string, number>();
    for (const [k, v] of Object.entries(obj)) {
      map.set(k, v);
    }
    return map;
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");

    const tradesUpToDate = trades.filter((t) => t.tradeDate <= dateStr);
    const priceMapForDay = getPriceMapForDate(dateStr);
    const pnl = computePnlSummary(tradesUpToDate, priceMapForDay);

    points.push({
      date: `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`,
      realizedPnl: pnl.realizedPnl,
      unrealizedPnl: pnl.unrealizedPnl,
      totalPnl: pnl.totalPnl,
    });
  }

  return points;
}

export { TXO_MULTIPLIER, holdingKey };
