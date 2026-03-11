import type {
  Position, Loan, LoanPayment,
  OptionsTargetMatch, OptionsHolding, StockTrade, OptionsTrade,
  UnifiedAccount,
} from "./types";
import { computeMonthlyPayment } from "./loan";
import { computeExplainedCashFlow } from "./tradeHistory";

export function buildUnifiedAccounts(params: {
  positions: Position[];
  optionsTargetMatches: OptionsTargetMatch[];
  optionsHoldings: OptionsHolding[];
  loans: Loan[];
  loanPaymentsMap?: Record<number, LoanPayment[]>;
  stockTrades: StockTrade[];
  optionsTrades: OptionsTrade[];
}): UnifiedAccount[] {
  const { positions, optionsTargetMatches, optionsHoldings, loans, loanPaymentsMap = {}, stockTrades, optionsTrades } = params;
  const accounts: UnifiedAccount[] = [];
  const allPayments = Object.values(loanPaymentsMap).flat();

  // Pre-build lookup maps
  const stockTradesBySymbol = new Map<string, StockTrade[]>();
  for (const t of stockTrades) {
    const arr = stockTradesBySymbol.get(t.symbol) ?? [];
    arr.push(t);
    stockTradesBySymbol.set(t.symbol, arr);
  }
  const optTradesByKey = new Map<string, OptionsTrade[]>();
  for (const t of optionsTrades) {
    const key = `${t.contractMonth}|${t.callPut}|${t.strikePrice}`;
    const arr = optTradesByKey.get(key) ?? [];
    arr.push(t);
    optTradesByKey.set(key, arr);
  }

  // 1. Cash account — only when there are transactions
  const hasTrades = stockTrades.length > 0 || optionsTrades.length > 0 || loans.length > 0;
  if (hasTrades) {
    const computedCash = computeExplainedCashFlow(stockTrades, optionsTrades, loans, allPayments);
    accounts.push({
      id: "cash",
      type: "cash",
      label: "現金",
      value: computedCash,
      subtitle: null,
      data: { cash: computedCash },
    });
  }

  // 2. Stock accounts — one per computed position
  for (const pos of positions) {
    const marketValue = pos.shares * pos.currentPrice;
    const trades = stockTradesBySymbol.get(pos.symbol) ?? [];
    accounts.push({
      id: `stock-${pos.symbol}`,
      type: "stock",
      label: pos.symbol,
      value: marketValue,
      subtitle: `${pos.shares}股 · 均$${Math.round(pos.costBasis).toLocaleString()}`,
      data: { position: pos, trades },
    });
  }

  // 3. Options accounts
  const matchedHoldingIds = new Set<string>();
  for (const m of optionsTargetMatches) {
    const holding = optionsHoldings.find(h =>
      h.contractMonth === m.matchedContractMonth &&
      h.callPut === m.target.callPut &&
      h.strikePrice === m.matchedStrike
    );
    if (holding) matchedHoldingIds.add(`${holding.contractMonth}|${holding.callPut}|${holding.strikePrice}`);

    const holdingKey = holding ? `${holding.contractMonth}|${holding.callPut}|${holding.strikePrice}` : null;
    const trades = holdingKey ? (optTradesByKey.get(holdingKey) ?? []) : [];

    accounts.push({
      id: `options-target-${m.target.id}`,
      type: "options",
      label: `${m.target.action} ${m.target.callPut === "P" ? "Put" : "Call"} Δ${m.target.targetDelta}`,
      value: holding ? holding.netQuantity : 0,
      subtitle: m.matchedStrike != null
        ? `${m.matchedContractMonth ?? ""} ${m.target.callPut} ${m.matchedStrike.toLocaleString()}`
        : "尚無市場資料匹配",
      data: { targetMatch: m, holding: holding ?? null, trades },
    });
  }

  // Orphan options holdings
  const orphans = optionsHoldings.filter(h => !matchedHoldingIds.has(`${h.contractMonth}|${h.callPut}|${h.strikePrice}`));
  for (const h of orphans) {
    const key = `${h.contractMonth}|${h.callPut}|${h.strikePrice}`;
    const trades = optTradesByKey.get(key) ?? [];
    accounts.push({
      id: `options-orphan-${h.contractId}-${h.contractMonth}-${h.callPut}-${h.strikePrice}`,
      type: "options",
      label: `${h.callPut === "C" ? "Call" : "Put"} ${h.strikePrice.toLocaleString()}`,
      value: h.netQuantity,
      subtitle: `${h.contractMonth} ${h.callPut} ${h.strikePrice.toLocaleString()}`,
      data: { targetMatch: null, holding: h, trades },
    });
  }

  // 4. Loan accounts
  for (const loan of loans) {
    const payments = loanPaymentsMap[loan.id] ?? [];
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const remaining = Math.max(loan.principal - totalPaid, 0);
    // 質押：月利依剩餘本金計算；等額本息：固定月付金
    const monthly = loan.loanType === "interest_only"
      ? remaining * (loan.annualRate / 12)
      : computeMonthlyPayment(loan.principal, loan.annualRate, loan.periods);
    accounts.push({
      id: `loan-${loan.id}`,
      type: "loan",
      label: loan.name,
      value: -remaining,
      subtitle: `月付 $${Math.round(monthly).toLocaleString()}`,
      data: { loan, monthly, remaining, payments },
    });
  }

  return accounts;
}
