import { Router } from "express";
import { db } from "../db/index.js";
import { sourceConfigs } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/sources — 取得所有來源設定
router.get("/", async (_req, res) => {
  const rows = await db.select().from(sourceConfigs);
  res.json(rows);
});

// PUT /api/sources/:sourceId — 更新來源 API Key
router.put("/:sourceId", async (req, res) => {
  const { sourceId } = req.params;
  const { apiKey } = req.body;

  const [row] = await db
    .insert(sourceConfigs)
    .values({ sourceId, apiKey: apiKey ?? null, isDefault: false })
    .onConflictDoUpdate({
      target: sourceConfigs.sourceId,
      set: { apiKey: apiKey ?? null, updatedAt: new Date().toISOString() },
    })
    .returning();
  res.json(row);
});

// POST /api/sources/:sourceId/set-default — 設為預設來源
router.post("/:sourceId/set-default", async (req, res) => {
  const { sourceId } = req.params;

  await db.update(sourceConfigs).set({ isDefault: false });
  await db
    .insert(sourceConfigs)
    .values({ sourceId, apiKey: null, isDefault: true })
    .onConflictDoUpdate({
      target: sourceConfigs.sourceId,
      set: { isDefault: true, updatedAt: new Date().toISOString() },
    });

  res.json({ ok: true });
});

export default router;
