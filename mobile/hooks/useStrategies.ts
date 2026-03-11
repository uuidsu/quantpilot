import { useState, useEffect, useCallback } from "react";
import * as api from "@/services/api";
import * as cache from "@/services/db/cache";
import { isOnline } from "@/services/db/sync";
import type { Strategy } from "@/types";

export function useStrategies(simId: number | undefined) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeStrategyId, setActiveStrategyId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!simId) return;
    setLoading(true);
    try {
      // Phase 1: local cache
      const cached = await cache.getCachedStrategies(simId);
      if (cached.length > 0) {
        setStrategies(cached);
        if (!activeStrategyId) setActiveStrategyId(cached[0].id);
      }

      // Phase 2: remote sync
      const online = await isOnline();
      if (online) {
        const list = await api.getStrategies(simId);
        setStrategies(list);
        if (list.length > 0 && !activeStrategyId) setActiveStrategyId(list[0].id);
        await cache.setCachedStrategies(simId, list);
      }
    } catch (err) {
      console.error("useStrategies refresh error", err);
    } finally {
      setLoading(false);
    }
  }, [simId, activeStrategyId]);

  useEffect(() => {
    refresh();
  }, [simId]);

  const add = useCallback(
    async (body: { name: string; leverageLimit?: number; leverageCap?: number | null; exposureTarget?: number; deltaMin?: number | null; deltaMax?: number | null }) => {
      if (!simId) return;
      const s = await api.addStrategy(simId, body);
      setStrategies((prev) => {
        const next = [...prev, s];
        cache.setCachedStrategies(simId, next);
        return next;
      });
      if (!activeStrategyId) setActiveStrategyId(s.id);
      return s;
    },
    [simId, activeStrategyId]
  );

  const update = useCallback(
    async (id: number, body: { name?: string; leverageLimit?: number; leverageCap?: number | null; exposureTarget?: number; deltaMin?: number | null; deltaMax?: number | null }) => {
      const updated = await api.updateStrategy(id, body);
      setStrategies((prev) => {
        const next = prev.map((s) => (s.id === id ? updated : s));
        if (simId) cache.setCachedStrategies(simId, next);
        return next;
      });
      return updated;
    },
    [simId]
  );

  const remove = useCallback(
    async (id: number) => {
      await api.deleteStrategy(id);
      setStrategies((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (activeStrategyId === id) {
          setActiveStrategyId(next.length > 0 ? next[0].id : null);
        }
        if (simId) cache.setCachedStrategies(simId, next);
        return next;
      });
    },
    [simId, activeStrategyId]
  );

  const activeStrategy = strategies.find((s) => s.id === activeStrategyId) ?? null;

  return { strategies, loading, activeStrategyId, activeStrategy, setActiveStrategyId, refresh, add, update, remove };
}
