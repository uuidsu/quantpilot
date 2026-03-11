import type { OptionsDeltaRow, OptionsTarget, OptionsTargetMatch } from "./types";

/**
 * 從 delta cache rows 中，為每個 options target 找最接近的 delta 匹配
 * rows 應為最新交易日的資料
 */
export function matchTargets(
  targets: OptionsTarget[],
  rows: OptionsDeltaRow[],
): OptionsTargetMatch[] {
  // 找最新交易日
  const tradeDates = [...new Set(rows.map(r => r.tradeDate))].sort();
  const latestDate = tradeDates.length > 0 ? tradeDates[tradeDates.length - 1] : null;
  const latestRows = latestDate ? rows.filter(r => r.tradeDate === latestDate) : [];

  // 最後拉取時間
  const lastFetchedAt = latestRows.reduce<string | null>((max, r) => {
    if (!r.fetchedAt) return max;
    return !max || r.fetchedAt > max ? r.fetchedAt : max;
  }, null);

  return targets.map(target => {
    // 篩選 callPut 匹配的 rows
    let candidates = latestRows.filter(r => r.callPut === target.callPut && r.delta != null);

    // 如果 target 有指定 contractMonth，篩選之；否則取最近月
    if (target.contractMonth) {
      candidates = candidates.filter(r => r.contractMonth === target.contractMonth);
    } else {
      // 取最近月：contractMonth 最小的
      const months = [...new Set(candidates.map(r => r.contractMonth).filter(Boolean))].sort();
      if (months.length > 0) {
        candidates = candidates.filter(r => r.contractMonth === months[0]);
      }
    }

    if (candidates.length === 0) {
      return {
        target,
        matchedStrike: null,
        matchedDelta: null,
        matchedPrice: null,
        matchedContractMonth: null,
        lastMarketDate: latestDate,
        lastFetchedAt,
      };
    }

    // 找最接近 targetDelta 的 row（用絕對值比較）
    // Put delta 為負數，比較時取絕對值
    const absDelta = Math.abs(target.targetDelta);
    let best = candidates[0];
    let bestDiff = Math.abs(Math.abs(best.delta!) - absDelta);

    for (let i = 1; i < candidates.length; i++) {
      const diff = Math.abs(Math.abs(candidates[i].delta!) - absDelta);
      if (diff < bestDiff) {
        best = candidates[i];
        bestDiff = diff;
      }
    }

    return {
      target,
      matchedStrike: best.strikePrice,
      matchedDelta: best.delta,
      matchedPrice: best.closePrice,
      matchedContractMonth: best.contractMonth,
      lastMarketDate: latestDate,
      lastFetchedAt,
    };
  });
}
