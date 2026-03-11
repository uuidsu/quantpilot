import { Router } from "express";
import { db } from "../db/index.js";
import { optionsDeltaCache, apiUsage } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { fetchAndCacheDelta, getTradeDateStr } from "../lib/taifexOptions.js";

const TAIFEX_COOLDOWN_MS = 60 * 60 * 1000;
const router = Router();

// POST /api/options/fetch — fetch and cache delta (with cooldown)
router.post("/fetch", async (req, res) => {
  const contractId = (req.body.contractId as string) || "TXO";
  const result = await fetchAndCacheDelta(contractId);
  res.json(result);
});

// GET /api/options/rows?contractId&tradeDate — query cached data
router.get("/rows", async (req, res) => {
  const contractId = (req.query.contractId as string) || "TXO";
  const tradeDate = (req.query.tradeDate as string) || getTradeDateStr();
  const rows = await db
    .select()
    .from(optionsDeltaCache)
    .where(and(eq(optionsDeltaCache.tradeDate, tradeDate), eq(optionsDeltaCache.contractId, contractId)))
    .orderBy(optionsDeltaCache.strikePrice);
  res.json(rows);
});

// GET /api/options/dates?contractId — available dates
router.get("/dates", async (req, res) => {
  const contractId = (req.query.contractId as string) || "TXO";
  const rows = await db
    .selectDistinct({ tradeDate: optionsDeltaCache.tradeDate })
    .from(optionsDeltaCache)
    .where(eq(optionsDeltaCache.contractId, contractId))
    .orderBy(desc(optionsDeltaCache.tradeDate));
  res.json(rows.map((r) => r.tradeDate));
});

// GET /api/options/price-map?contractId&days — recent dates' closePrice keyed by tradeDate|contractId|contractMonth|callPut|strikePrice
router.get("/price-map", async (req, res) => {
  const contractId = (req.query.contractId as string) || "TXO";
  const days = Math.min(Number(req.query.days) || 60, 180);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

  // Group by tradeDate → { key → closePrice }
  const result: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    if (r.closePrice == null || !r.contractMonth) continue;
    const dateKey = r.tradeDate;
    const holdKey = `${r.contractId}|${r.contractMonth}|${r.callPut}|${r.strikePrice}`;
    if (!result[dateKey]) result[dateKey] = {};
    result[dateKey][holdKey] = r.closePrice;
  }
  res.json(result);
});

// GET /api/options/stats — API stats + cooldown
router.get("/stats", async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const calls = await db
    .select()
    .from(apiUsage)
    .where(and(eq(apiUsage.source, "taifex_options"), sql`${apiUsage.createdAt} >= ${since}`))
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

  res.json({ calls, cooldownUntil });
});

export default router;
