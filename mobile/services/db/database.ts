import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("marketsim.db");
  await _db.execAsync("PRAGMA journal_mode = WAL;");
  await migrate(_db);
  return _db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  const { user_version } = (await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  ))!;

  if (user_version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS simulations (
        id INTEGER PRIMARY KEY,
        cash REAL NOT NULL DEFAULT 0,
        leverage_limit REAL NOT NULL DEFAULT 1.5,
        exposure_target REAL NOT NULL DEFAULT 1.0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS holdings (
        id INTEGER PRIMARY KEY,
        simulation_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        shares REAL NOT NULL,
        current_price REAL NOT NULL,
        cost_basis REAL NOT NULL,
        beta REAL NOT NULL DEFAULT 1.0,
        price_updated_at TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS strategies (
        id INTEGER PRIMARY KEY,
        simulation_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        leverage_limit REAL NOT NULL DEFAULT 1.5,
        leverage_cap REAL,
        exposure_target REAL NOT NULL DEFAULT 1.0,
        delta_min REAL,
        delta_max REAL,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS options_trades (
        id INTEGER PRIMARY KEY,
        trade_date TEXT NOT NULL,
        action TEXT NOT NULL,
        contract_id TEXT NOT NULL DEFAULT 'TXO',
        contract_month TEXT NOT NULL,
        call_put TEXT NOT NULL,
        strike_price REAL NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        fee REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS stock_trades (
        id INTEGER PRIMARY KEY,
        trade_date TEXT NOT NULL,
        action TEXT NOT NULL,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        fee REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sync_meta (
        table_name TEXT PRIMARY KEY,
        last_synced_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY,
        simulation_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        principal REAL NOT NULL,
        annual_rate REAL NOT NULL,
        periods INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT
      );

      PRAGMA user_version = 1;
    `);
  }
}
