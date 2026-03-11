import axios from "axios";
import type {
  Simulation,
  Holding,
  ApiUsage,
  SourceConfig,
  SearchResult,
  FetchPriceResponse,
  Strategy,
  OptionsDeltaRow,
  OptionsApiStats,
  OptionsTrade,
  StockTrade,
  Loan,
  LoanPayment,
  OptionsTarget,
  OptionsTargetMatch,
} from "@/types";

// 優先使用環境變數，其次自動偵測 Replit 公開域名（API 在 port 3001）
const BASE =
  process.env.EXPO_PUBLIC_API_URL ||
  (process.env.EXPO_PUBLIC_REPLIT_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_REPLIT_DOMAIN}:3001`
    : "http://localhost:3001");

const client = axios.create({ baseURL: BASE, timeout: 15000 });

// ── Simulation ──────────────────────────────────────────────

export async function createSimulation(): Promise<Simulation> {
  const { data } = await client.post<Simulation>("/api/simulations");
  return data;
}

export async function listSimulations(): Promise<Simulation[]> {
  const { data } = await client.get<Simulation[]>("/api/simulations");
  return data;
}

export async function getSimulation(id: number): Promise<Simulation> {
  const { data } = await client.get<Simulation>(`/api/simulations/${id}`);
  return data;
}

export async function updateSimulation(
  id: number,
  body: { leverageLimit?: number; exposureTarget?: number }
): Promise<Simulation> {
  const { data } = await client.patch<Simulation>(`/api/simulations/${id}`, body);
  return data;
}

export async function deleteSimulation(id: number): Promise<void> {
  await client.delete(`/api/simulations/${id}`);
}

// ── Holdings ────────────────────────────────────────────────

export async function getHoldings(simId: number): Promise<Holding[]> {
  const { data } = await client.get<Holding[]>(`/api/simulations/${simId}/holdings`);
  return data;
}

export async function addHolding(
  simId: number,
  body: { name: string; shares: number; currentPrice: number; costBasis: number }
): Promise<Holding> {
  const { data } = await client.post<Holding>(`/api/simulations/${simId}/holdings`, body);
  return data;
}

export async function updateHolding(
  id: number,
  body: { shares?: number; beta?: number; currentPrice?: number; costBasis?: number; name?: string }
): Promise<Holding> {
  const { data } = await client.patch<Holding>(`/api/holdings/${id}`, body);
  return data;
}

export async function deleteHolding(id: number): Promise<void> {
  await client.delete(`/api/holdings/${id}`);
}

export async function fetchHoldingPrice(
  id: number,
  symbol: string
): Promise<FetchPriceResponse> {
  const { data } = await client.post<FetchPriceResponse>(`/api/holdings/${id}/fetch-price`, { symbol });
  return data;
}

// ── Sources ─────────────────────────────────────────────────

export async function getSourceConfigs(): Promise<SourceConfig[]> {
  const { data } = await client.get<SourceConfig[]>("/api/sources");
  return data;
}

export async function upsertSourceConfig(
  sourceId: string,
  apiKey: string | null
): Promise<SourceConfig> {
  const { data } = await client.put<SourceConfig>(`/api/sources/${sourceId}`, { apiKey });
  return data;
}

export async function setDefaultSource(sourceId: string): Promise<void> {
  await client.post(`/api/sources/${sourceId}/set-default`);
}

// ── Search ──────────────────────────────────────────────────

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const { data } = await client.get<SearchResult[]>("/api/search", { params: { q: query } });
  return data;
}

// ── Strategies ──────────────────────────────────────────────

export async function getStrategies(simId: number): Promise<Strategy[]> {
  const { data } = await client.get<Strategy[]>(`/api/simulations/${simId}/strategies`);
  return data;
}

export async function addStrategy(
  simId: number,
  body: { name: string; leverageLimit?: number; leverageCap?: number | null; exposureTarget?: number; deltaMin?: number | null; deltaMax?: number | null }
): Promise<Strategy> {
  const { data } = await client.post<Strategy>(`/api/simulations/${simId}/strategies`, body);
  return data;
}

export async function updateStrategy(
  id: number,
  body: { name?: string; leverageLimit?: number; leverageCap?: number | null; exposureTarget?: number; deltaMin?: number | null; deltaMax?: number | null }
): Promise<Strategy> {
  const { data } = await client.patch<Strategy>(`/api/strategies/${id}`, body);
  return data;
}

export async function deleteStrategy(id: number): Promise<void> {
  await client.delete(`/api/strategies/${id}`);
}

// ── Options Delta ───────────────────────────────────────────

export async function fetchOptionsDelta(contractId = "TXO"): Promise<{ date: string; count: number } | { error: string }> {
  const { data } = await client.post<{ date: string; count: number } | { error: string }>("/api/options/fetch", { contractId });
  return data;
}

export async function getOptionsDeltaRows(contractId = "TXO", tradeDate?: string): Promise<OptionsDeltaRow[]> {
  const params: Record<string, string> = { contractId };
  if (tradeDate) params.tradeDate = tradeDate;
  const { data } = await client.get<OptionsDeltaRow[]>("/api/options/rows", { params });
  return data;
}

export async function getAvailableOptionsDates(contractId = "TXO"): Promise<string[]> {
  const { data } = await client.get<string[]>("/api/options/dates", { params: { contractId } });
  return data;
}

export async function getOptionsPriceMap(contractId = "TXO"): Promise<Record<string, Record<string, number>>> {
  const { data } = await client.get<Record<string, Record<string, number>>>("/api/options/price-map", { params: { contractId } });
  return data;
}

export async function getOptionsApiStats(): Promise<OptionsApiStats> {
  const { data } = await client.get<OptionsApiStats>("/api/options/stats");
  return data;
}

// ── Options Trades ──────────────────────────────────────────

export async function getOptionsTrades(): Promise<OptionsTrade[]> {
  const { data } = await client.get<OptionsTrade[]>("/api/options/trades");
  return data;
}

export async function createOptionsTrade(body: {
  simulationId?: number;
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
}): Promise<OptionsTrade> {
  const { data } = await client.post<OptionsTrade>("/api/options/trades", body);
  return data;
}

export async function updateOptionsTrade(
  id: number,
  body: Partial<{
    tradeDate: string;
    action: string;
    contractId: string;
    contractMonth: string;
    callPut: string;
    strikePrice: number;
    price: number;
    quantity: number;
    fee: number;
    notes: string | null;
  }>
): Promise<OptionsTrade> {
  const { data } = await client.patch<OptionsTrade>(`/api/options/trades/${id}`, body);
  return data;
}

export async function deleteOptionsTrade(id: number): Promise<void> {
  await client.delete(`/api/options/trades/${id}`);
}

// ── Stock Trades ─────────────────────────────────────────

export async function getStockTrades(): Promise<StockTrade[]> {
  const { data } = await client.get<StockTrade[]>("/api/stock-trades");
  return data;
}

export async function createStockTrade(body: {
  simulationId?: number;
  tradeDate: string;
  action: string;
  symbol: string;
  price: number;
  quantity: number;
  fee?: number;
  notes?: string | null;
}): Promise<StockTrade> {
  const { data } = await client.post<StockTrade>("/api/stock-trades", body);
  return data;
}

export async function updateStockTrade(
  id: number,
  body: Partial<{
    tradeDate: string;
    action: string;
    symbol: string;
    price: number;
    quantity: number;
    fee: number;
    notes: string | null;
  }>
): Promise<StockTrade> {
  const { data } = await client.patch<StockTrade>(`/api/stock-trades/${id}`, body);
  return data;
}

export async function deleteStockTrade(id: number): Promise<void> {
  await client.delete(`/api/stock-trades/${id}`);
}

// ── Loans ────────────────────────────────────────────────────

export async function getLoans(simId?: number): Promise<Loan[]> {
  const params = simId ? { simId } : {};
  const { data } = await client.get<Loan[]>("/api/loans", { params });
  return data;
}

export async function createLoan(body: {
  simulationId: number;
  name: string;
  principal: number;
  annualRate: number;
  periods: number;
  startDate: string;
  loanType?: string;
  prepaymentStrategy?: string;
  notes?: string | null;
}): Promise<Loan> {
  const { data } = await client.post<Loan>("/api/loans", body);
  return data;
}

export async function deleteLoan(id: number): Promise<void> {
  await client.delete(`/api/loans/${id}`);
}

// ── Loan Payments ────────────────────────────────────────────

export async function getLoanPayments(loanId: number): Promise<LoanPayment[]> {
  const { data } = await client.get<LoanPayment[]>(`/api/loans/${loanId}/payments`);
  return data;
}

export async function addLoanPayment(loanId: number, body: { paymentDate: string; amount: number; principalPortion?: number; interestPortion?: number; notes?: string | null }): Promise<LoanPayment> {
  const { data } = await client.post<LoanPayment>(`/api/loans/${loanId}/payments`, body);
  return data;
}

export async function updateLoanPayment(id: number, body: { paymentDate?: string; amount?: number; principalPortion?: number; interestPortion?: number; notes?: string | null }): Promise<LoanPayment> {
  const { data } = await client.patch<LoanPayment>(`/api/loans/payments/${id}`, body);
  return data;
}

export async function deleteLoanPayment(id: number): Promise<void> {
  await client.delete(`/api/loans/payments/${id}`);
}

// ── Stats ───────────────────────────────────────────────────

export async function getApiStats(): Promise<ApiUsage[]> {
  const { data } = await client.get<ApiUsage[]>("/api/stats");
  return data;
}

// ── Database Browser ─────────────────────────────────────────

export async function getDbPriceCache() {
  const { data } = await client.get("/api/db/price-cache");
  return data;
}

export async function getDbDeltaCache(): Promise<OptionsDeltaRow[]> {
  const { data } = await client.get<OptionsDeltaRow[]>("/api/db/delta-cache");
  return data;
}

export async function getDbApiUsage(): Promise<ApiUsage[]> {
  const { data } = await client.get<ApiUsage[]>("/api/db/api-usage");
  return data;
}

// ── Options Targets ─────────────────────────────────────────

export async function getOptionsTargets(simId: number): Promise<OptionsTarget[]> {
  const { data } = await client.get<OptionsTarget[]>("/api/options-targets", { params: { simId } });
  return data;
}

export async function createOptionsTarget(body: {
  simulationId: number;
  action: string;
  callPut: string;
  targetDelta: number;
  contractMonth?: string | null;
  quantity?: number;
  notes?: string | null;
}): Promise<OptionsTarget> {
  const { data } = await client.post<OptionsTarget>("/api/options-targets", body);
  return data;
}

export async function deleteOptionsTarget(id: number): Promise<void> {
  await client.delete(`/api/options-targets/${id}`);
}

export async function getOptionsTargetMatches(simId: number): Promise<OptionsTargetMatch[]> {
  const { data } = await client.get<OptionsTargetMatch[]>("/api/options-targets/match", { params: { simId } });
  return data;
}

// ── App Settings ────────────────────────────────────────────

export async function getAppSettings(): Promise<Record<string, string>> {
  const { data } = await client.get<Record<string, string>>("/api/settings");
  return data;
}

export async function upsertAppSetting(key: string, value: string): Promise<void> {
  await client.put(`/api/settings/${key}`, { value });
}
