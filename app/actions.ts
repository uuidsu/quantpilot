"use server";

import { db } from "@/db";
import {
  simulations,
  strategies,
  symbolMeta,
  apiCache,
  apiUsage,
  sourceConfigs,
  optionsDeltaCache,
  optionsTrades,
  stockTrades,
  loans,
  loanPayments,
  loanRateEvents,
  optionsTargets,
  appSettings,
  cashEvents,
  type Simulation,
  type Strategy,
  type SymbolMeta,
  type ApiUsage,
  type SourceConfig,
  type OptionsDeltaRow,
  type OptionsTrade,
  type StockTrade,
  type OptionsTarget,
  type AppSetting,
  type CashEvent,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { computePositions } from "@/shared/portfolio";
import type { Position } from "@/shared/types";
import { revalidatePath } from "next/cache";
import { fetchPrice, fetchTaiexIndex, type ProviderId } from "@/lib/priceProviders";

// ============ Simulation CRUD ============

export async function createSimulation(): Promise<Simulation> {
  const [simulation] = await db.insert(simulations).values({}).returning();
  return simulation;
}

export async function getSimulation(id: number): Promise<Simulation | null> {
  const [simulation] = await db.select().from(simulations).where(eq(simulations.id, id));
  return simulation ?? null;
}

export async function listSimulations(): Promise<Simulation[]> {
  return db.select().from(simulations).orderBy(desc(simulations.createdAt));
}

export async function deleteSimulation(id: number): Promise<void> {
  await db.delete(simulations).where(eq(simulations.id, id));
  revalidatePath("/");
}

export async function updateLeverageLimit(id: number, leverageLimit: number): Promise<Simulation> {
  const [updated] = await db.update(simulations).set({ leverageLimit }).where(eq(simulations.id, id)).returning();
  return updated;
}

export async function updateExposureTarget(id: number, exposureTarget: number): Promise<Simulation> {
  const [updated] = await db.update(simulations).set({ exposureTarget }).where(eq(simulations.id, id)).returning();
  return updated;
}

// ============ Source Config ============

export async function getSourceConfigs(): Promise<SourceConfig[]> {
  return db.select().from(sourceConfigs);
}

export async function upsertSourceConfig(
  sourceId: string,
  apiKey: string | null
): Promise<SourceConfig> {
  const [row] = await db
    .insert(sourceConfigs)
    .values({ sourceId, apiKey, isDefault: false })
    .onConflictDoUpdate({
      target: sourceConfigs.sourceId,
      set: { apiKey, updatedAt: new Date().toISOString() },
    })
    .returning();
  return row;
}

export async function setDefaultSource(sourceId: string): Promise<void> {
  // 清除全部 isDefault，再設定新的
  await db.update(sourceConfigs).set({ isDefault: false });
  await db
    .insert(sourceConfigs)
    .values({ sourceId, apiKey: null, isDefault: true })
    .onConflictDoUpdate({
      target: sourceConfigs.sourceId,
      set: { isDefault: true, updatedAt: new Date().toISOString() },
    });
}

export async function getDefaultSource(): Promise<SourceConfig | null> {
  const [row] = await db
    .select()
    .from(sourceConfigs)
    .where(eq(sourceConfigs.isDefault, true))
    .limit(1);
  return row ?? null;
}

// ============ Strategy CRUD ============

export async function getStrategies(simulationId: number): Promise<Strategy[]> {
  return db
    .select()
    .from(strategies)
    .where(eq(strategies.simulationId, simulationId))
    .orderBy(strategies.createdAt);
}

export async function addStrategy(
  simulationId: number,
  data: { name: string; leverageLimit?: number; leverageCap?: number | null; exposureTarget?: number }
): Promise<Strategy> {
  const [strategy] = await db
    .insert(strategies)
    .values({
      simulationId,
      name: data.name,
      leverageLimit: data.leverageLimit ?? 1.5,
      leverageCap: data.leverageCap ?? null,
      exposureTarget: data.exposureTarget ?? 1.0,
    })
    .returning();
  return strategy;
}

export async function updateStrategy(
  id: number,
  data: { name?: string; leverageLimit?: number; leverageCap?: number | null; exposureTarget?: number }
): Promise<Strategy> {
  const [updated] = await db.update(strategies).set(data).where(eq(strategies.id, id)).returning();
  if (!updated) throw new Error("策略不存在");
  return updated;
}

export async function deleteStrategy(id: number): Promise<void> {
  await db.delete(strategies).where(eq(strategies.id, id));
}

// ============ Symbol Meta（beta + 現價，per symbol）============

export async function getSymbolMetas(): Promise<SymbolMeta[]> {
  return db.select().from(symbolMeta);
}

export async function upsertSymbolMeta(
  sym: string,
  data: { beta?: number; currentPrice?: number; priceUpdatedAt?: string }
): Promise<SymbolMeta> {
  const [row] = await db
    .insert(symbolMeta)
    .values({ symbol: sym, beta: data.beta ?? 1.0, currentPrice: data.currentPrice ?? 0, priceUpdatedAt: data.priceUpdatedAt ?? null })
    .onConflictDoUpdate({
      target: symbolMeta.symbol,
      set: data,
    })
    .returning();
  return row;
}

export async function fetchSymbolPrice(
  sym: string
): Promise<{ symbolMeta: SymbolMeta; fromCache: boolean; provider: string }> {
  const defaultCfg = await getDefaultSource();
  const providerId: ProviderId = (defaultCfg?.sourceId as ProviderId) ?? "twse";

  let apiKey: string | undefined;
  if (providerId !== "twse") {
    const [cfg] = await db.select().from(sourceConfigs).where(eq(sourceConfigs.sourceId, providerId)).limit(1);
    apiKey = cfg?.apiKey ?? undefined;
  }

  const start = Date.now();
  let success = false;

  try {
    const result = await fetchPrice(sym, providerId, apiKey);
    success = true;
    const elapsed = Date.now() - start;

    if (!result.fromCache) {
      await db.insert(apiUsage).values({ source: providerId, symbol: result.symbol, success: true, responseTimeMs: elapsed });
      await db.insert(apiCache).values({ symbol: result.symbol, source: providerId, price: result.price });
    }

    const updated = await upsertSymbolMeta(sym, {
      currentPrice: result.price,
      priceUpdatedAt: new Date().toISOString(),
    });
    return { symbolMeta: updated, fromCache: result.fromCache, provider: providerId };
  } catch (err) {
    if (!success) {
      await db.insert(apiUsage).values({ source: providerId, symbol: sym.toUpperCase(), success: false, responseTimeMs: Date.now() - start });
    }
    throw err;
  }
}

// ============ Positions（從交易事件計算）============

export async function getPositions(simId: number): Promise<Position[]> {
  const trades = await db.select().from(stockTrades).where(eq(stockTrades.simulationId, simId));
  const metas = await db.select().from(symbolMeta);
  return computePositions(trades as any, metas);
}

// ============ Stock Search ============

export async function searchStocks(
  query: string
): Promise<{ symbol: string; name: string; exchange: string }[]> {
  if (!query || query.trim().length < 1) return [];
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&listsCount=0`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.quotes ?? [])
      .filter((q: { quoteType?: string }) =>
        q.quoteType === "EQUITY" || q.quoteType === "ETF"
      )
      .slice(0, 6)
      .map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string }) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || "",
      }));
  } catch {
    return [];
  }
}

// ============ Market Index ============

export async function fetchMarketIndex(): Promise<{ index: number } | { error: string }> {
  try {
    const index = await fetchTaiexIndex();
    return { index };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "無法取得大盤指數" };
  }
}

// ============ API Stats ============

export async function getApiStats(): Promise<ApiUsage[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(apiUsage)
    .where(sql`${apiUsage.createdAt} >= ${since}`)
    .orderBy(desc(apiUsage.createdAt));
}

// ============ TAIFEX Options Delta ============

function getTradeDateStr(now: Date = new Date()): string {
  const tst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const d = new Date(tst);
  const hour = d.getHours();
  const minute = d.getMinutes();
  if (hour < 15 || (hour === 15 && minute < 30)) {
    d.setDate(d.getDate() - 1);
  }
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const dy = String(d.getDate()).padStart(2, "0");
  return `${y}${mo}${dy}`;
}

interface TaifexDeltaRow {
  Contract?: string;
  CallPut?: string;
  "ContractMonth(Week)"?: string;
  StrikePrice?: string;
  Delta?: string;
  ContractSettlementDay?: string;
  [key: string]: string | undefined;
}

const TAIFEX_COOLDOWN_MS = 60 * 60 * 1000;

export async function fetchAndCacheOptionsDelta(
  contractId = "TXO"
): Promise<{ date: string; count: number } | { error: string }> {
  try {
    const tradeDate = getTradeDateStr();
    const existing = await db
      .select()
      .from(optionsDeltaCache)
      .where(
        and(
          eq(optionsDeltaCache.tradeDate, tradeDate),
          eq(optionsDeltaCache.contractId, contractId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(optionsDeltaCache)
        .where(
          and(
            eq(optionsDeltaCache.tradeDate, tradeDate),
            eq(optionsDeltaCache.contractId, contractId)
          )
        );
      return { date: tradeDate, count: Number(countResult[0]?.count ?? 0) };
    }

    const cooldownSince = new Date(Date.now() - TAIFEX_COOLDOWN_MS);
    const recentCalls = await db
      .select()
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.source, "taifex_options"),
          eq(apiUsage.symbol, "TXO"),
          eq(apiUsage.success, true),
          sql`${apiUsage.createdAt} >= ${cooldownSince}`
        )
      )
      .orderBy(desc(apiUsage.createdAt))
      .limit(1);

    if (recentCalls.length > 0) {
      const lastCall = recentCalls[0].createdAt;
      const remainMs = lastCall
        ? TAIFEX_COOLDOWN_MS - (Date.now() - new Date(lastCall).getTime())
        : 0;
      const remainMin = Math.max(1, Math.ceil(remainMs / 60000));
      return { error: `冷卻中，${remainMin} 分鐘後可再拉取` };
    }

    const t0 = Date.now();
    let logged = false;
    try {
      const resp = await fetch("https://openapi.taifex.com.tw/v1/DailyOptionsDelta", {
        headers: {
          Accept: "application/json",
          "User-Agent": "QuantPilot/1.0",
        },
        cache: "no-store",
      });

      const elapsed = Date.now() - t0;

      if (!resp.ok) {
        logged = true;
        await db.insert(apiUsage).values({
          source: "taifex_options",
          symbol: contractId,
          success: false,
          responseTimeMs: elapsed,
        });
        throw new Error(`TAIFEX API error: ${resp.status}`);
      }

      const rawData: TaifexDeltaRow[] = await resp.json();
      logged = true;

      await db.insert(apiUsage).values({
        source: "taifex_options",
        symbol: contractId,
        success: true,
        responseTimeMs: elapsed,
      });

      const optionsRows = rawData.filter((r) => r.Contract === contractId);

      if (optionsRows.length === 0) {
        return { error: "TAIFEX 未回傳選擇權資料，可能是非交易日或 API 暫時不可用" };
      }

      const toInsert = optionsRows.map((row) => {
        const callPutLabel = row.CallPut ?? "";
        const callPut = callPutLabel === "買權" ? "C" : callPutLabel === "賣權" ? "P" : callPutLabel;
        const strikePrice = parseFloat(row.StrikePrice ?? "0");
        const delta = row.Delta ? parseFloat(row.Delta) : null;
        const contractMonth = row["ContractMonth(Week)"] ?? null;
        const settlementDay = row.ContractSettlementDay ?? null;

        return {
          tradeDate,
          contractId,
          contractMonth,
          settlementDay,
          strikePrice,
          callPut,
          openPrice: null,
          highPrice: null,
          lowPrice: null,
          closePrice: null,
          volume: null,
          openInterest: null,
          delta,
        };
      });

      if (toInsert.length > 0) {
        await db.insert(optionsDeltaCache).values(toInsert);
      }

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      await db
        .delete(optionsDeltaCache)
        .where(sql`${optionsDeltaCache.fetchedAt} < ${threeDaysAgo}`);

      return { date: tradeDate, count: toInsert.length };
    } catch (err) {
      if (!logged) {
        const elapsed = Date.now() - t0;
        await db.insert(apiUsage).values({
          source: "taifex_options",
          symbol: contractId,
          success: false,
          responseTimeMs: elapsed,
        }).catch(() => {});
      }
      throw err;
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "無法取得選擇權資料" };
  }
}

export async function getOptionsDeltaRows(
  contractId = "TXO",
  tradeDate?: string
): Promise<OptionsDeltaRow[]> {
  const date = tradeDate ?? getTradeDateStr();
  return db
    .select()
    .from(optionsDeltaCache)
    .where(
      and(
        eq(optionsDeltaCache.tradeDate, date),
        eq(optionsDeltaCache.contractId, contractId)
      )
    )
    .orderBy(optionsDeltaCache.strikePrice);
}

export async function getAvailableOptionsDates(contractId = "TXO"): Promise<string[]> {
  const rows = await db
    .selectDistinct({ tradeDate: optionsDeltaCache.tradeDate })
    .from(optionsDeltaCache)
    .where(eq(optionsDeltaCache.contractId, contractId))
    .orderBy(desc(optionsDeltaCache.tradeDate));
  return rows.map((r) => r.tradeDate);
}

export async function getOptionsApiStats(): Promise<{
  calls: ApiUsage[];
  cooldownUntil: string | null;
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const calls = await db
    .select()
    .from(apiUsage)
    .where(
      and(
        eq(apiUsage.source, "taifex_options"),
        sql`${apiUsage.createdAt} >= ${since}`
      )
    )
    .orderBy(desc(apiUsage.createdAt));

  const cooldownSince = new Date(Date.now() - TAIFEX_COOLDOWN_MS);
  const lastSuccess = calls.find(
    (c) => c.success && c.createdAt && new Date(c.createdAt) >= cooldownSince
  );

  let cooldownUntil: string | null = null;
  if (lastSuccess?.createdAt) {
    const until = new Date(new Date(lastSuccess.createdAt).getTime() + TAIFEX_COOLDOWN_MS);
    if (until.getTime() > Date.now()) {
      cooldownUntil = until.toISOString();
    }
  }

  return { calls, cooldownUntil };
}

// ============ Options Trades ============

export async function getOptionsTrades(simId?: number): Promise<OptionsTrade[]> {
  if (simId) {
    return db.select().from(optionsTrades)
      .where(eq(optionsTrades.simulationId, simId))
      .orderBy(desc(optionsTrades.tradeDate), desc(optionsTrades.createdAt));
  }
  return db.select().from(optionsTrades).orderBy(desc(optionsTrades.tradeDate), desc(optionsTrades.createdAt));
}

export async function addOptionsTrade(data: {
  simulationId: number;
  tradeDate: string;
  action: string;
  contractId?: string;
  contractMonth: string;
  callPut: string;
  strikePrice: number;
  price: number;
  quantity: number;
  fee?: number;
  notes?: string | null;
}): Promise<OptionsTrade> {
  const [row] = await db
    .insert(optionsTrades)
    .values({
      simulationId: data.simulationId,
      tradeDate: data.tradeDate,
      action: data.action,
      contractId: data.contractId ?? "TXO",
      contractMonth: data.contractMonth,
      callPut: data.callPut,
      strikePrice: data.strikePrice,
      price: data.price,
      quantity: data.quantity,
      fee: data.fee ?? 0,
      notes: data.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateOptionsTrade(
  id: number,
  data: Partial<{
    tradeDate: string;
    action: string;
    contractId: string;
    contractMonth: string;
    callPut: string;
    strikePrice: number;
    price: number;
    quantity: number;
    fee: number;
    notes: string | null;
  }>
): Promise<OptionsTrade> {
  const [updated] = await db
    .update(optionsTrades)
    .set(data)
    .where(eq(optionsTrades.id, id))
    .returning();
  if (!updated) throw new Error("交易紀錄不存在");
  return updated;
}

export async function deleteOptionsTrade(id: number): Promise<void> {
  await db.delete(optionsTrades).where(eq(optionsTrades.id, id));
}

export async function getOptionsPriceMap(contractId = "TXO", days = 60): Promise<Record<string, Record<string, number>>> {
  const since = new Date(Date.now() - Math.min(days, 180) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await db
    .select({
      tradeDate: optionsDeltaCache.tradeDate,
      contractId: optionsDeltaCache.contractId,
      contractMonth: optionsDeltaCache.contractMonth,
      callPut: optionsDeltaCache.callPut,
      strikePrice: optionsDeltaCache.strikePrice,
      closePrice: optionsDeltaCache.closePrice,
    })
    .from(optionsDeltaCache)
    .where(and(
      eq(optionsDeltaCache.contractId, contractId),
      sql`${optionsDeltaCache.closePrice} IS NOT NULL`,
      sql`${optionsDeltaCache.tradeDate} >= ${since}`,
    ))
    .orderBy(optionsDeltaCache.tradeDate);

  const result: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (r.closePrice == null || !r.contractMonth) continue;
    const dateKey = r.tradeDate;
    const holdKey = `${r.contractId}|${r.contractMonth}|${r.callPut}|${r.strikePrice}`;
    if (!result[dateKey]) result[dateKey] = {};
    result[dateKey][holdKey] = r.closePrice;
  }
  return result;
}

// ============ Stock Trades ============

export async function getStockTrades(simId?: number): Promise<StockTrade[]> {
  if (simId) {
    return db.select().from(stockTrades)
      .where(eq(stockTrades.simulationId, simId))
      .orderBy(desc(stockTrades.tradeDate), desc(stockTrades.createdAt));
  }
  return db.select().from(stockTrades).orderBy(desc(stockTrades.tradeDate), desc(stockTrades.createdAt));
}

export async function addStockTrade(data: {
  simulationId: number;
  tradeDate: string;
  action: string;
  symbol: string;
  price: number;
  quantity: number;
  fee?: number;
  notes?: string | null;
}): Promise<StockTrade> {
  const [row] = await db
    .insert(stockTrades)
    .values({
      simulationId: data.simulationId,
      tradeDate: data.tradeDate,
      action: data.action,
      symbol: data.symbol,
      price: data.price,
      quantity: data.quantity,
      fee: data.fee ?? 0,
      notes: data.notes ?? null,
    })
    .returning();
  return row;
}

export async function updateStockTrade(
  id: number,
  data: Partial<{
    tradeDate: string;
    action: string;
    symbol: string;
    price: number;
    quantity: number;
    fee: number;
    notes: string | null;
  }>
): Promise<StockTrade> {
  const [updated] = await db
    .update(stockTrades)
    .set(data)
    .where(eq(stockTrades.id, id))
    .returning();
  if (!updated) throw new Error("交易紀錄不存在");
  return updated;
}

export async function deleteStockTrade(id: number): Promise<void> {
  await db.delete(stockTrades).where(eq(stockTrades.id, id));
}

export async function deleteAllTrades(simId: number): Promise<void> {
  await db.delete(stockTrades).where(eq(stockTrades.simulationId, simId));
  await db.delete(optionsTrades).where(eq(optionsTrades.simulationId, simId));
}

// ============ Loans (貸款) ============

export async function getLoans(simId?: number) {
  if (simId) {
    return db.select().from(loans).where(eq(loans.simulationId, simId)).orderBy(desc(loans.startDate));
  }
  return db.select().from(loans).orderBy(desc(loans.startDate));
}

export async function createLoan(data: {
  simulationId: number;
  name: string;
  principal: number;
  annualRate: number;
  periods: number;
  startDate: string;
  loanType?: "annuity" | "interest_only";
  notes?: string | null;
}) {
  const [row] = await db.insert(loans).values({
    ...data, notes: data.notes ?? null,
  }).returning();
  return row;
}

export async function deleteLoan(id: number) {
  await db.delete(loans).where(eq(loans.id, id));
}

// ============ Loan Payments (還款紀錄) ============

export async function getLoanPayments(loanId: number) {
  return db.select().from(loanPayments).where(eq(loanPayments.loanId, loanId)).orderBy(desc(loanPayments.paymentDate));
}

export async function addLoanPayment(data: { loanId: number; paymentDate: string; amount: number; principalPortion?: number | null; interestPortion?: number | null; notes?: string | null }) {
  const [row] = await db.insert(loanPayments).values({ ...data, notes: data.notes ?? null }).returning();
  return row;
}

export async function updateLoanPayment(id: number, data: { paymentDate?: string; amount?: number; principalPortion?: number | null; interestPortion?: number | null; notes?: string | null }) {
  const [updated] = await db.update(loanPayments).set(data).where(eq(loanPayments.id, id)).returning();
  return updated;
}

export async function deleteLoanPayment(id: number) {
  await db.delete(loanPayments).where(eq(loanPayments.id, id));
}

// ============ Loan Rate Events (利率調整事件) ============

export async function getLoanRateEvents(loanId: number) {
  return db.select().from(loanRateEvents).where(eq(loanRateEvents.loanId, loanId)).orderBy(loanRateEvents.effectiveDate);
}

export async function addLoanRateEvent(data: { loanId: number; effectiveDate: string; newRate: number; notes?: string | null }) {
  const [row] = await db.insert(loanRateEvents).values({ ...data, notes: data.notes ?? null }).returning();
  return row;
}

export async function deleteLoanRateEvent(id: number) {
  await db.delete(loanRateEvents).where(eq(loanRateEvents.id, id));
}

// ============ Cash Events ============

export async function getCashEvents(simId: number): Promise<CashEvent[]> {
  return db
    .select()
    .from(cashEvents)
    .where(eq(cashEvents.simulationId, simId))
    .orderBy(desc(cashEvents.tradeDate), desc(cashEvents.createdAt));
}

export async function addCashEvent(data: {
  simulationId: number;
  tradeDate: string;
  action: string;
  amount: number;
  notes?: string | null;
}): Promise<CashEvent> {
  const [row] = await db.insert(cashEvents).values({
    simulationId: data.simulationId,
    tradeDate: data.tradeDate,
    action: data.action,
    amount: data.amount,
    notes: data.notes ?? null,
  }).returning();
  return row;
}

export async function updateCashEvent(
  id: number,
  data: Partial<{ tradeDate: string; action: string; amount: number; notes: string | null }>,
): Promise<CashEvent> {
  const [updated] = await db.update(cashEvents).set(data).where(eq(cashEvents.id, id)).returning();
  return updated;
}

export async function deleteCashEvent(id: number): Promise<void> {
  await db.delete(cashEvents).where(eq(cashEvents.id, id));
}

// ============ Database Browser ============

export async function getApiCacheEntries() {
  return db
    .select()
    .from(apiCache)
    .orderBy(desc(apiCache.fetchedAt))
    .limit(200);
}

export async function getApiUsageEntries() {
  return db
    .select()
    .from(apiUsage)
    .orderBy(desc(apiUsage.createdAt))
    .limit(200);
}

export async function getOptionsDeltaCacheEntries() {
  return db
    .select()
    .from(optionsDeltaCache)
    .orderBy(desc(optionsDeltaCache.fetchedAt))
    .limit(500);
}

// ============ Options Targets ============

export async function getOptionsTargets(simId: number) {
  return db.select().from(optionsTargets)
    .where(eq(optionsTargets.simulationId, simId))
    .orderBy(desc(optionsTargets.createdAt));
}

export async function createOptionsTarget(body: {
  simulationId: number;
  action: string;
  callPut: string;
  targetDelta: number;
  contractMonth?: string | null;
  quantity?: number;
  notes?: string | null;
}) {
  const [row] = await db.insert(optionsTargets).values({
    simulationId: body.simulationId,
    action: body.action,
    callPut: body.callPut,
    targetDelta: body.targetDelta,
    contractMonth: body.contractMonth ?? null,
    quantity: body.quantity ?? 1,
    notes: body.notes ?? null,
  }).returning();
  return row;
}

export async function deleteOptionsTarget(id: number) {
  await db.delete(optionsTargets).where(eq(optionsTargets.id, id));
}

export async function updateLoan(
  id: number,
  data: Partial<{
    name: string;
    principal: number;
    annualRate: number;
    periods: number;
    startDate: string;
    loanType: "annuity" | "interest_only";
    prepaymentStrategy: "reduce_payment" | "reduce_term";
    notes: string | null;
  }>
) {
  if (!(await db.select({ id: loans.id }).from(loans).where(eq(loans.id, id)).limit(1))[0]) throw new Error("找不到貸款");
  const [updated] = await db.update(loans).set(data).where(eq(loans.id, id)).returning();
  if (!updated) throw new Error("找不到貸款");
  return updated;
}

export async function updateOptionsTarget(
  id: number,
  data: Partial<{
    action: string;
    callPut: string;
    targetDelta: number;
    contractMonth: string | null;
    quantity: number;
    notes: string | null;
  }>
) {
  const [updated] = await db.update(optionsTargets).set(data).where(eq(optionsTargets.id, id)).returning();
  if (!updated) throw new Error("找不到目標");
  return updated;
}

export async function getOptionsTargetMatches(simId: number) {
  const targets = await db.select().from(optionsTargets)
    .where(eq(optionsTargets.simulationId, simId));

  // 取最新交易日
  const latestDateRow = await db.select({ tradeDate: optionsDeltaCache.tradeDate })
    .from(optionsDeltaCache)
    .orderBy(desc(optionsDeltaCache.tradeDate))
    .limit(1);

  if (latestDateRow.length === 0 || targets.length === 0) {
    return targets.map(t => ({
      target: t,
      matchedStrike: null as number | null,
      matchedDelta: null as number | null,
      matchedPrice: null as number | null,
      matchedContractMonth: null as string | null,
      lastMarketDate: null as string | null,
      lastFetchedAt: null as string | null,
    }));
  }

  const latestDate = latestDateRow[0].tradeDate;
  const rows = await db.select().from(optionsDeltaCache)
    .where(eq(optionsDeltaCache.tradeDate, latestDate));

  const lastFetchedAt = rows.reduce<string | null>((max, r) => {
    const fa = r.fetchedAt ?? null;
    return !max || (fa && fa > max) ? fa : max;
  }, null);

  return targets.map(target => {
    let candidates = rows.filter(r => r.callPut === target.callPut && r.delta != null);

    if (target.contractMonth) {
      candidates = candidates.filter(r => r.contractMonth === target.contractMonth);
    } else {
      const months = [...new Set(candidates.map(r => r.contractMonth).filter(Boolean))].sort();
      if (months.length > 0) candidates = candidates.filter(r => r.contractMonth === months[0]);
    }

    if (candidates.length === 0) {
      return {
        target, matchedStrike: null as number | null, matchedDelta: null as number | null,
        matchedPrice: null as number | null, matchedContractMonth: null as string | null,
        lastMarketDate: latestDate, lastFetchedAt,
      };
    }

    const absDelta = Math.abs(target.targetDelta);
    let best = candidates[0];
    let bestDiff = Math.abs(Math.abs(best.delta!) - absDelta);
    for (let i = 1; i < candidates.length; i++) {
      const diff = Math.abs(Math.abs(candidates[i].delta!) - absDelta);
      if (diff < bestDiff) { best = candidates[i]; bestDiff = diff; }
    }

    return {
      target,
      matchedStrike: best.strikePrice,
      matchedDelta: best.delta,
      matchedPrice: best.closePrice,
      matchedContractMonth: best.contractMonth ?? null,
      lastMarketDate: latestDate,
      lastFetchedAt,
    };
  });
}

// ============ App Settings ============

export async function getAppSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(appSettings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function upsertAppSetting(key: string, value: string) {
  const existing = await db.select().from(appSettings).where(eq(appSettings.key, key));
  if (existing.length > 0) {
    const [updated] = await db.update(appSettings)
      .set({ value, updatedAt: new Date().toISOString() })
      .where(eq(appSettings.key, key))
      .returning();
    return updated;
  }
  const [created] = await db.insert(appSettings).values({ key, value }).returning();
  return created;
}
