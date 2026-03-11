export interface Simulation {
  id: number;
  leverageLimit: number;
  exposureTarget: number;
  createdAt: string | null;
}

// ── Symbol Metadata（per-symbol beta + 現價，獨立於模擬局）────
export interface SymbolMeta {
  symbol: string;
  beta: number;
  currentPrice: number;
  priceUpdatedAt: string | null;
}

// ── Position（由交易事件計算出來的持倉，非 DB 欄位）───────────
export interface Position {
  symbol: string;
  shares: number;        // Σ BUY qty - Σ SELL qty
  currentPrice: number;  // from symbolMeta
  costBasis: number;     // weighted average buy cost
  beta: number;          // from symbolMeta (default 1.0)
  priceUpdatedAt: string | null;
}

export interface ApiUsage {
  id: number;
  source: string;
  symbol: string;
  success: boolean;
  responseTimeMs: number | null;
  createdAt: string | null;
}

export interface SourceConfig {
  sourceId: string;
  apiKey: string | null;
  isDefault: boolean;
  updatedAt: string | null;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface Strategy {
  id: number;
  simulationId: number;
  name: string;
  leverageLimit: number;
  leverageCap: number | null;
  exposureTarget: number;
  deltaMin: number | null;
  deltaMax: number | null;
  createdAt: string | null;
}

export interface OptionsDeltaRow {
  id: number;
  tradeDate: string;
  contractId: string;
  contractMonth: string | null;
  settlementDay: string | null;
  strikePrice: number;
  callPut: string;
  openPrice: number | null;
  highPrice: number | null;
  lowPrice: number | null;
  closePrice: number | null;
  volume: number | null;
  openInterest: number | null;
  delta: number | null;
  fetchedAt: string | null;
}

export interface OptionsFilter {
  callPut: "ALL" | "C" | "P";
  deltaMin: string;
  deltaMax: string;
  strikePriceMin: string;
  strikePriceMax: string;
  contractMonth: string;
}

export interface OptionsApiStats {
  calls: ApiUsage[];
  cooldownUntil: string | null;
}

export interface OptionsTrade {
  id: number;
  simulationId: number | null;
  tradeDate: string;
  action: "BUY" | "SELL";
  contractId: string;
  contractMonth: string;
  callPut: string;
  strikePrice: number;
  price: number;
  quantity: number;
  fee: number;
  notes: string | null;
  createdAt: string | null;
}

export interface OptionsHolding {
  contractId: string;
  contractMonth: string;
  callPut: string;
  strikePrice: number;
  netQuantity: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number | null;
  unrealizedPnl: number | null;
}

export interface OptionsPnlSummary {
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  totalFees: number;
}

export interface OptionsPnlPoint {
  date: string;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
}

// ── Stock Trades ──────────────────────────────────────────────

export interface StockTrade {
  id: number;
  simulationId: number | null;
  tradeDate: string;           // YYYYMMDD
  action: "BUY" | "SELL";
  symbol: string;
  price: number;
  quantity: number;
  fee: number;
  notes: string | null;
  createdAt: string | null;
}

// ── Loans ─────────────────────────────────────────────────────

export interface Loan {
  id: number;
  simulationId: number;
  name: string;
  principal: number;
  annualRate: number;
  periods: number;
  startDate: string;           // YYYYMMDD
  loanType: "annuity" | "interest_only";
  prepaymentStrategy: "reduce_payment" | "reduce_term"; // 月付變小 | 提早還完
  notes: string | null;
  createdAt: string | null;
}

export interface LoanRateEvent {
  id: number;
  loanId: number;
  effectiveDate: string;       // YYYYMMDD，此日期起套用新利率
  newRate: number;             // 年利率（小數）
  notes: string | null;
  createdAt: string | null;
}

export interface LoanPayment {
  id: number;
  loanId: number;
  paymentDate: string;            // YYYYMMDD
  amount: number;                 // 總還款金額 = principalPortion + interestPortion
  principalPortion: number | null; // 還本金部分（null = 舊資料未拆分）
  interestPortion: number | null;  // 還利息部分（null = 舊資料未拆分）
  notes: string | null;
  createdAt: string | null;
}

// ── Cash Event（手動現金事件，如薪資、生活費等）──────────────────
// 每筆 CashEvent 都是轉帳事件的「補充」面：
//   direction "in"  → Dr cash, Cr income_virtual
//   direction "out" → Dr expense_virtual, Cr cash
// action 只允許 direction 為 "in" 或 "out" 的科目（不含 MARKET_GAIN/MARKET_LOSS）
export interface CashEvent {
  id: number;
  simulationId: number;
  tradeDate: string;         // YYYYMMDD
  action: CashAction;        // 只接受 direction "in" 或 "out" 的科目
  amount: number;            // 永遠為正數，方向由 action.direction 決定
  notes: string | null;
  createdAt: string | null;
}

export interface LoanInstallment {
  period: number;
  paymentDate: string;         // YYYYMMDD
  totalPayment: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}

// ── Options Target ────────────────────────────────────────────

export interface OptionsTarget {
  id: number;
  simulationId: number;
  action: "BUY" | "SELL";
  callPut: "C" | "P";
  targetDelta: number;
  contractMonth: string | null;
  quantity: number;
  notes: string | null;
  createdAt: string | null;
}

export interface OptionsTargetMatch {
  target: OptionsTarget;
  matchedStrike: number | null;
  matchedDelta: number | null;
  matchedPrice: number | null;
  matchedContractMonth: string | null;
  lastMarketDate: string | null;
  lastFetchedAt: string | null;
}

// ── Unified Account ───────────────────────────────────────────

type AccountBase = { id: string; label: string; value: number; subtitle: string | null };

export type UnifiedAccount =
  | (AccountBase & { type: "cash";    data: { cash: number } })
  | (AccountBase & { type: "stock";   data: { position: Position; trades: StockTrade[] } })
  | (AccountBase & { type: "options"; data: { targetMatch: OptionsTargetMatch | null; holding: OptionsHolding | null; trades: OptionsTrade[] } })
  | (AccountBase & { type: "loan";    data: { loan: Loan; monthly: number; remaining: number; payments: LoanPayment[] } });

// ── Cash Action（現金流科目）─────────────────────────────────────
//
// 收入科目（direction: "in"）  →  UNKNOWN_IN 為預設不明收入
// 支出科目（direction: "out"） →  UNKNOWN_OUT 為預設不明支出
// 非現金（direction: "none"）  →  市值損益，無現金流
//
export const CASH_ACTIONS = {
  // ── 收入 ──────────────────────────────────────────────────────
  SALARY:           { label: "薪資收入",      direction: "in"   },
  DIVIDEND:         { label: "股息收入",      direction: "in"   },
  INTEREST_IN:      { label: "利息收入",      direction: "in"   },
  CAPITAL_GAIN:     { label: "資本利得",      direction: "in"   },
  OPTIONS_PREMIUM:  { label: "選擇權權利金",  direction: "in"   },
  LOAN_IN:          { label: "貸款入帳",      direction: "in"   },
  TRANSFER_IN:      { label: "轉帳收入",      direction: "in"   },
  OTHER_IN:         { label: "其他收入",      direction: "in"   },
  UNKNOWN_IN:       { label: "不明收入",      direction: "in"   },
  // ── 支出 ──────────────────────────────────────────────────────
  STOCK_BUY:        { label: "買進股票",      direction: "out"  },
  OPTIONS_BUY:      { label: "選擇權買進",    direction: "out"  },
  INTEREST_OUT:     { label: "利息支出",      direction: "out"  },
  FEE:              { label: "手續費／稅",    direction: "out"  },
  LOAN_PAY:         { label: "貸款還款",      direction: "out"  },
  LIVING:           { label: "生活費",        direction: "out"  },
  TRANSFER_OUT:     { label: "轉帳支出",      direction: "out"  },
  OTHER_OUT:        { label: "其他支出",      direction: "out"  },
  UNKNOWN_OUT:      { label: "不明支出",      direction: "out"  },
  // ── 非現金 ────────────────────────────────────────────────────
  MARKET_GAIN:      { label: "市值增加",      direction: "none" },
  MARKET_LOSS:      { label: "市值減少",      direction: "none" },
} as const;

export type CashAction = keyof typeof CASH_ACTIONS;

/** 取得科目中文標籤，找不到時回傳原始 action 字串 */
export function cashActionLabel(action: string): string {
  return (CASH_ACTIONS as Record<string, { label: string }>)[action]?.label ?? action;
}

// ── Unified Trade ─────────────────────────────────────────────

export interface UnifiedTrade {
  id: string;
  type: "options" | "stock" | "loan" | "market_value" | "cash";
  tradeDate: string;           // YYYYMMDD
  action: string;
  description: string;
  price: number;
  quantity: number;
  fee: number;
  notes: string | null;
  raw: OptionsTrade | StockTrade | Loan | LoanPayment | null;
}
