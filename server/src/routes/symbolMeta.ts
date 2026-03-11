import { Router } from "express";
import { db } from "../db/index.js";
import { symbolMeta, apiCache, apiUsage, sourceConfigs } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { fetchPrice, type ProviderId } from "../lib/priceProviders.js";

const router = Router();

// GET /api/symbol-meta
router.get("/", async (_req, res) => {
  const rows = await db.select().from(symbolMeta);
  res.json(rows);
});

// PATCH /api/symbol-meta/:symbol
router.patch("/:symbol", async (req, res) => {
  const sym = req.params.symbol;
  const { beta, currentPrice } = req.body;
  const updates: Record<string, unknown> = {};
  if (beta !== undefined) updates.beta = beta;
  if (currentPrice !== undefined) updates.currentPrice = currentPrice;

  const [row] = await db
    .insert(symbolMeta)
    .values({ symbol: sym, beta: beta ?? 1.0, currentPrice: currentPrice ?? 0 })
    .onConflictDoUpdate({ target: symbolMeta.symbol, set: updates })
    .returning();
  res.json(row);
});

// POST /api/symbol-meta/:symbol/fetch-price
router.post("/:symbol/fetch-price", async (req, res) => {
  const sym = req.params.symbol;

  const [defaultCfg] = await db.select().from(sourceConfigs).where(eq(sourceConfigs.isDefault, true)).limit(1);
  const providerId: ProviderId = (defaultCfg?.sourceId as ProviderId) ?? "twse";

  let apiKey: string | undefined;
  if (providerId !== "twse") {
    const [cfg] = await db.select().from(sourceConfigs).where(eq(sourceConfigs.sourceId, providerId)).limit(1);
    apiKey = cfg?.apiKey ?? undefined;
  }

  const start = Date.now();
  let success = false;

  try {
    const result = await fetchPrice(sym, providerId, apiKey);
    success = true;
    const elapsed = Date.now() - start;

    if (!result.fromCache) {
      await db.insert(apiUsage).values({ source: providerId, symbol: result.symbol, success: true, responseTimeMs: elapsed });
      await db.insert(apiCache).values({ symbol: result.symbol, source: providerId, price: result.price });
    }

    const [updated] = await db
      .insert(symbolMeta)
      .values({ symbol: sym, beta: 1.0, currentPrice: result.price, priceUpdatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: symbolMeta.symbol,
        set: { currentPrice: result.price, priceUpdatedAt: new Date().toISOString() },
      })
      .returning();

    res.json({ symbolMeta: updated, fromCache: result.fromCache, provider: providerId });
  } catch (err) {
    if (!success) {
      await db.insert(apiUsage).values({ source: providerId, symbol: sym.toUpperCase(), success: false, responseTimeMs: Date.now() - start });
    }
    res.status(500).json({ error: err instanceof Error ? err.message : "撈取失敗" });
  }
});

export default router;
