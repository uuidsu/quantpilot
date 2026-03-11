import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as api from "@/services/api";
import * as cache from "@/services/db/cache";
import { isOnline } from "@/services/db/sync";
import type { Simulation } from "@/types";

const SIM_KEY = "marketsim_sim_id";

export function useSimulation() {
  const [sim, setSim] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SIM_KEY);
        const storedId = stored ? Number(stored) : null;

        // Phase 1: read from local cache
        const cachedSims = await cache.getCachedSimulations();
        if (cachedSims.length > 0) {
          const match = storedId ? cachedSims.find(s => s.id === storedId) : cachedSims[0];
          if (match) {
            setSim(match);
            setLoading(false);
          }
        }

        // Phase 2: sync from remote
        const online = await isOnline();
        if (!online) {
          // Offline — use whatever cache we have
          if (!sim && cachedSims.length > 0) {
            const fallback = storedId ? cachedSims.find(s => s.id === storedId) ?? cachedSims[0] : cachedSims[0];
            setSim(fallback);
          }
          setLoading(false);
          return;
        }

        if (storedId) {
          try {
            const s = await api.getSimulation(storedId);
            setSim(s);
            await cache.setCachedSimulations([s]);
            setLoading(false);
            return;
          } catch {
            // deleted, fall through
          }
        }
        const sims = await api.listSimulations();
        if (sims.length > 0) {
          setSim(sims[0]);
          await AsyncStorage.setItem(SIM_KEY, String(sims[0].id));
          await cache.setCachedSimulations(sims);
        } else {
          const newSim = await api.createSimulation();
          setSim(newSim);
          await AsyncStorage.setItem(SIM_KEY, String(newSim.id));
          await cache.setCachedSimulations([newSim]);
        }
      } catch (err) {
        console.error("useSimulation init error", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSim = useCallback(
    async (body: { cash?: number; leverageLimit?: number; exposureTarget?: number }) => {
      if (!sim) return;
      const updated = await api.updateSimulation(sim.id, body);
      setSim(updated);
      await cache.setCachedSimulations([updated]);
      return updated;
    },
    [sim]
  );

  const resetSim = useCallback(async () => {
    if (!sim) return;
    await api.deleteSimulation(sim.id);
    const newSim = await api.createSimulation();
    setSim(newSim);
    await AsyncStorage.setItem(SIM_KEY, String(newSim.id));
    await cache.setCachedSimulations([newSim]);
    return newSim;
  }, [sim]);

  return { sim, loading, setSim, updateSim, resetSim };
}
