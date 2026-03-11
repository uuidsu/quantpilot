import { useState, useEffect, useCallback, useRef } from "react";
import {
  getOptionsTrades,
  createOptionsTrade,
  updateOptionsTrade,
  deleteOptionsTrade,
  getOptionsPriceMap,
} from "@/services/api";
import * as cache from "@/services/db/cache";
import { isOnline } from "@/services/db/sync";
import type { OptionsTrade, OptionsHolding, OptionsPnlSummary, OptionsPnlPoint } from "@/types";
import { computeHoldings, computePnlSummary, computePnlHistory } from "@shared/optionsTrades";

export function useOptionsTrades(opts?: { loadPriceMap?: boolean }) {
  const [trades, setTrades] = useState<OptionsTrade[]>([]);
  const [dailyPriceMap, setDailyPriceMap] = useState<Record<string, Record<string, number>>>({});
  const [currentPriceMap, setCurrentPriceMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const priceMapLoaded = useRef(false);

  const needPriceMap = opts?.loadPriceMap ?? false;

  const loadPriceMap = useCallback(async () => {
    if (priceMapLoaded.current) return;
    try {
      const data = await getOptionsPriceMap("TXO");
      priceMapLoaded.current = true;
      setDailyPriceMap(data);
      const dates = Object.keys(data).sort();
      if (dates.length > 0) {
        const latest = data[dates[dates.length - 1]];
        const map = new Map<string, number>();
        for (const [k, v] of Object.entries(latest)) {
          map.set(k, v);
        }
        setCurrentPriceMap(map);
      }
    } catch {
      // ignore
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Phase 1: local cache
      const cached = await cache.getCachedOptionsTrades();
      if (cached.length > 0) setTrades(cached);

      // Phase 2: remote sync
      const online = await isOnline();
      if (online) {
        const data = await getOptionsTrades();
        setTrades(data);
        await cache.setCachedOptionsTrades(data);
      }
    } catch (err) {
      console.error("[useOptionsTrades] refresh error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (needPriceMap) loadPriceMap();
  }, [needPriceMap, loadPriceMap]);

  const add = async (body: {
    tradeDate: string;
    action: string;
    contractId?: string;
    contractMonth: string;
    callPut: string;
    strikePrice: number;
    price: number;
    quantity: number;
    fee?: number;
    notes?: string | null;
  }) => {
    const row = await createOptionsTrade(body);
    setTrades((prev) => {
      const next = [row, ...prev];
      cache.setCachedOptionsTrades(next);
      return next;
    });
    return row;
  };

  const update = async (id: number, body: Parameters<typeof updateOptionsTrade>[1]) => {
    const row = await updateOptionsTrade(id, body);
    setTrades((prev) => {
      const next = prev.map((t) => (t.id === id ? row : t));
      cache.setCachedOptionsTrades(next);
      return next;
    });
    return row;
  };

  const remove = async (id: number) => {
    await deleteOptionsTrade(id);
    setTrades((prev) => {
      const next = prev.filter((t) => t.id !== id);
      cache.setCachedOptionsTrades(next);
      return next;
    });
  };

  const holdings: OptionsHolding[] = computeHoldings(trades, currentPriceMap);
  const pnlSummary: OptionsPnlSummary = computePnlSummary(trades, currentPriceMap);
  const pnlHistory: OptionsPnlPoint[] = needPriceMap ? computePnlHistory(trades, 45, dailyPriceMap) : [];

  return { trades, holdings, pnlSummary, pnlHistory, loading, refresh, loadPriceMap, add, update, remove };
}
