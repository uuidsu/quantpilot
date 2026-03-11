import { Router } from "express";
import { db } from "../db/index.js";
import { stockTrades } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/stock-trades?simId=<id>
router.get("/", async (req, res) => {
  const simId = req.query.simId ? Number(req.query.simId) : null;
  const rows = await db
    .select()
    .from(stockTrades)
    .where(simId != null ? eq(stockTrades.simulationId, simId) : undefined)
    .orderBy(desc(stockTrades.tradeDate), desc(stockTrades.createdAt));
  res.json(rows);
});

// POST /api/stock-trades
router.post("/", async (req, res) => {
  const { simulationId, tradeDate, action, symbol, price, quantity, fee, notes } = req.body;
  const [row] = await db
    .insert(stockTrades)
    .values({
      simulationId: simulationId ?? null,
      tradeDate,
      action,
      symbol,
      price,
      quantity,
      fee: fee ?? 0,
      notes: notes ?? null,
    })
    .returning();
  res.json(row);
});

// PATCH /api/stock-trades/:id
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const key of ["tradeDate", "action", "symbol", "price", "quantity", "fee", "notes"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "沒有要更新的欄位" });
  }
  const [updated] = await db.update(stockTrades).set(updates).where(eq(stockTrades.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "交易紀錄不存在" });
  res.json(updated);
});

// DELETE /api/stock-trades/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(stockTrades).where(eq(stockTrades.id, id));
  res.json({ ok: true });
});

export default router;
