import type { OptionsDeltaRow, OptionsFilter } from "./types";

export function filterOptionsRows(rows: OptionsDeltaRow[], filter: OptionsFilter): OptionsDeltaRow[] {
  return rows.filter((r) => {
    if (filter.callPut !== "ALL" && r.callPut !== filter.callPut) return false;
    if (filter.contractMonth !== "ALL" && r.contractMonth !== filter.contractMonth) return false;

    if (filter.deltaMin !== "") {
      const min = parseFloat(filter.deltaMin);
      if (!isNaN(min) && (r.delta == null || r.delta < min)) return false;
    }
    if (filter.deltaMax !== "") {
      const max = parseFloat(filter.deltaMax);
      if (!isNaN(max) && (r.delta == null || r.delta > max)) return false;
    }
    if (filter.strikePriceMin !== "") {
      const min = parseFloat(filter.strikePriceMin);
      if (!isNaN(min) && r.strikePrice < min) return false;
    }
    if (filter.strikePriceMax !== "") {
      const max = parseFloat(filter.strikePriceMax);
      if (!isNaN(max) && r.strikePrice > max) return false;
    }

    return true;
  });
}

export function extractContractMonths(rows: OptionsDeltaRow[]): string[] {
  const months = new Set<string>();
  for (const r of rows) {
    if (r.contractMonth) months.add(r.contractMonth);
  }
  return Array.from(months).sort();
}

/** 依排序後的合約月份清單，判斷是否為近月/次月 */
export function classifyContractMonth(contractMonth: string, allMonths: string[]): "近月" | "次月" | null {
  const sorted = [...allMonths].filter(Boolean).sort();
  const idx = sorted.indexOf(contractMonth);
  if (idx === 0) return "近月";
  if (idx === 1) return "次月";
  return null;
}
