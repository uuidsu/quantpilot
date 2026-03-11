import { Router } from "express";

interface TwseStock { Code: string; Name: string }
interface TpexStock { SecuritiesCompanyCode: string; CompanyName: string }

type CacheEntry = { items: { code: string; name: string; suffix: string }[]; at: number };
const cache: Record<string, CacheEntry> = {};
const TTL = 24 * 60 * 60 * 1000;

async function fetchTwseList() {
  if (cache.twse && Date.now() - cache.twse.at < TTL) return cache.twse.items;
  try {
    const res = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return cache.twse?.items ?? [];
    const data: TwseStock[] = await res.json();
    const items = data
      .filter(s => /^\d{4,6}[A-Z]?$/.test(s.Code))
      .map(s => ({ code: s.Code, name: s.Name, suffix: ".TW" }));
    cache.twse = { items, at: Date.now() };
    return items;
  } catch { return cache.twse?.items ?? []; }
}

async function fetchTpexList() {
  if (cache.tpex && Date.now() - cache.tpex.at < TTL) return cache.tpex.items;
  try {
    const res = await fetch("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return cache.tpex?.items ?? [];
    const data: TpexStock[] = await res.json();
    const items = data
      .filter(s => /^\d{4,6}[A-Z]?$/.test(s.SecuritiesCompanyCode))
      .map(s => ({ code: s.SecuritiesCompanyCode, name: s.CompanyName, suffix: ".TWO" }));
    cache.tpex = { items, at: Date.now() };
    return items;
  } catch { return cache.tpex?.items ?? []; }
}

const router = Router();

// GET /api/search?q=...
router.get("/", async (req, res) => {
  const q = (req.query.q as string || "").trim().toUpperCase();
  if (q.length < 1) return res.json([]);

  const [twse, tpex] = await Promise.all([fetchTwseList(), fetchTpexList()]);
  const all = [...twse, ...tpex];

  const results = all
    .filter(s => s.code.startsWith(q) || s.name.includes(q))
    .slice(0, 8)
    .map(s => ({
      symbol: `${s.code}${s.suffix}`,
      name: s.name,
      exchange: s.suffix === ".TW" ? "上市" : "上櫃",
    }));

  res.json(results);
});

// GET /api/search/yahoo?q=...
router.get("/yahoo", async (req, res) => {
  const q = (req.query.q as string || "").trim();
  if (q.length < 1) return res.json([]);

  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
      }
    );
    if (!r.ok) return res.json([]);
    const data = await r.json();
    const results = (data?.quotes ?? [])
      .filter((q: { quoteType?: string }) => q.quoteType === "EQUITY" || q.quoteType === "ETF")
      .slice(0, 6)
      .map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string }) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || "",
      }));
    res.json(results);
  } catch {
    res.json([]);
  }
});

export default router;
