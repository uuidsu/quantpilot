import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "@/services/api";
import type { OptionsDeltaRow, OptionsApiStats } from "@/types";
import type { OptionsFilter } from "@/types";

export function useOptionsDelta() {
  const [rows, setRows] = useState<OptionsDeltaRow[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState<OptionsFilter>({
    callPut: "ALL",
    deltaMin: "",
    deltaMax: "",
    strikePriceMin: "",
    strikePriceMax: "",
    contractMonth: "ALL",
  });
  const [stats, setStats] = useState<OptionsApiStats>({ calls: [], cooldownUntil: null });
  const [cooldownRemain, setCooldownRemain] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!stats.cooldownUntil) {
      setCooldownRemain(0);
      return;
    }
    const update = () => {
      const diff = new Date(stats.cooldownUntil!).getTime() - Date.now();
      if (diff <= 0) {
        setCooldownRemain(0);
      } else {
        setCooldownRemain(Math.ceil(diff / 60000));
      }
    };
    update();
    timerRef.current = setInterval(update, 30000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stats.cooldownUntil]);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.getOptionsApiStats();
      setStats(s);
    } catch { }
  }, []);

  const loadDates = useCallback(async () => {
    try {
      const d = await api.getAvailableOptionsDates("TXO");
      setDates(d);
      if (d.length > 0 && !selectedDate) {
        setSelectedDate(d[0]);
        const r = await api.getOptionsDeltaRows("TXO", d[0]);
        setRows(r);
      }
    } catch { }
  }, [selectedDate]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadDates();
  }, []);

  const fetchDelta = useCallback(async () => {
    setFetching(true);
    try {
      const result = await api.fetchOptionsDelta("TXO");
      if ("error" in result) {
        return result;
      }
      await loadStats();
      setDates((prev) => (prev.includes(result.date) ? prev : [result.date, ...prev]));
      setSelectedDate(result.date);
      const r = await api.getOptionsDeltaRows("TXO", result.date);
      setRows(r);
      return result;
    } finally {
      setFetching(false);
    }
  }, [loadStats]);

  const changeDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    try {
      const r = await api.getOptionsDeltaRows("TXO", date);
      setRows(r);
    } catch { }
  }, []);

  return {
    rows, dates, selectedDate, fetching, filter, setFilter,
    stats, cooldownRemain, fetchDelta, changeDate, loadStats, loadDates,
  };
}
