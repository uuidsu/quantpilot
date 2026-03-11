import { Router } from "express";
import { db } from "../db/index.js";
import { appSettings } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/settings — 取得所有設定
router.get("/", async (_req, res) => {
  const rows = await db.select().from(appSettings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  res.json(map);
});

// GET /api/settings/:key
router.get("/:key", async (req, res) => {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, req.params.key));
  res.json(row ?? null);
});

// PUT /api/settings/:key — upsert
router.put("/:key", async (req, res) => {
  const { value } = req.body;
  if (value == null) return res.status(400).json({ error: "缺少 value" });

  const existing = await db.select().from(appSettings).where(eq(appSettings.key, req.params.key));
  if (existing.length > 0) {
    const [updated] = await db.update(appSettings)
      .set({ value, updatedAt: new Date().toISOString() })
      .where(eq(appSettings.key, req.params.key))
      .returning();
    return res.json(updated);
  }
  const [created] = await db.insert(appSettings).values({ key: req.params.key, value }).returning();
  res.json(created);
});

export default router;
