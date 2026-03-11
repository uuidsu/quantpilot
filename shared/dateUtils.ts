/**
 * 日期工具 — 所有日期取值一律使用 UTC+8（台灣時間）
 *
 * 規則：不可直接使用 new Date().toISOString()，一律透過此檔案的函數取得當前日期。
 */

const TW_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/** 取得台灣今日日期，格式 YYYYMMDD */
export function todayTW(): string {
  return new Date(Date.now() + TW_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, "");
}

/** 取得台灣現在時間戳，格式 YYYYMMDDHHmmss（適合備份檔名） */
export function nowTW(): string {
  const iso = new Date(Date.now() + TW_OFFSET_MS).toISOString(); // "2024-03-15T14:30:00.000Z" (Z = UTC, but offset already added)
  return iso.slice(0, 10).replace(/-/g, "") + "_" + iso.slice(11, 19).replace(/:/g, "");
}
