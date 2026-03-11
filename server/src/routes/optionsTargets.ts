import { Router } from "express";
import { db } from "../db/index.js";
import { optionsTargets, optionsDeltaCache } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// GET /api/options-targets?simId=
router.get("/", async (req, res) => {
  const simId = req.query.simId ? Number(req.query.simId) : undefined;
  const rows = simId
    ? await db.select().from(optionsTargets).where(eq(optionsTargets.simulationId, simId)).orderBy(desc(optionsTargets.createdAt))
    : await db.select().from(optionsTargets).orderBy(desc(optionsTargets.createdAt));
  res.json(rows);
});

// POST /api/options-targets
router.post("/", async (req, res) => {
  const { simulationId, action, callPut, targetDelta, contractMonth, quantity, notes } = req.body;
  if (!simulationId || !action || !callPut || targetDelta == null) {
    return res.status(400).json({ error: "缺少必要欄位" });
  }
  const [row] = await db.insert(optionsTargets).values({
    simulationId, action, callPut, targetDelta,
    contractMonth: contractMonth || null,
    quantity: quantity ?? 1,
    notes: notes ?? null,
  }).returning();
  res.json(row);
});

// PATCH /api/options-targets/:id
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, any> = {};
  for (const key of ["action", "callPut", "targetDelta", "contractMonth", "quantity", "notes"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(optionsTargets).set(updates).where(eq(optionsTargets.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "找不到目標" });
  res.json(updated);
});

// DELETE /api/options-targets/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(optionsTargets).where(eq(optionsTargets.id, id));
  res.json({ ok: true });
});

// GET /api/options-targets/match?simId= — 取得所有 target 的 delta 匹配結果
router.get("/match", async (req, res) => {
  const simId = req.query.simId ? Number(req.query.simId) : undefined;
  if (!simId) return res.status(400).json({ error: "缺少 simId" });

  const targets = await db.select().from(optionsTargets)
    .where(eq(optionsTargets.simulationId, simId));

  // 取最新交易日的 delta 資料
  const latestDateRow = await db.select({ tradeDate: optionsDeltaCache.tradeDate })
    .from(optionsDeltaCache)
    .orderBy(desc(optionsDeltaCache.tradeDate))
    .limit(1);

  if (latestDateRow.length === 0 || targets.length === 0) {
    return res.json(targets.map(t => ({
      target: t,
      matchedStrike: null, matchedDelta: null, matchedPrice: null,
      matchedContractMonth: null, lastMarketDate: null, lastFetchedAt: null,
    })));
  }

  const latestDate = latestDateRow[0].tradeDate;
  const rows = await db.select().from(optionsDeltaCache)
    .where(eq(optionsDeltaCache.tradeDate, latestDate));

  // Import matching logic inline (avoid ESM import issues)
  const lastFetchedAt = rows.reduce<string | null>((max, r) => {
    const fa = r.fetchedAt ?? null;
    return !max || (fa && fa > max) ? fa : max;
  }, null);

  const results = targets.map(target => {
    let candidates = rows.filter(r => r.callPut === target.callPut && r.delta != null);

    if (target.contractMonth) {
      candidates = candidates.filter(r => r.contractMonth === target.contractMonth);
    } else {
      const months = [...new Set(candidates.map(r => r.contractMonth).filter(Boolean))].sort();
      if (months.length > 0) candidates = candidates.filter(r => r.contractMonth === months[0]);
    }

    if (candidates.length === 0) {
      return {
        target, matchedStrike: null, matchedDelta: null, matchedPrice: null,
        matchedContractMonth: null, lastMarketDate: latestDate, lastFetchedAt,
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
      matchedContractMonth: best.contractMonth,
      lastMarketDate: latestDate,
      lastFetchedAt,
    };
  });

  res.json(results);
});

export default router;
