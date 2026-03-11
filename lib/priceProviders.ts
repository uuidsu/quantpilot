/**
 * 統一股價撈取模組（台股版）
 *
 * 新增 Provider 方式：
 * 1. 在 PROVIDER_DEFS 加一筆定義
 * 2. 在 fetcherMap 加對應的 fetch function
 * 快取統一在 fetchPrice() 處理，各 provider 只需實作取得原始價格
 */

export type ProviderId = "twse" | "fugle";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  requiresKey: boolean;
  keyLabel: string;
  keyPlaceholder: string;
}

export const PROVIDER_DEFS: ProviderDef[] = [
  {
    id: "twse",
    label: "證交所 TWSE（免費）",
    requiresKey: false,
    keyLabel: "",
    keyPlaceholder: "",
  },
  {
    id: "fugle",
    label: "富果 Fugle",
    requiresKey: true,
    keyLabel: "API Token",
    keyPlaceholder: "fugle-api-token-xxx",
  },
];

// ─── 各 Provider 的原始 fetch 實作 ───────────────────────────────────────────

async function fetchTwse(symbol: string): Promise<number> {
  // symbol 格式：2330.TW（上市）或 006201.TWO（上櫃）
  const [code, suffix] = symbol.split(".");
  const ex = suffix === "TWO" ? "otc" : "tse";
  const res = await fetch(
    `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${ex}_${code}.tw&json=1&delay=0`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`TWSE MIS 回應 ${res.status}`);
  const data = await res.json();
  const info = data?.msgArray?.[0];
  if (!info) throw new Error(`找不到 ${code}`);
  // z = 即時成交價，y = 昨收（收盤後或未開盤時 z 為 "-"）
  const raw = info.z !== "-" ? info.z : info.y;
  const price = parseFloat(raw);
  if (isNaN(price) || price <= 0) throw new Error(`${code} 無法取得股價`);
  return price;
}

async function fetchFugle(symbol: string, apiKey?: string): Promise<number> {
  if (!apiKey) throw new Error("富果需要 API Token");
  const res = await fetch(
    `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${symbol}`,
    {
      headers: { "X-API-KEY": apiKey, Accept: "application/json" },
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`富果 API 回應 ${res.status}`);
  const data = await res.json();
  const price = data?.lastPrice ?? data?.closePrice ?? data?.referencePrice ?? null;
  if (typeof price !== "number") throw new Error("富果無法解析股價");
  return price;
}

// ─── Provider → fetch function 對應表 ────────────────────────────────────────

type FetchFn = (symbol: string, apiKey?: string) => Promise<number>;

const fetcherMap: Record<ProviderId, FetchFn> = {
  twse: fetchTwse,
  fugle: fetchFugle,
};

// ─── 統一入口（快取在這裡處理）──────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  price: number;
  ts: number;
  provider: ProviderId;
}

const memCache = new Map<string, CacheEntry>();

export interface FetchResult {
  price: number;
  fromCache: boolean;
  provider: ProviderId;
  symbol: string;
  fetchedAt: Date;
}

export async function fetchPrice(
  symbol: string,
  provider: ProviderId,
  apiKey?: string
): Promise<FetchResult> {
  const sym = symbol.toUpperCase();
  const cacheKey = `${provider}:${sym}`;
  const now = Date.now();

  const cached = memCache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return { price: cached.price, fromCache: true, provider, symbol: sym, fetchedAt: new Date(cached.ts) };
  }

  const fetcher = fetcherMap[provider];
  if (!fetcher) throw new Error(`未知的 provider: ${provider}`);

  const price = await fetcher(sym, apiKey);
  const rounded = parseFloat(price.toFixed(2));

  memCache.set(cacheKey, { price: rounded, ts: now, provider });

  return { price: rounded, fromCache: false, provider, symbol: sym, fetchedAt: new Date(now) };
}

// ─── 大盤指數（加權指數 TAIEX）─────────────────────────────────────────────

export async function fetchTaiexIndex(): Promise<number> {
  const res = await fetch(
    "https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0",
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`TWSE MIS 回應 ${res.status}`);
  const data = await res.json();
  const info = data?.msgArray?.[0];
  if (!info) throw new Error("無法取得加權指數");
  const raw = info.z !== "-" ? info.z : info.y;
  const index = parseFloat(raw);
  if (isNaN(index) || index <= 0) throw new Error("無法解析加權指數");
  return parseFloat(index.toFixed(2));
}

export function invalidateCache(symbol: string, provider?: ProviderId) {
  const sym = symbol.toUpperCase();
  if (provider) {
    memCache.delete(`${provider}:${sym}`);
  } else {
    for (const key of memCache.keys()) {
      if (key.endsWith(`:${sym}`)) memCache.delete(key);
    }
  }
}
