/**
 * 複式記帳虛帳引擎
 *
 * 核心不變量：Σ 所有帳戶餘額 = 0
 *
 * 帳戶分類：
 *   實體帳戶（資產/負債）：
 *     - real:cash           現金（正值=有錢，負值=負現金）
 *     - real:stock:{sym}    股票市值（shares × currentPrice）
 *     - real:loan:{id}      貸款負債（-remainingBalance，負值）
 *
 *   虛帳（income，balance 為負 = 價值來源）：
 *     - virtual:OPTIONS_PREMIUM   選擇權賣出權利金
 *     - virtual:MARKET_GAIN       股票未實現增益
 *     - virtual:CAPITAL_GAIN      股票已實現資本利得
 *     - virtual:{CASH_ACTION}     手動收入事件（薪資、股息等）
 *
 *   虛帳（expense，balance 為正 = 價值消耗）：
 *     - virtual:OPTIONS_BUY       選擇權買入成本
 *     - virtual:INTEREST_OUT      利息支出
 *     - virtual:MARKET_LOSS       股票未實現損失
 *     - virtual:CAPITAL_LOSS      股票已實現資本損失
 *     - virtual:{CASH_ACTION}     手動支出事件（生活費等）
 *
 * 雙向記帳規則（每筆事件都是轉帳，借貸相抵為 0）：
 *   股票 BUY       → Dr stock:{sym}  / Cr cash          （純資產 swap，無虛帳）
 *   股票 SELL      → Dr cash         / Cr stock:{sym}    （純資產 swap，無虛帳）
 *   股票漲跌       → Dr stock:{sym}  / Cr virtual:MARKET_GAIN（或反向）
 *   已實現利得     → 由 realized PnL 計算 → virtual:CAPITAL_GAIN
 *   選擇權 SELL    → Dr cash         / Cr virtual:OPTIONS_PREMIUM
 *   選擇權 BUY     → Dr virtual:OPTIONS_BUY / Cr cash
 *   貸款入帳       → Dr cash         / Cr real:loan（讓負值更負）（純轉帳，無虛帳）
 *   還本金         → Dr real:loan    / Cr cash           （純轉帳，無虛帳）
 *   還利息         → Dr virtual:INTEREST_OUT / Cr cash
 *   現金事件收入   → Dr cash         / Cr virtual:{action}
 *   現金事件支出   → Dr virtual:{action} / Cr cash
 */

import type { Position, Loan, LoanPayment, OptionsTrade, StockTrade, CashEvent } from "./types";
import { CASH_ACTIONS, cashActionLabel, type CashAction } from "./types";

const TXO_MULTIPLIER = 50;

export interface DoubleEntryAccount {
  id: string;
  label: string;
  balance: number;
  kind: "real_cash" | "real_stock" | "real_loan" | "virtual_income" | "virtual_expense";
}

export interface DoubleEntrySnapshot {
  accounts: DoubleEntryAccount[];
  realTotal: number;      // 實體帳戶合計
  virtualTotal: number;   // 虛帳合計
  grandTotal: number;     // realTotal + virtualTotal，理想值 = 0
  isBalanced: boolean;    // |grandTotal| < 1
}

export function computeDoubleEntrySnapshot(params: {
  cash: number;
  positions: Position[];
  loans: Loan[];
  loanPaymentsMap: Record<number, LoanPayment[]>;
  stockTrades: StockTrade[];
  optionsTrades: OptionsTrade[];
  cashEvents: CashEvent[];
}): DoubleEntrySnapshot {
  const { cash, positions, loans, loanPaymentsMap, stockTrades, optionsTrades, cashEvents } = params;

  // 用 Map 合併同 ID 的帳戶（多來源合一）
  const accountMap = new Map<string, DoubleEntryAccount>();

  function upsert(id: string, label: string, delta: number, kind: DoubleEntryAccount["kind"]) {
    const existing = accountMap.get(id);
    if (existing) {
      existing.balance += delta;
    } else {
      accountMap.set(id, { id, label, balance: delta, kind });
    }
  }

  // ── 1. Real: 現金 ─────────────────────────────────────────────
  upsert("real:cash", "現金", cash, "real_cash");

  // ── 2. Real: 股票市值 ─────────────────────────────────────────
  for (const pos of positions) {
    upsert(
      `real:stock:${pos.symbol}`,
      pos.symbol,
      pos.shares * pos.currentPrice,
      "real_stock",
    );
  }

  // ── 3. Real: 貸款負債 ─────────────────────────────────────────
  for (const loan of loans) {
    const payments = loanPaymentsMap[loan.id] ?? [];
    const totalPaid = payments.reduce((s, p) => s + (p.principalPortion ?? p.amount), 0);
    const remaining = Math.max(loan.principal - totalPaid, 0);
    upsert(`real:loan:${loan.id}`, loan.name, -remaining, "real_loan");
  }

  // ── 4. Virtual: 選擇權權利金（賣出）──────────────────────────
  // 賣出選擇權 → cash 增加 → 虛帳為負（收入來源）
  let optionsSellNet = 0;
  let optionsBuyNet = 0;
  for (const t of optionsTrades) {
    if (t.action === "SELL") optionsSellNet += t.price * t.quantity * TXO_MULTIPLIER - t.fee;
    else optionsBuyNet += t.price * t.quantity * TXO_MULTIPLIER + t.fee;
  }
  if (optionsSellNet >= 1) {
    upsert("virtual:OPTIONS_PREMIUM", cashActionLabel("OPTIONS_PREMIUM"), -optionsSellNet, "virtual_income");
  }
  if (optionsBuyNet >= 1) {
    upsert("virtual:OPTIONS_BUY", cashActionLabel("OPTIONS_BUY"), optionsBuyNet, "virtual_expense");
  }

  // ── 5. Virtual: 利息支出（貸款還款中的利息部分）──────────────
  // 利息 = 現金流出 + 沒有對應的資產增加 → 虛帳為正（支出消耗）
  let totalInterest = 0;
  for (const payments of Object.values(loanPaymentsMap)) {
    for (const p of payments) {
      totalInterest += p.interestPortion ?? 0;
    }
  }
  if (totalInterest >= 1) {
    upsert("virtual:INTEREST_OUT", cashActionLabel("INTEREST_OUT"), totalInterest, "virtual_expense");
  }

  // ── 6. Virtual: 股票未實現損益 ───────────────────────────────
  // 股票現值 = shares × currentPrice（已在 real:stock 中）
  // 成本 = shares × costBasis（買入時的現金流出）
  // 差額 = 未實現 → 虛帳補平（增益=負虛帳，損失=正虛帳）
  let totalUnrealized = 0;
  for (const pos of positions) {
    totalUnrealized += (pos.currentPrice - pos.costBasis) * pos.shares;
  }
  if (totalUnrealized >= 1) {
    upsert("virtual:MARKET_GAIN", "未實現增益", -totalUnrealized, "virtual_income");
  } else if (totalUnrealized <= -1) {
    upsert("virtual:MARKET_LOSS", "未實現損失", -totalUnrealized, "virtual_expense");
  }

  // ── 7. Virtual: 股票已實現損益 ───────────────────────────────
  // 對於每個有過賣出的股票代號：
  //   realized = sellProceeds - buyCosts + remaining.shares × remaining.costBasis
  // 這個公式從帳務角度推導：
  //   現金淨流（cash）已含 sellProceeds - buyCosts（所有買賣的現金impact）
  //   real:stock 含 remaining.shares × currentPrice
  //   我們用 costBasis 而非 currentPrice，是因為 unrealized 已在 virtual:MARKET_GAIN 處理
  const symBuyCosts = new Map<string, number>();
  const symSellProceeds = new Map<string, number>();
  for (const t of stockTrades) {
    if (t.action === "BUY") {
      symBuyCosts.set(t.symbol, (symBuyCosts.get(t.symbol) ?? 0) + t.price * t.quantity + t.fee);
    } else {
      symSellProceeds.set(t.symbol, (symSellProceeds.get(t.symbol) ?? 0) + t.price * t.quantity - t.fee);
    }
  }
  let totalRealized = 0;
  for (const [sym, buyCost] of symBuyCosts.entries()) {
    const sellProceeds = symSellProceeds.get(sym) ?? 0;
    if (sellProceeds === 0) continue;
    const pos = positions.find(p => p.symbol === sym);
    const remainingCost = pos ? pos.shares * pos.costBasis : 0;
    totalRealized += sellProceeds - buyCost + remainingCost;
  }
  if (totalRealized >= 1) {
    upsert("virtual:CAPITAL_GAIN", "已實現資本利得", -totalRealized, "virtual_income");
  } else if (totalRealized <= -1) {
    upsert("virtual:CAPITAL_LOSS", "已實現資本損失", -totalRealized, "virtual_expense");
  }

  // ── 8. Virtual: 手動現金事件 ─────────────────────────────────
  // 每筆 cashEvent 對應一個虛帳（同 action 合併）
  // direction "in"  → cash 增加 → 虛帳為負（收入來源）
  // direction "out" → cash 減少 → 虛帳為正（支出消耗）
  const eventTotals = new Map<string, number>();
  for (const e of cashEvents) {
    eventTotals.set(e.action, (eventTotals.get(e.action) ?? 0) + e.amount);
  }
  for (const [action, total] of eventTotals.entries()) {
    if (total < 1) continue;
    const info = CASH_ACTIONS[action as CashAction];
    if (!info || info.direction === "none") continue;
    const isIncome = info.direction === "in";
    upsert(
      `virtual:${action}`,
      cashActionLabel(action),
      isIncome ? -total : total,
      isIncome ? "virtual_income" : "virtual_expense",
    );
  }

  // ── 計算總計 ──────────────────────────────────────────────────
  const accounts = Array.from(accountMap.values());
  const realTotal = accounts
    .filter(a => a.kind.startsWith("real"))
    .reduce((s, a) => s + a.balance, 0);
  const virtualTotal = accounts
    .filter(a => a.kind.startsWith("virtual"))
    .reduce((s, a) => s + a.balance, 0);
  const grandTotal = realTotal + virtualTotal;

  return {
    accounts,
    realTotal,
    virtualTotal,
    grandTotal,
    isBalanced: Math.abs(grandTotal) < 1,
  };
}
