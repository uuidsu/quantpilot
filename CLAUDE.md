# Project Rules

## 專案架構（Monorepo）

```
/                       Next.js Web app (port 3000)
├── app/                  Next.js App Router (actions.ts = server actions)
├── components/           Dashboard.tsx 等 UI 元件
├── db/                   Drizzle schema（主 schema，含所有 table）
├── lib/                  priceProviders 等工具
├── shared/               ★ 共用純函數邏輯層（Web + Mobile 共用）
│   ├── types.ts            共用介面（Simulation, Holding, Strategy, OptionsDeltaRow…）
│   ├── portfolio.ts        投組計算（metrics, leverage, exposure, rebalancing, recommendations）
│   ├── optionsFilter.ts    選擇權篩選（filterOptionsRows, extractContractMonths）
│   └── validators.ts       共用驗證
├── server/               Express API server (port 3001)
│   ├── src/db/schema.ts    Drizzle schema（須與 /db/schema.ts 保持同步）
│   ├── src/routes/         simulations, holdings, strategies, options, sources, search
│   ├── src/lib/            taifexOptions.ts（TAIFEX API 抓取 + 快取 + cooldown）
│   └── drizzle.config.ts   drizzle-kit push 用
└── mobile/               Expo React Native app
    ├── app/(tabs)/         5 tabs: index(總覽), holdings(持股), strategy(策略), options(選擇權), settings(設定)
    ├── hooks/              useSimulation, useHoldings, useStrategies, useOptionsDelta
    ├── services/api.ts     axios client → server API
    ├── types/index.ts      Mobile 端介面（須與 shared/types.ts 保持同步）
    └── metro.config.js     extraNodeModules 映射 @shared → ../shared
```

## ⚠️ Web 是 Single Source of Truth

**所有型別、商業邏輯、API 設計一律以 Web 端（`shared/types.ts`、`shared/` 目錄、`server/`）為準。Mobile 端必須對齊 Web，不得自行定義重複或衝突的型別。**

- `shared/types.ts` 是唯一的型別定義檔，mobile 的 `types/index.ts` 只做 re-export + mobile-only 擴充
- `shared/` 下的純函數邏輯（portfolio、optionsTrades、accounts、loan 等）Web 和 Mobile 共用，不得各自 inline 重寫
- Server routes 由 Web 開發時定案，Mobile 直接使用相同 API
- 型別有變動時，先改 `shared/types.ts`，再同步 mobile

## Web & Mobile 同步策略
**開發流程：只開發 Web 版（含 shared/、server/ 改動），等用戶確認 Web 版功能正常後，再另行同步 Mobile。不要主動改動 mobile/ 目錄的任何檔案。**
- Web 階段就要定案 server routes + shared 邏輯 + types，避免 Mobile 階段重改
- Mobile 同步時機：由用戶明確告知後才進行
- 兩者共用同一個後端 API，最終視覺與功能必須保持一致

## 前端 UI 風格（iOS 風格）

**Web 前端（Dashboard.tsx 等）一律採用 iOS 風格，所有新 UI 元件與頁面都必須遵守以下規範。**

### 整體原則
- 卡片式佈局（`rounded-2xl`、`shadow-card`）、簡潔清晰、低複雜度
- 避免過度設計，優先簡潔
- 色調參考 mobile/constants/theme.ts

### 設定頁 / 清單頁
- Section header：小字大寫灰色（`text-[11px] font-semibold uppercase tracking-widest text-muted-foreground`），顯示在卡片上方
- 每個項目為 row，格式：左側彩色 rounded-square icon badge（`w-8 h-8 rounded-[9px]`）+ 標籤文字 + 右側值（灰色）+ ChevronRight
- icon badge 顏色：功能性（藍）、刷新（橘）、排程（綠）、選擇權（紫）、統計（靛）、危險操作（紅）
- 同一 section 的 rows 放在同一張 Card 內，rows 之間以縮排細分隔線（`ml-[60px]`）分隔
- 點擊 row 在 inline 展開內容，不跳頁；直接 action 的 row 不顯示 chevron

### 底部 Tab Bar
- 固定顯示最常用的 4 個 tab，第 5 個為「更多」下拉選單
- active tab：圖示＋文字轉 primary 色（`text-primary`）；inactive：`text-muted-foreground`
- 頂部細線指示器（`h-0.5 bg-primary rounded-full`），使用 `layoutId="tab-indicator"` 做跨 tab 動畫
- 文字大小：`text-[10px] font-medium`

### 表單 / 輸入
- 輸入框：`rounded-xl border-0 bg-secondary`（使用 `<Input>` 元件）
- 按鈕：使用 `<Button>` 元件，或統一的 `rounded-xl` 樣式
- 危險操作按鈕：`bg-destructive text-white`，需二次確認（inline 展開後顯示）

## 共用邏輯層優先
所有投組計算邏輯（槓桿、曝險、再平衡）必須放在 `/shared/portfolio.ts`，Web 和 Mobile 皆透過 import 使用，禁止各自 inline 重寫。篩選邏輯放 `/shared/optionsFilter.ts`，新增共用介面放 `/shared/types.ts`。

## Schema 雙份同步
`/db/schema.ts`（Next.js 用）與 `/server/src/db/schema.ts`（Express 用）定義相同的 table。新增或修改 table 時兩邊都要更新，並執行 `cd server && npm run db:push` 同步資料庫。

## 路徑別名
- Web: `@/*` → `./*`（tsconfig.json baseUrl="."）
- Mobile: `@/*` → `./*`、`@shared/*` → `../shared/*`（tsconfig.json + metro.config.js extraNodeModules）
- Mobile 引用 shared 必須用 `@shared/xxx`，不可用相對路徑 `../../../shared/`

## 後端 API 慣例
- 基底路徑: `/api/`
- CRUD pattern: `GET/POST /api/simulations/:simId/strategies`、`PATCH/DELETE /api/strategies/:id`
- 選擇權: `/api/options/fetch`、`/api/options/rows`、`/api/options/dates`、`/api/options/stats`
- 新 route 建立後須在 `/server/src/index.ts` 註冊

## 資安與 Git 規範 (Security & Git)
- **絕對禁止上傳 API Key**：確保任何 API Key、密碼或私鑰都只能寫在 `.env` 或系統環境變數中，**絕不可** hardcode 寫死在原始碼內，也**不允許**將 `.env` 家族檔案上傳至 Git。
- **.gitignore 嚴格把關**：所有金鑰憑證（`.pem`, `.jks`, `.keystore` 等）、資料庫實體檔（`*.sqlite`, `*.db`）以及建置產物（`node_modules`, `.next`, `.expo`, `dist`）必須永遠留在 `.gitignore` 清單內，防止意外洩漏。

## 帳務原則（複式記帳不變量）

**核心不變量：Σ 所有帳戶餘額 = 0（實體帳戶 + 虛帳）。**

每筆交易都是兩個帳戶之間的轉帳，借貸完全相抵。

### 帳戶分類

| 類型 | 範例 | balance 符號 |
|------|------|------------|
| 實體：現金 | `real:cash` | 正=有錢 |
| 實體：股票市值 | `real:stock:{symbol}` | 正=有資產 |
| 實體：貸款負債 | `real:loan:{id}` | 負=負債 |
| 虛帳收入 | `virtual:SALARY`、`virtual:OPTIONS_PREMIUM` | **負**（價值來源） |
| 虛帳支出 | `virtual:LIVING`、`virtual:INTEREST_OUT` | **正**（價值消耗） |
| 虛帳未實現增益 | `virtual:MARKET_GAIN` | **負** |
| 虛帳未實現損失 | `virtual:MARKET_LOSS` | **正** |
| 虛帳已實現利得 | `virtual:CAPITAL_GAIN` | **負** |

### 各事件的雙向記帳規則

| 事件 | Dr（+）| Cr（-）| 需虛帳？ |
|------|--------|--------|---------|
| 薪水入帳（cash_event） | cash | virtual:SALARY（負）| ✓ |
| 生活費（cash_event） | virtual:LIVING（正）| cash | ✓ |
| 買股票 | stock:{sym} | cash | ✗（純資產 swap）|
| 賣股票 | cash | stock:{sym} | ✗（純資產 swap）|
| 股票漲跌 | stock / virtual:MARKET_LOSS | virtual:MARKET_GAIN / stock | ✓ |
| 已實現股票利得 | cash | virtual:CAPITAL_GAIN（負）| ✓（自動計算）|
| 賣選擇權 | cash | virtual:OPTIONS_PREMIUM（負）| ✓ |
| 買選擇權 | virtual:OPTIONS_BUY（正）| cash | ✓ |
| 貸款入帳 | cash | loan:{id}（更負）| ✗ |
| 還本金 | loan:{id}（減少負債）| cash | ✗ |
| 還利息 | virtual:INTEREST_OUT（正）| cash | ✓ |

### DB 資料表

- `cash_events`：手動現金事件（薪資、生活費、股息等）
  - action 只接受 direction="in" 或 "out" 的 CASH_ACTIONS（不含 MARKET_GAIN/LOSS）
  - amount 永遠為正數，方向由 action.direction 決定

### 實作位置

- `shared/virtualAccounts.ts`：`computeDoubleEntrySnapshot()`，計算所有帳戶快照 + 不變量
- `shared/tradeHistory.ts`：`computeExplainedCashFlow()`（含 cashEvents 參數）
- `app/actions.ts`：`getCashEvents`、`addCashEvent`、`updateCashEvent`、`deleteCashEvent`
- `server/src/routes/cashEvents.ts`：REST CRUD
- Dashboard 收支頁：顯示不變量狀態橫幅 + 帳戶列表（左）+ 虛帳類別（右）+ 手動事件輸入

### 現金科目（`shared/types.ts` CASH_ACTIONS）

收入科目（direction: "in"）：`SALARY`、`DIVIDEND`、`INTEREST_IN`、`CAPITAL_GAIN`、`OPTIONS_PREMIUM`、`LOAN_IN`、`TRANSFER_IN`、`OTHER_IN`、`UNKNOWN_IN`

支出科目（direction: "out"）：`STOCK_BUY`、`OPTIONS_BUY`、`INTEREST_OUT`、`FEE`、`LOAN_PAY`、`LIVING`、`TRANSFER_OUT`、`OTHER_OUT`、`UNKNOWN_OUT`

非現金（direction: "none"，不計入現金流）：`MARKET_GAIN`、`MARKET_LOSS`

## 時區規則

**所有日期與時間一律使用 UTC+8（台灣時間）。**

- 取得今日日期：使用 `todayTW()` from `@/shared/dateUtils`（回傳 YYYYMMDD）
- 取得現在時間戳：使用 `nowTW()` from `@/shared/dateUtils`（回傳 YYYYMMDDHHmmss，適合檔名）
- 禁止直接使用 `new Date().toISOString()` 取當前日期，一律透過 `dateUtils.ts` 的函數
- 比較外部 UTC 時間戳（如資料庫 createdAt）前，先加 8 小時再比較

## 數字顯示規則

**所有數字（金額、股數、口數、成交量等）顯示時必須加 `.toLocaleString()` 以加入千分位逗號。**

- 整數：`value.toLocaleString()`
- 有小數位：`Number(value.toFixed(n)).toLocaleString()`
- 可能為 null：`value != null ? value.toLocaleString() : "—"`
- 模板字串內：`` `費$${fee.toLocaleString()}` ``

禁止直接用 `{someNumber}` 或 `{someNumber.toFixed(n)}` 顯示數字，一律套用 toLocaleString。

## 開發指令
- Web: `npm run dev`（root）
- Server: `cd server && npm run dev`
- Mobile: `cd mobile && npm start`
- DB push: `cd server && npm run db:push`
