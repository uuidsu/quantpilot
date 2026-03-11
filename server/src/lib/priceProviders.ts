/**
 * 統一股價撈取模組（台股版）
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

async function fetchTwse(symbol: string): Promise<number> {
  const [code, suffix] = symbol.split(".");
  const ex = suffix === "TWO" ? "otc" : "tse";
  const res = await fetch(
    `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${ex}_${code}.tw&json=1&delay=0`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`TWSE MIS 回應 ${res.status}`);
  const data = await res.json();
  const info = data?.msgArray?.[0];
  if (!info) throw new Error(`找不到 ${code}`);
  const raw = info.z !== "-" ? info.z : info.y;
  const price = parseFloat(raw);
  if (isNaN(price) || price <= 0) throw new Error(`${code} 無法取得股價`);
  return price;
}

async function fetchFugle(symbol: string, apiKey?: string): Promise<number> {
  if (!apiKey) throw new Error("富果需要 API Token");
  const res = await fetch(
    `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${symbol}`,
    { headers: { "X-API-KEY": apiKey, Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`富果 API 回應 ${res.status}`);
  const data = await res.json();
  const price = data?.lastPrice ?? data?.closePrice ?? data?.referencePrice ?? null;
  if (typeof price !== "number") throw new Error("富果無法解析股價");
  return price;
}

type FetchFn = (symbol: string, apiKey?: string) => Promise<number>;

const fetcherMap: Record<ProviderId, FetchFn> = {
  twse: fetchTwse,
  fugle: fetchFugle,
};

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
