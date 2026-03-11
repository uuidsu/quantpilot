import { Router } from "express";
import { db } from "../db/index.js";
import { simulations } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

// POST /api/simulations — 建立新模擬局
router.post("/", async (_req, res) => {
  const [simulation] = await db.insert(simulations).values({}).returning();
  res.json(simulation);
});

// GET /api/simulations — 列出所有模擬局
router.get("/", async (_req, res) => {
  const rows = await db.select().from(simulations).orderBy(desc(simulations.createdAt));
  res.json(rows);
});

// GET /api/simulations/:id — 取得單一模擬
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [simulation] = await db.select().from(simulations).where(eq(simulations.id, id));
  if (!simulation) return res.status(404).json({ error: "找不到模擬局" });
  res.json(simulation);
});

// PATCH /api/simulations/:id — 更新（cash / leverageLimit / exposureTarget）
router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { cash, leverageLimit, exposureTarget } = req.body;
  const updates: Record<string, number> = {};
  if (cash !== undefined) updates.cash = cash;
  if (leverageLimit !== undefined) updates.leverageLimit = leverageLimit;
  if (exposureTarget !== undefined) updates.exposureTarget = exposureTarget;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "沒有要更新的欄位" });
  }

  const [updated] = await db.update(simulations).set(updates).where(eq(simulations.id, id)).returning();
  if (!updated) return res.status(404).json({ error: "找不到模擬局" });
  res.json(updated);
});

// DELETE /api/simulations/:id — 刪除模擬局
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(simulations).where(eq(simulations.id, id));
  res.json({ ok: true });
});

export default router;
