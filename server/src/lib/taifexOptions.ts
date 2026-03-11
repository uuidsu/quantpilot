import { db } from "../db/index.js";
import { optionsDeltaCache, apiUsage } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";

const TAIFEX_COOLDOWN_MS = 60 * 60 * 1000;

interface TaifexDeltaRow {
  Contract?: string;
  CallPut?: string;
  "ContractMonth(Week)"?: string;
  StrikePrice?: string;
  Delta?: string;
  ContractSettlementDay?: string;
  [key: string]: string | undefined;
}

export function getTradeDateStr(now: Date = new Date()): string {
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

export async function fetchAndCacheDelta(
  contractId = "TXO"
): Promise<{ date: string; count: number } | { error: string }> {
  try {
    const tradeDate = getTradeDateStr();

    // Check existing cache
    const existing = await db
      .select()
      .from(optionsDeltaCache)
      .where(and(eq(optionsDeltaCache.tradeDate, tradeDate), eq(optionsDeltaCache.contractId, contractId)))
      .limit(1);

    if (existing.length > 0) {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(optionsDeltaCache)
        .where(and(eq(optionsDeltaCache.tradeDate, tradeDate), eq(optionsDeltaCache.contractId, contractId)));
      return { date: tradeDate, count: Number(countResult[0]?.count ?? 0) };
    }

    // Cooldown check
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
      const remainMs = lastCall ? TAIFEX_COOLDOWN_MS - (Date.now() - new Date(lastCall).getTime()) : 0;
      const remainMin = Math.max(1, Math.ceil(remainMs / 60000));
      return { error: `冷卻中，${remainMin} 分鐘後可再拉取` };
    }

    // Fetch from TAIFEX
    const t0 = Date.now();
    let logged = false;
    try {
      const resp = await fetch("https://openapi.taifex.com.tw/v1/DailyOptionsDelta", {
        headers: { Accept: "application/json", "User-Agent": "QuantPilot/1.0" },
      });
      const elapsed = Date.now() - t0;

      if (!resp.ok) {
        logged = true;
        await db.insert(apiUsage).values({
          source: "taifex_options", symbol: contractId, success: false, responseTimeMs: elapsed,
        });
        throw new Error(`TAIFEX API error: ${resp.status}`);
      }

      const rawData: TaifexDeltaRow[] = await resp.json();
      logged = true;
      await db.insert(apiUsage).values({
        source: "taifex_options", symbol: contractId, success: true, responseTimeMs: elapsed,
      });

      const optionsRows = rawData.filter((r) => r.Contract === contractId);
      if (optionsRows.length === 0) {
        return { error: "TAIFEX 未回傳選擇權資料，可能是非交易日或 API 暫時不可用" };
      }

      const toInsert = optionsRows.map((row) => {
        const callPutLabel = row.CallPut ?? "";
        const callPut = callPutLabel === "買權" ? "C" : callPutLabel === "賣權" ? "P" : callPutLabel;
        return {
          tradeDate,
          contractId,
          contractMonth: row["ContractMonth(Week)"] ?? null,
          settlementDay: row.ContractSettlementDay ?? null,
          strikePrice: parseFloat(row.StrikePrice ?? "0"),
          callPut,
          openPrice: null,
          highPrice: null,
          lowPrice: null,
          closePrice: null,
          volume: null,
          openInterest: null,
          delta: row.Delta ? parseFloat(row.Delta) : null,
        };
      });

      if (toInsert.length > 0) {
        await db.insert(optionsDeltaCache).values(toInsert);
      }

      // Clean up old data
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      await db.delete(optionsDeltaCache).where(sql`${optionsDeltaCache.fetchedAt} < ${threeDaysAgo}`);

      return { date: tradeDate, count: toInsert.length };
    } catch (err) {
      if (!logged) {
        await db.insert(apiUsage).values({
          source: "taifex_options", symbol: contractId, success: false, responseTimeMs: Date.now() - t0,
        }).catch(() => {});
      }
      throw err;
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "無法取得選擇權資料" };
  }
}
