import { getDb } from "./database";
import type { Simulation, Holding, Strategy, OptionsTrade, StockTrade, Loan } from "@/types";

// ── Simulation ──

export async function getCachedSimulations(): Promise<Simulation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>("SELECT * FROM simulations");
  return rows.map(toSimulation);
}

export async function setCachedSimulations(sims: Simulation[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM simulations");
    for (const s of sims) {
      await db.runAsync(
        "INSERT INTO simulations (id, leverage_limit, exposure_target, created_at) VALUES (?,?,?,?)",
        s.id, s.leverageLimit, s.exposureTarget, s.createdAt
      );
    }
  });
  await setSyncTime("simulations");
}

// ── Holdings ──

export async function getCachedHoldings(simId: number): Promise<Holding[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM holdings WHERE simulation_id = ?", simId
  );
  return rows.map(toHolding);
}

export async function setCachedHoldings(simId: number, holdings: Holding[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM holdings WHERE simulation_id = ?", simId);
    for (const h of holdings) {
      await db.runAsync(
        "INSERT INTO holdings (id, simulation_id, name, shares, current_price, cost_basis, beta, price_updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        h.id, h.simulationId, h.name, h.shares, h.currentPrice, h.costBasis, h.beta, h.priceUpdatedAt, h.createdAt
      );
    }
  });
  await setSyncTime("holdings");
}

// ── Strategies ──

export async function getCachedStrategies(simId: number): Promise<Strategy[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM strategies WHERE simulation_id = ?", simId
  );
  return rows.map(toStrategy);
}

export async function setCachedStrategies(simId: number, strategies: Strategy[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM strategies WHERE simulation_id = ?", simId);
    for (const s of strategies) {
      await db.runAsync(
        "INSERT INTO strategies (id, simulation_id, name, leverage_limit, leverage_cap, exposure_target, delta_min, delta_max, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        s.id, s.simulationId, s.name, s.leverageLimit, s.leverageCap, s.exposureTarget, s.deltaMin, s.deltaMax, s.createdAt
      );
    }
  });
  await setSyncTime("strategies");
}

// ── Options Trades ──

export async function getCachedOptionsTrades(): Promise<OptionsTrade[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>("SELECT * FROM options_trades ORDER BY trade_date DESC");
  return rows.map(toOptionsTrade);
}

export async function setCachedOptionsTrades(trades: OptionsTrade[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM options_trades");
    for (const t of trades) {
      await db.runAsync(
        "INSERT INTO options_trades (id, trade_date, action, contract_id, contract_month, call_put, strike_price, price, quantity, fee, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        t.id, t.tradeDate, t.action, t.contractId, t.contractMonth, t.callPut, t.strikePrice, t.price, t.quantity, t.fee, t.notes, t.createdAt
      );
    }
  });
  await setSyncTime("options_trades");
}

// ── Stock Trades ──

export async function getCachedStockTrades(): Promise<StockTrade[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>("SELECT * FROM stock_trades ORDER BY trade_date DESC");
  return rows.map(toStockTrade);
}

export async function setCachedStockTrades(trades: StockTrade[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM stock_trades");
    for (const t of trades) {
      await db.runAsync(
        "INSERT INTO stock_trades (id, trade_date, action, symbol, price, quantity, fee, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        t.id, t.tradeDate, t.action, t.symbol, t.price, t.quantity, t.fee, t.notes, t.createdAt
      );
    }
  });
  await setSyncTime("stock_trades");
}

// ── Loans ──

export async function getCachedLoans(simId?: number): Promise<Loan[]> {
  const db = await getDb();
  const rows = simId
    ? await db.getAllAsync<any>("SELECT * FROM loans WHERE simulation_id = ? ORDER BY start_date DESC", simId)
    : await db.getAllAsync<any>("SELECT * FROM loans ORDER BY start_date DESC");
  return rows.map(toLoan);
}

export async function setCachedLoans(loans: Loan[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM loans");
    for (const l of loans) {
      await db.runAsync(
        "INSERT INTO loans (id, simulation_id, name, principal, annual_rate, periods, start_date, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        l.id, l.simulationId, l.name, l.principal, l.annualRate, l.periods, l.startDate, l.notes, l.createdAt
      );
    }
  });
  await setSyncTime("loans");
}

// ── Sync Meta ──

export async function getSyncTime(table: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ last_synced_at: string }>(
    "SELECT last_synced_at FROM sync_meta WHERE table_name = ?", table
  );
  return row?.last_synced_at ?? null;
}

async function setSyncTime(table: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    "INSERT OR REPLACE INTO sync_meta (table_name, last_synced_at) VALUES (?,?)",
    table, now
  );
}

export async function getAllSyncTimes(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ table_name: string; last_synced_at: string }>(
    "SELECT * FROM sync_meta"
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.table_name] = r.last_synced_at;
  return map;
}

export async function clearAllCache(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM simulations;
    DELETE FROM holdings;
    DELETE FROM strategies;
    DELETE FROM options_trades;
    DELETE FROM stock_trades;
    DELETE FROM loans;
    DELETE FROM sync_meta;
  `);
}

// ── Row Mappers ──

function toSimulation(r: any): Simulation {
  return { id: r.id, leverageLimit: r.leverage_limit, exposureTarget: r.exposure_target, createdAt: r.created_at };
}

function toHolding(r: any): Holding {
  return { id: r.id, simulationId: r.simulation_id, name: r.name, shares: r.shares, currentPrice: r.current_price, costBasis: r.cost_basis, beta: r.beta, priceUpdatedAt: r.price_updated_at, createdAt: r.created_at };
}

function toStrategy(r: any): Strategy {
  return { id: r.id, simulationId: r.simulation_id, name: r.name, leverageLimit: r.leverage_limit, leverageCap: r.leverage_cap, exposureTarget: r.exposure_target, deltaMin: r.delta_min, deltaMax: r.delta_max, createdAt: r.created_at };
}

function toOptionsTrade(r: any): OptionsTrade {
  return { id: r.id, simulationId: r.simulation_id ?? null, tradeDate: r.trade_date, action: r.action, contractId: r.contract_id, contractMonth: r.contract_month, callPut: r.call_put, strikePrice: r.strike_price, price: r.price, quantity: r.quantity, fee: r.fee, notes: r.notes, createdAt: r.created_at };
}

function toStockTrade(r: any): StockTrade {
  return { id: r.id, simulationId: r.simulation_id ?? null, tradeDate: r.trade_date, action: r.action, symbol: r.symbol, price: r.price, quantity: r.quantity, fee: r.fee, notes: r.notes, createdAt: r.created_at };
}

function toLoan(r: any): Loan {
  return { id: r.id, simulationId: r.simulation_id, name: r.name, principal: r.principal, annualRate: r.annual_rate, periods: r.periods, startDate: r.start_date, loanType: r.loan_type ?? "interest_only", prepaymentStrategy: r.prepayment_strategy ?? "reduce_payment", notes: r.notes, createdAt: r.created_at };
}
