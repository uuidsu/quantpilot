import * as api from "@/services/api";
import * as cache from "./cache";
import * as Network from "expo-network";
import type { Simulation, Holding, Strategy, OptionsTrade, StockTrade } from "@/types";

// ── Types ──

export type DiffStatus = "match" | "local_only" | "remote_only" | "conflict";

export interface DiffItem {
  id: number | string;
  label: string;
  status: DiffStatus;
  local?: any;
  remote?: any;
}

export interface TableDiff {
  table: string;
  label: string;
  localCount: number;
  remoteCount: number;
  items: DiffItem[];
  lastSynced: string | null;
}

// ── Network ──

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

// ── Diff Computation ──

function diffById<T extends { id: number }>(
  local: T[],
  remote: T[],
  labelFn: (item: T) => string,
  compareFn: (a: T, b: T) => boolean,
): DiffItem[] {
  const localMap = new Map(local.map(i => [i.id, i]));
  const remoteMap = new Map(remote.map(i => [i.id, i]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const items: DiffItem[] = [];

  for (const id of allIds) {
    const l = localMap.get(id);
    const r = remoteMap.get(id);
    if (l && r) {
      items.push({
        id, label: labelFn(l),
        status: compareFn(l, r) ? "match" : "conflict",
        local: l, remote: r,
      });
    } else if (l) {
      items.push({ id, label: labelFn(l), status: "local_only", local: l });
    } else if (r) {
      items.push({ id, label: labelFn(r!), status: "remote_only", remote: r });
    }
  }
  return items;
}

// ── Compare functions (ignore createdAt / timestamps) ──

function simEq(a: Simulation, b: Simulation) {
  return a.leverageLimit === b.leverageLimit && a.exposureTarget === b.exposureTarget;
}
function holdEq(a: Holding, b: Holding) {
  return a.name === b.name && a.shares === b.shares && a.currentPrice === b.currentPrice && a.costBasis === b.costBasis && a.beta === b.beta;
}
function stratEq(a: Strategy, b: Strategy) {
  return a.name === b.name && a.leverageLimit === b.leverageLimit && a.leverageCap === b.leverageCap && a.exposureTarget === b.exposureTarget && a.deltaMin === b.deltaMin && a.deltaMax === b.deltaMax;
}
function optTradeEq(a: OptionsTrade, b: OptionsTrade) {
  return a.tradeDate === b.tradeDate && a.action === b.action && a.contractMonth === b.contractMonth && a.callPut === b.callPut && a.strikePrice === b.strikePrice && a.price === b.price && a.quantity === b.quantity && a.fee === b.fee;
}
function stkTradeEq(a: StockTrade, b: StockTrade) {
  return a.tradeDate === b.tradeDate && a.action === b.action && a.symbol === b.symbol && a.price === b.price && a.quantity === b.quantity && a.fee === b.fee;
}

// ── Full Diff ──

export async function computeFullDiff(simId: number): Promise<TableDiff[]> {
  const syncTimes = await cache.getAllSyncTimes();

  // Fetch remote data
  const [remoteSims, remoteHoldings, remoteStrategies, remoteOptTrades, remoteStkTrades] = await Promise.all([
    api.listSimulations(),
    api.getHoldings(simId),
    api.getStrategies(simId),
    api.getOptionsTrades(),
    api.getStockTrades(),
  ]);

  // Fetch local data
  const [localSims, localHoldings, localStrategies, localOptTrades, localStkTrades] = await Promise.all([
    cache.getCachedSimulations(),
    cache.getCachedHoldings(simId),
    cache.getCachedStrategies(simId),
    cache.getCachedOptionsTrades(),
    cache.getCachedStockTrades(),
  ]);

  return [
    {
      table: "simulations", label: "模擬",
      localCount: localSims.length, remoteCount: remoteSims.length,
      items: diffById(localSims, remoteSims, s => `#${s.id}`, simEq),
      lastSynced: syncTimes.simulations ?? null,
    },
    {
      table: "holdings", label: "持股",
      localCount: localHoldings.length, remoteCount: remoteHoldings.length,
      items: diffById(localHoldings, remoteHoldings, h => `${h.name} ${h.shares}股`, holdEq),
      lastSynced: syncTimes.holdings ?? null,
    },
    {
      table: "strategies", label: "策略",
      localCount: localStrategies.length, remoteCount: remoteStrategies.length,
      items: diffById(localStrategies, remoteStrategies, s => s.name, stratEq),
      lastSynced: syncTimes.strategies ?? null,
    },
    {
      table: "options_trades", label: "選擇權交易",
      localCount: localOptTrades.length, remoteCount: remoteOptTrades.length,
      items: diffById(localOptTrades, remoteOptTrades, t => `${t.callPut}${t.strikePrice} ${t.action}`, optTradeEq),
      lastSynced: syncTimes.options_trades ?? null,
    },
    {
      table: "stock_trades", label: "股票交易",
      localCount: localStkTrades.length, remoteCount: remoteStkTrades.length,
      items: diffById(localStkTrades, remoteStkTrades, t => `${t.symbol} ${t.action}`, stkTradeEq),
      lastSynced: syncTimes.stock_trades ?? null,
    },
  ];
}

// ── Pull (remote → local) ──

export async function pullAll(simId: number): Promise<void> {
  const [sims, holdings, strategies, optTrades, stkTrades] = await Promise.all([
    api.listSimulations(),
    api.getHoldings(simId),
    api.getStrategies(simId),
    api.getOptionsTrades(),
    api.getStockTrades(),
  ]);
  await Promise.all([
    cache.setCachedSimulations(sims),
    cache.setCachedHoldings(simId, holdings),
    cache.setCachedStrategies(simId, strategies),
    cache.setCachedOptionsTrades(optTrades),
    cache.setCachedStockTrades(stkTrades),
  ]);
}

export async function pullTable(simId: number, table: string): Promise<void> {
  switch (table) {
    case "simulations": {
      const data = await api.listSimulations();
      await cache.setCachedSimulations(data);
      break;
    }
    case "holdings": {
      const data = await api.getHoldings(simId);
      await cache.setCachedHoldings(simId, data);
      break;
    }
    case "strategies": {
      const data = await api.getStrategies(simId);
      await cache.setCachedStrategies(simId, data);
      break;
    }
    case "options_trades": {
      const data = await api.getOptionsTrades();
      await cache.setCachedOptionsTrades(data);
      break;
    }
    case "stock_trades": {
      const data = await api.getStockTrades();
      await cache.setCachedStockTrades(data);
      break;
    }
  }
}

// ── Push (local → remote) — currently not supported for all tables ──
// Push is complex because the server is authoritative. For now, push = force-push = overwrite remote.
// In practice, the app uses write-through (mutations go to API first), so push is mainly for
// restoring from local backup.

export async function forcePushTable(simId: number, table: string): Promise<void> {
  switch (table) {
    case "simulations": {
      const local = await cache.getCachedSimulations();
      const sim = local.find(s => s.id === simId);
      if (sim) {
        await api.updateSimulation(sim.id, { leverageLimit: sim.leverageLimit, exposureTarget: sim.exposureTarget });
      }
      break;
    }
    case "holdings": {
      // Delete remote, re-create from local
      const remoteHoldings = await api.getHoldings(simId);
      const localHoldings = await cache.getCachedHoldings(simId);
      for (const rh of remoteHoldings) await api.deleteHolding(rh.id);
      for (const lh of localHoldings) {
        await api.addHolding(simId, { name: lh.name, shares: lh.shares, currentPrice: lh.currentPrice, costBasis: lh.costBasis });
      }
      // Re-sync to get new IDs
      const fresh = await api.getHoldings(simId);
      await cache.setCachedHoldings(simId, fresh);
      break;
    }
    case "strategies": {
      const remoteStrats = await api.getStrategies(simId);
      const localStrats = await cache.getCachedStrategies(simId);
      for (const rs of remoteStrats) await api.deleteStrategy(rs.id);
      for (const ls of localStrats) {
        await api.addStrategy(simId, { name: ls.name, leverageLimit: ls.leverageLimit, leverageCap: ls.leverageCap, exposureTarget: ls.exposureTarget, deltaMin: ls.deltaMin, deltaMax: ls.deltaMax });
      }
      const fresh = await api.getStrategies(simId);
      await cache.setCachedStrategies(simId, fresh);
      break;
    }
    case "options_trades": {
      // Delete all remote, re-create
      const remoteTrades = await api.getOptionsTrades();
      const localTrades = await cache.getCachedOptionsTrades();
      for (const rt of remoteTrades) await api.deleteOptionsTrade(rt.id);
      for (const lt of localTrades) {
        await api.createOptionsTrade({
          tradeDate: lt.tradeDate, action: lt.action, contractMonth: lt.contractMonth,
          callPut: lt.callPut, strikePrice: lt.strikePrice, price: lt.price,
          quantity: lt.quantity, fee: lt.fee, notes: lt.notes,
        });
      }
      const fresh = await api.getOptionsTrades();
      await cache.setCachedOptionsTrades(fresh);
      break;
    }
    case "stock_trades": {
      const remoteTrades = await api.getStockTrades();
      const localTrades = await cache.getCachedStockTrades();
      for (const rt of remoteTrades) await api.deleteStockTrade(rt.id);
      for (const lt of localTrades) {
        await api.createStockTrade({
          tradeDate: lt.tradeDate, action: lt.action, symbol: lt.symbol,
          price: lt.price, quantity: lt.quantity, fee: lt.fee, notes: lt.notes,
        });
      }
      const fresh = await api.getStockTrades();
      await cache.setCachedStockTrades(fresh);
      break;
    }
  }
}
