import express from "express";
import cors from "cors";
import { db } from "./db/index.js";
import { apiUsage, apiCache, optionsDeltaCache } from "./db/schema.js";
import { desc, sql } from "drizzle-orm";
import simulationsRouter from "./routes/simulations.js";
import symbolMetaRouter from "./routes/symbolMeta.js";
import sourcesRouter from "./routes/sources.js";
import searchRouter from "./routes/search.js";
import strategiesRouter from "./routes/strategies.js";
import optionsRouter from "./routes/options.js";
import optionsTradesRouter from "./routes/optionsTrades.js";
import stockTradesRouter from "./routes/stockTrades.js";
import loansRouter from "./routes/loans.js";
import optionsTargetsRouter from "./routes/optionsTargets.js";
import appSettingsRouter from "./routes/appSettings.js";
import cashEventsRouter from "./routes/cashEvents.js";

const app = express();
const PORT = Number(process.env.API_PORT) || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/simulations", simulationsRouter);
app.use("/api/symbol-meta", symbolMetaRouter);
app.use("/api", strategiesRouter);
app.use("/api/sources", sourcesRouter);
app.use("/api/search", searchRouter);
app.use("/api/options", optionsRouter);
app.use("/api/options", optionsTradesRouter);
app.use("/api/stock-trades", stockTradesRouter);
app.use("/api/loans", loansRouter);
app.use("/api/options-targets", optionsTargetsRouter);
app.use("/api/settings", appSettingsRouter);
app.use("/api/cash-events", cashEventsRouter);

// GET /api/stats — API 使用統計
app.get("/api/stats", async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(apiUsage)
    .where(sql`${apiUsage.createdAt} >= ${since}`)
    .orderBy(desc(apiUsage.createdAt));
  res.json(rows);
});

// GET /api/db/price-cache — 股價快取
app.get("/api/db/price-cache", async (_req, res) => {
  const rows = await db.select().from(apiCache).orderBy(desc(apiCache.fetchedAt)).limit(200);
  res.json(rows);
});

// GET /api/db/delta-cache — 選擇權 Delta 快取
app.get("/api/db/delta-cache", async (_req, res) => {
  const rows = await db.select().from(optionsDeltaCache).orderBy(desc(optionsDeltaCache.fetchedAt)).limit(500);
  res.json(rows);
});

// GET /api/db/api-usage — API 使用紀錄
app.get("/api/db/api-usage", async (_req, res) => {
  const rows = await db.select().from(apiUsage).orderBy(desc(apiUsage.createdAt)).limit(200);
  res.json(rows);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`QuantPilot API server running on port ${PORT}`);
});
