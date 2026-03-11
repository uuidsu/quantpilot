import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getOptionsTrades,
  createOptionsTrade,
  deleteOptionsTrade,
  getStockTrades,
  createStockTrade,
  deleteStockTrade,
  getLoans,
  createLoan,
  deleteLoan,
} from "@/services/api";
import * as cache from "@/services/db/cache";
import { isOnline } from "@/services/db/sync";
import type { OptionsTrade, StockTrade, Loan, UnifiedTrade, Holding } from "@/types";
import { buildUnifiedTrades, groupTradesByDate, getTradeDates } from "@shared/tradeHistory";

export function useTradeHistory(simId?: number) {
  const [optTrades, setOptTrades] = useState<OptionsTrade[]>([]);
  const [stkTrades, setStkTrades] = useState<StockTrade[]>([]);
  const [loanList, setLoanList] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Phase 1: local cache
      const [cachedOpt, cachedStk, cachedLoans] = await Promise.all([
        cache.getCachedOptionsTrades(),
        cache.getCachedStockTrades(),
        cache.getCachedLoans(simId),
      ]);
      if (cachedOpt.length > 0 || cachedStk.length > 0) {
        setOptTrades(cachedOpt);
        setStkTrades(cachedStk);
      }
      if (cachedLoans.length > 0) setLoanList(cachedLoans);

      // Phase 2: remote sync
      const online = await isOnline();
      if (online) {
        const [opts, stks, loans] = await Promise.all([
          getOptionsTrades(), getStockTrades(), getLoans(simId),
        ]);
        setOptTrades(opts);
        setStkTrades(stks);
        setLoanList(loans);
        await Promise.all([
          cache.setCachedOptionsTrades(opts),
          cache.setCachedStockTrades(stks),
          cache.setCachedLoans(loans),
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [simId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unified = useMemo(
    () => buildUnifiedTrades(optTrades, stkTrades, loanList),
    [optTrades, stkTrades, loanList]
  );

  const tradeDates = useMemo(() => getTradeDates(unified), [unified]);

  const tradesByDate = useMemo(() => groupTradesByDate(unified), [unified]);

  const addOptionsTrade = async (body: {
    simulationId?: number;
    tradeDate: string;
    action: string;
    contractMonth: string;
    callPut: string;
    strikePrice: number;
    price: number;
    quantity: number;
    fee?: number;
    notes?: string | null;
  }) => {
    const row = await createOptionsTrade({ ...body, simulationId: body.simulationId ?? simId });
    setOptTrades((prev) => {
      const next = [row, ...prev];
      cache.setCachedOptionsTrades(next);
      return next;
    });
    return row;
  };

  const addStockTrade = async (body: {
    simulationId?: number;
    tradeDate: string;
    action: string;
    symbol: string;
    price: number;
    quantity: number;
    fee?: number;
    notes?: string | null;
  }) => {
    const row = await createStockTrade({ ...body, simulationId: body.simulationId ?? simId });
    setStkTrades((prev) => {
      const next = [row, ...prev];
      cache.setCachedStockTrades(next);
      return next;
    });
    return row;
  };

  const removeOptionsTrade = async (id: number) => {
    await deleteOptionsTrade(id);
    setOptTrades((prev) => {
      const next = prev.filter((t) => t.id !== id);
      cache.setCachedOptionsTrades(next);
      return next;
    });
  };

  const removeStockTrade = async (id: number) => {
    await deleteStockTrade(id);
    setStkTrades((prev) => {
      const next = prev.filter((t) => t.id !== id);
      cache.setCachedStockTrades(next);
      return next;
    });
  };

  const addLoan = async (body: {
    simulationId: number;
    name: string;
    principal: number;
    annualRate: number;
    periods: number;
    startDate: string;
    notes?: string | null;
  }) => {
    const row = await createLoan(body);
    setLoanList((prev) => {
      const next = [row, ...prev];
      cache.setCachedLoans(next);
      return next;
    });
    return row;
  };

  const removeLoan = async (id: number) => {
    await deleteLoan(id);
    setLoanList((prev) => {
      const next = prev.filter((l) => l.id !== id);
      cache.setCachedLoans(next);
      return next;
    });
  };

  return {
    trades: unified,
    tradeDates,
    tradesByDate,
    optionsTrades: optTrades,
    stockTrades: stkTrades,
    loans: loanList,
    loading,
    refresh,
    addOptionsTrade,
    addStockTrade,
    removeOptionsTrade,
    removeStockTrade,
    addLoan,
    removeLoan,
  };
}
