import { NextResponse } from "next/server";

interface TwseStock { Code: string; Name: string }
interface TpexStock { SecuritiesCompanyCode: string; CompanyName: string }

type CacheEntry = { items: { code: string; name: string; suffix: string }[]; at: number };
const cache: Record<string, CacheEntry> = {};
const TTL = 24 * 60 * 60 * 1000;

async function fetchTwse() {
  if (cache.twse && Date.now() - cache.twse.at < TTL) return cache.twse.items;
  try {
    const res = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL", {
      headers: { Accept: "application/json" }, cache: "no-store",
    });
    if (!res.ok) return cache.twse?.items ?? [];
    const data: TwseStock[] = await res.json();
    const items = data
      .filter(s => /^\d{4,6}[A-Z]?$/.test(s.Code)) // 上市股+ETF（含含字母的ETF如00632R）
      .map(s => ({ code: s.Code, name: s.Name, suffix: ".TW" }));
    cache.twse = { items, at: Date.now() };
    return items;
  } catch { return cache.twse?.items ?? []; }
}

async function fetchTpex() {
  if (cache.tpex && Date.now() - cache.tpex.at < TTL) return cache.tpex.items;
  try {
    const res = await fetch("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes", {
      headers: { Accept: "application/json" }, cache: "no-store",
    });
    if (!res.ok) return cache.tpex?.items ?? [];
    const data: TpexStock[] = await res.json();
    const items = data
      .filter(s => /^\d{4,6}[A-Z]?$/.test(s.SecuritiesCompanyCode)) // 上櫃股+ETF（含含字母的ETF如00969B）
      .map(s => ({ code: s.SecuritiesCompanyCode, name: s.CompanyName, suffix: ".TWO" }));
    cache.tpex = { items, at: Date.now() };
    return items;
  } catch { return cache.tpex?.items ?? []; }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toUpperCase() ?? "";
  if (q.length < 1) return NextResponse.json([]);

  const [twse, tpex] = await Promise.all([fetchTwse(), fetchTpex()]);
  const all = [...twse, ...tpex];

  const results = all
    .filter(s => s.code.startsWith(q) || s.name.includes(q))
    .slice(0, 8)
    .map(s => ({
      symbol: `${s.code}${s.suffix}`,
      name: s.name,
      exchange: s.suffix === ".TW" ? "上市" : "上櫃",
    }));

  return NextResponse.json(results);
}
