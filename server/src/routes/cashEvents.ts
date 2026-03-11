import { Router } from "express";
import { db } from "../db/index.js";
import { cashEvents } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/cash-events?simId=<id>
router.get("/", async (req, res) => {
  const simId = req.query.simId ? Number(req.query.simId) : undefined;
  if (!simId) return res.status(400).json({ error: "缺少 simId" });
  const rows = await db
    .select()
    .from(cashEvents)
    .where(eq(cashEvents.simulationId, simId))
    .orderBy(desc(cashEvents.tradeDate), desc(cashEvents.createdAt));
  res.json(rows);
});

// POST /api/cash-events
router.post("/", async (req, res) => {
  const { simulationId, tradeDate, action, amount, notes } = req.body;
  if (!simulationId || !tradeDate || !action || amount == null) {
    return res.status(400).json({ error: "缺少必要欄位" });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: "amount 必須大於 0" });
  }
  const [row] = await db.insert(cashEvents).values({
    simulationId,
    tradeDate,
    action,
    amount,
    notes: notes ?? null,
  }).returning();
  res.json(row);
});

// PATCH /api/cash-events/:id
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = {};
  for (const key of ["tradeDate", "action", "amount", "notes"]) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(cashEvents).set(updates).where(eq(cashEvents.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "找不到記錄" });
  res.json(updated);
});

// DELETE /api/cash-events/:id
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(cashEvents).where(eq(cashEvents.id, id));
  res.json({ ok: true });
});

export default router;
