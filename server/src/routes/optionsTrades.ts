import { Router } from "express";
import { db } from "../db/index.js";
import { optionsTrades } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/options/trades?simId=<id>
router.get("/trades", async (req, res) => {
  const simId = req.query.simId ? Number(req.query.simId) : null;
  const rows = await db
    .select()
    .from(optionsTrades)
    .where(simId != null ? eq(optionsTrades.simulationId, simId) : undefined)
    .orderBy(desc(optionsTrades.tradeDate), desc(optionsTrades.createdAt));
  res.json(rows);
});

// POST /api/options/trades
router.post("/trades", async (req, res) => {
  const { simulationId, tradeDate, action, contractId, contractMonth, callPut, strikePrice, price, quantity, fee, notes } = req.body;
  const [row] = await db
    .insert(optionsTrades)
    .values({
      simulationId: simulationId ?? null,
      tradeDate,
      action,
      contractId: contractId ?? "TXO",
      contractMonth,
      callPut,
      strikePrice,
      price,
      quantity,
      fee: fee ?? 0,
      notes: notes ?? null,
    })
    .returning();
  res.json(row);
});

// PATCH /api/options/trades/:id
router.patch("/trades/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const key of ["tradeDate", "action", "contractId", "contractMonth", "callPut", "strikePrice", "price", "quantity", "fee", "notes"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "沒有要更新的欄位" });
  }
  const [updated] = await db.update(optionsTrades).set(updates).where(eq(optionsTrades.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "交易紀錄不存在" });
  res.json(updated);
});

// DELETE /api/options/trades/:id
router.delete("/trades/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(optionsTrades).where(eq(optionsTrades.id, id));
  res.json({ ok: true });
});

export default router;
