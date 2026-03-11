// Re-export everything from shared types (single source of truth)
export * from "@shared/types";

// ── Mobile-only types ──────────────────────────────────────

/** 舊版持股型別（server 已無 holdings table，未來應遷移至 Position） */
export interface Holding {
  id: number;
  simulationId: number;
  name: string;         // = symbol
  shares: number;
  currentPrice: number;
  costBasis: number;
  beta: number;
  priceUpdatedAt: string | null;
  createdAt: string | null;
}

export interface FetchPriceResponse {
  holding: Holding;
  fromCache: boolean;
  provider: string;
}
