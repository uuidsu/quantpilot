import type { OptionsTrade, StockTrade, Loan, LoanPayment, UnifiedTrade, Position, CashEvent } from "./types";
import { cashActionLabel, CASH_ACTIONS } from "./types";
import { generateLoanTrades } from "./loan";
import { todayTW } from "./dateUtils";

const TXO_MULTIPLIER = 50; // 台指選擇權每點 50 元

/**
 * 從計算持倉產生市值損益事件（非現金，代表股價漲跌的未實現損益）
 */
export function generatePositionMarketValueTrade(position: Position): UnifiedTrade {
  const perSharePnl = position.currentPrice - position.costBasis;
  const totalPnl = perSharePnl * position.shares;
  const dateStr = position.priceUpdatedAt
    ? position.priceUpdatedAt.replace(/-/g, "").slice(0, 8)
    : todayTW();
  return {
    id: `mv-${position.symbol}`,
    type: "market_value",
    tradeDate: dateStr,
    action: totalPnl >= 0 ? "MARKET_GAIN" : "MARKET_LOSS",
    description: position.symbol,
    price: perSharePnl,
    quantity: position.shares,
    fee: 0,
    notes: `市值 $${Math.round(position.currentPrice * position.shares).toLocaleString()}，成本 $${Math.round(position.costBasis * position.shares).toLocaleString()}`,
    raw: null,
  };
}

/**
 * 已實現交易不變量檢查：所有已實現事件的現金加總 + simCash 必須為 0。
 * MARKET_GAIN/MARKET_LOSS 屬於未實現，不列入此檢查。
 * 若違反不變量，console.error 提示（不 throw，避免影響 UI）。
 */
export function assertCashZeroSum(
  explainedFlow: number,
  simCash: number,
  label = "",
): void {
  const unexplained = simCash - explainedFlow;
  if (Math.abs(unexplained) >= 1) {
    console.error(
      `[帳務不變量違反${label ? ` (${label})` : ""}] ` +
      `sim.cash=${simCash}, explainedFlow=${explainedFlow}, 差異=${unexplained}`,
    );
  }
}

/**
 * 計算所有已知交易可解釋的現金流量（正 = 現金流入，負 = 現金流出）
 *
 * 帳務原則：每筆事件皆為轉帳，借貸相抵為 0。
 * MARKET_GAIN/MARKET_LOSS 為未實現損益，無現金流，不計入。
 * sim.cash 無法解釋的差額以「不明期初餘額」補平。
 */
export function computeExplainedCashFlow(
  stockTrades: StockTrade[],
  optionsTrades: OptionsTrade[],
  loans: Loan[],
  allPayments: LoanPayment[],
  cashEvents?: CashEvent[],
): number {
  let flow = 0;
  for (const t of stockTrades) {
    if (t.action === "SELL") flow += t.price * t.quantity - t.fee;
    else flow -= t.price * t.quantity + t.fee;
  }
  for (const t of optionsTrades) {
    if (t.action === "SELL") flow += t.price * t.quantity * TXO_MULTIPLIER - t.fee;
    else flow -= t.price * t.quantity * TXO_MULTIPLIER + t.fee;
  }
  for (const l of loans) {
    flow += l.principal; // 貸款入帳
  }
  for (const p of allPayments) {
    flow -= p.amount; // 還款流出
  }
  // 手動現金事件（薪資、股息、生活費等）
  for (const e of cashEvents ?? []) {
    const dir = CASH_ACTIONS[e.action as keyof typeof CASH_ACTIONS]?.direction;
    if (dir === "in") flow += e.amount;
    else if (dir === "out") flow -= e.amount;
    // "none"（MARKET_GAIN/MARKET_LOSS）不計入現金流
  }
  return flow;
}


/**
 * 產生「不明期初餘額」事件：sim.cash 中無法由已知交易解釋的部分。
 * 正值 → UNKNOWN_IN（不明收入），負值 → UNKNOWN_OUT（不明支出）。
 */
export function generateUnexplainedBalanceEvent(
  simCash: number,
  explainedFlow: number,
  simCreatedAt?: string | null,
): UnifiedTrade | null {
  const unexplained = simCash - explainedFlow;
  if (Math.abs(unexplained) < 1) return null; // 誤差忽略
  const dateStr = simCreatedAt
    ? simCreatedAt.replace(/-/g, "").slice(0, 8)
    : "00000000";
  return {
    id: "cash-init",
    type: "cash",
    tradeDate: dateStr,
    action: unexplained > 0 ? "UNKNOWN_IN" : "UNKNOWN_OUT",
    description: `${cashActionLabel(unexplained > 0 ? "UNKNOWN_IN" : "UNKNOWN_OUT")}（期初餘額）`,
    price: Math.abs(unexplained),
    quantity: 1,
    fee: 0,
    notes: null,
    raw: null,
  };
}

export function buildUnifiedTrades(
  optionsTrades: OptionsTrade[],
  stockTrades: StockTrade[],
  loans: Loan[] = [],
  positions: Position[] = [],
): UnifiedTrade[] {
  const unified: UnifiedTrade[] = [];

  for (const t of optionsTrades) {
    unified.push({
      id: `opt-${t.id}`,
      type: "options",
      tradeDate: t.tradeDate,
      action: t.action as "BUY" | "SELL",
      description: `${t.contractId} ${t.contractMonth} ${t.callPut} ${t.strikePrice}`,
      price: t.price,
      quantity: t.quantity,
      fee: t.fee,
      notes: t.notes,
      raw: t,
    });
  }

  for (const t of stockTrades) {
    unified.push({
      id: `stk-${t.id}`,
      type: "stock",
      tradeDate: t.tradeDate,
      action: t.action,
      description: t.symbol,
      price: t.price,
      quantity: t.quantity,
      fee: t.fee,
      notes: t.notes,
      raw: t,
    });
  }

  for (const loan of loans) {
    unified.push(...generateLoanTrades(loan));
  }

  for (const pos of positions) {
    if (pos.costBasis > 0 && pos.currentPrice > 0) {
      unified.push(generatePositionMarketValueTrade(pos));
    }
  }

  // Sort by date descending, then by id descending
  unified.sort((a, b) => {
    const dateCmp = b.tradeDate.localeCompare(a.tradeDate);
    if (dateCmp !== 0) return dateCmp;
    return b.id.localeCompare(a.id);
  });

  return unified;
}

/** Group trades by date (YYYYMMDD) */
export function groupTradesByDate(trades: UnifiedTrade[]): Map<string, UnifiedTrade[]> {
  const map = new Map<string, UnifiedTrade[]>();
  for (const t of trades) {
    const list = map.get(t.tradeDate) ?? [];
    list.push(t);
    map.set(t.tradeDate, list);
  }
  return map;
}

/** Get all unique trade dates as Set<YYYYMMDD> */
export function getTradeDates(trades: UnifiedTrade[]): Set<string> {
  return new Set(trades.map((t) => t.tradeDate));
}

/** Format YYYYMMDD to displayable date */
export function formatTradeDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}
