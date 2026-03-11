import { Router } from "express";
import { db } from "../db/index.js";
import { strategies } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/simulations/:simId/strategies
router.get("/simulations/:simId/strategies", async (req, res) => {
  const simId = Number(req.params.simId);
  const rows = await db
    .select()
    .from(strategies)
    .where(eq(strategies.simulationId, simId))
    .orderBy(strategies.createdAt);
  res.json(rows);
});

// POST /api/simulations/:simId/strategies
router.post("/simulations/:simId/strategies", async (req, res) => {
  const simId = Number(req.params.simId);
  const { name, leverageLimit, leverageCap, exposureTarget, deltaMin, deltaMax } = req.body;
  const [strategy] = await db
    .insert(strategies)
    .values({
      simulationId: simId,
      name: name ?? "預設策略",
      leverageLimit: leverageLimit ?? 1.5,
      leverageCap: leverageCap ?? null,
      exposureTarget: exposureTarget ?? 1.0,
      deltaMin: deltaMin ?? null,
      deltaMax: deltaMax ?? null,
    })
    .returning();
  res.json(strategy);
});

// PATCH /api/strategies/:id
router.patch("/strategies/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, leverageLimit, leverageCap, exposureTarget, deltaMin, deltaMax } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (leverageLimit !== undefined) updates.leverageLimit = leverageLimit;
  if (leverageCap !== undefined) updates.leverageCap = leverageCap;
  if (exposureTarget !== undefined) updates.exposureTarget = exposureTarget;
  if (deltaMin !== undefined) updates.deltaMin = deltaMin;
  if (deltaMax !== undefined) updates.deltaMax = deltaMax;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "沒有要更新的欄位" });
  }

  const [updated] = await db.update(strategies).set(updates).where(eq(strategies.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "策略不存在" });
  res.json(updated);
});

// DELETE /api/strategies/:id
router.delete("/strategies/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(strategies).where(eq(strategies.id, id));
  res.json({ ok: true });
});

export default router;
