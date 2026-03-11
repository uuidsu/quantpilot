import { useState, useEffect, useCallback } from "react";
import * as api from "@/services/api";
import * as cache from "@/services/db/cache";
import { isOnline } from "@/services/db/sync";
import type { Holding } from "@/types";

export function useHoldings(simId: number | undefined) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!simId) return;
    setLoading(true);
    try {
      // Phase 1: local cache
      const cached = await cache.getCachedHoldings(simId);
      if (cached.length > 0) setHoldings(cached);

      // Phase 2: remote sync
      const online = await isOnline();
      if (online) {
        const rows = await api.getHoldings(simId);
        setHoldings(rows);
        await cache.setCachedHoldings(simId, rows);
      }
    } catch (err) {
      console.error("useHoldings refresh", err);
    } finally {
      setLoading(false);
    }
  }, [simId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (symbol: string) => {
      if (!simId) return null;
      const h = await api.addHolding(simId, { name: symbol, shares: 1, currentPrice: 0, costBasis: 0 });
      setHoldings((prev) => {
        const next = [h, ...prev];
        cache.setCachedHoldings(simId, next);
        return next;
      });
      return h;
    },
    [simId]
  );

  const update = useCallback(async (id: number, body: { shares?: number; beta?: number }) => {
    const updated = await api.updateHolding(id, body);
    setHoldings((prev) => {
      const next = prev.map((h) => (h.id === updated.id ? updated : h));
      if (simId) cache.setCachedHoldings(simId, next);
      return next;
    });
    return updated;
  }, [simId]);

  const remove = useCallback(async (id: number) => {
    await api.deleteHolding(id);
    setHoldings((prev) => {
      const next = prev.filter((h) => h.id !== id);
      if (simId) cache.setCachedHoldings(simId, next);
      return next;
    });
  }, [simId]);

  const fetchPrice = useCallback(async (h: Holding) => {
    const result = await api.fetchHoldingPrice(h.id, h.name);
    setHoldings((prev) => {
      const next = prev.map((x) => (x.id === result.holding.id ? result.holding : x));
      if (simId) cache.setCachedHoldings(simId, next);
      return next;
    });
    return result;
  }, [simId]);

  const clear = useCallback(() => setHoldings([]), []);

  return { holdings, loading, refresh, add, update, remove, fetchPrice, clear };
}
