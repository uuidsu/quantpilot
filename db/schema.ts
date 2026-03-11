import { pgTable, serial, real, integer, timestamp, text, boolean } from "drizzle-orm/pg-core";

export const simulations = pgTable("simulations", {
  id: serial("id").primaryKey(),
  leverageLimit: real("leverage_limit").notNull().default(1.5),
  exposureTarget: real("exposure_target").notNull().default(1.0),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const strategies = pgTable("strategies", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => simulations.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("預設策略"),
  leverageLimit: real("leverage_limit").notNull().default(1.5),
  leverageCap: real("leverage_cap"),
  exposureTarget: real("exposure_target").notNull().default(1.0),
  deltaMin: real("delta_min"),
  deltaMax: real("delta_max"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const apiCache = pgTable("api_cache", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  source: text("source").notNull(),
  price: real("price").notNull(),
  fetchedAt: timestamp("fetched_at", { mode: "string" }).defaultNow(),
});

export const sourceConfigs = pgTable("source_configs", {
  sourceId: text("source_id").primaryKey(),
  apiKey: text("api_key"),
  isDefault: boolean("is_default").notNull().default(false),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  symbol: text("symbol").notNull(),
  success: boolean("success").notNull(),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const optionsDeltaCache = pgTable("options_delta_cache", {
  id: serial("id").primaryKey(),
  tradeDate: text("trade_date").notNull(),
  contractId: text("contract_id").notNull(),
  contractMonth: text("contract_month"),
  settlementDay: text("settlement_day"),
  strikePrice: real("strike_price").notNull(),
  callPut: text("call_put").notNull(),
  openPrice: real("open_price"),
  highPrice: real("high_price"),
  lowPrice: real("low_price"),
  closePrice: real("close_price"),
  volume: integer("volume"),
  openInterest: integer("open_interest"),
  delta: real("delta"),
  fetchedAt: timestamp("fetched_at", { mode: "string" }).defaultNow(),
});

export const optionsTrades = pgTable("options_trades", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").references(() => simulations.id, { onDelete: "cascade" }),
  tradeDate: text("trade_date").notNull(),
  action: text("action").notNull(),
  contractId: text("contract_id").notNull().default("TXO"),
  contractMonth: text("contract_month").notNull(),
  callPut: text("call_put").notNull(),
  strikePrice: real("strike_price").notNull(),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull(),
  fee: real("fee").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const stockTrades = pgTable("stock_trades", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").references(() => simulations.id, { onDelete: "cascade" }),
  tradeDate: text("trade_date").notNull(),
  action: text("action").notNull(),
  symbol: text("symbol").notNull(),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull(),
  fee: real("fee").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => simulations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  principal: real("principal").notNull(),
  annualRate: real("annual_rate").notNull(),
  periods: integer("periods").notNull(),
  startDate: text("start_date").notNull(),
  loanType: text("loan_type").notNull().default("annuity"), // "annuity" 等額本息 | "interest_only" 質押只還利息
  prepaymentStrategy: text("prepayment_strategy").notNull().default("reduce_payment"), // "reduce_payment" 月付變小 | "reduce_term" 提早還完
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const loanRateEvents = pgTable("loan_rate_events", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  effectiveDate: text("effective_date").notNull(), // YYYYMMDD，此日期起套用新利率
  newRate: real("new_rate").notNull(),             // 年利率（小數，e.g. 0.025）
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const loanPayments = pgTable("loan_payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  paymentDate: text("payment_date").notNull(),   // YYYYMMDD
  amount: real("amount").notNull(),              // 總還款金額 = principalPortion + interestPortion
  principalPortion: real("principal_portion"),   // 還本金部分（null = 舊資料）
  interestPortion: real("interest_portion"),     // 還利息部分（null = 舊資料）
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export const optionsTargets = pgTable("options_targets", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => simulations.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  callPut: text("call_put").notNull(),
  targetDelta: real("target_delta").notNull(),
  contractMonth: text("contract_month"),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

// 股票代號 metadata（beta、現價，per symbol）
export const symbolMeta = pgTable("symbol_meta", {
  symbol: text("symbol").primaryKey(),
  beta: real("beta").notNull().default(1.0),
  currentPrice: real("current_price").notNull().default(0),
  priceUpdatedAt: text("price_updated_at"),  // ISO string
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
});

export const cashEvents = pgTable("cash_events", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => simulations.id, { onDelete: "cascade" }),
  tradeDate: text("trade_date").notNull(),   // YYYYMMDD
  action: text("action").notNull(),           // CashAction（direction "in" 或 "out"，不含 "none"）
  amount: real("amount").notNull(),           // 永遠為正數，方向由 action 決定
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export type Simulation = typeof simulations.$inferSelect;
export type Strategy = typeof strategies.$inferSelect;
export type ApiCache = typeof apiCache.$inferSelect;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type SourceConfig = typeof sourceConfigs.$inferSelect;
export type OptionsDeltaRow = typeof optionsDeltaCache.$inferSelect;
export type OptionsTrade = typeof optionsTrades.$inferSelect;
export type StockTrade = typeof stockTrades.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type LoanPayment = typeof loanPayments.$inferSelect;
export type OptionsTarget = typeof optionsTargets.$inferSelect;
export type SymbolMeta = typeof symbolMeta.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type CashEvent = typeof cashEvents.$inferSelect;
