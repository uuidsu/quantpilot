# MarketSim 架構文件（React Native 版）

## 技術棧

### 前端（Mobile App）

| 層級 | 技術 | 說明 |
|------|------|------|
| **框架** | React Native + Expo SDK 52 | 跨平台行動應用 |
| **語言** | TypeScript | 型別安全 |
| **導航** | React Navigation 7（Bottom Tabs） | 原生分頁導航 |
| **樣式** | StyleSheet（原生） | React Native 內建樣式系統 |
| **動畫** | React Native Reanimated 3 | 高效能原生動畫 |
| **圖表** | （文字式統計卡片） | 簡化為數字統計，避免額外圖表套件 |
| **圖示** | lucide-react-native | 與 Web 版同一套圖示 |
| **通知** | react-native-toast-message | Toast 通知 |
| **本地儲存** | @react-native-async-storage | 模擬 ID 持久化 |
| **HTTP** | axios | REST API 呼叫 |
| **驗證** | Zod | 前後端共用 Schema |

### 後端（API Server）

| 層級 | 技術 | 說明 |
|------|------|------|
| **框架** | Express.js | 輕量 REST API |
| **語言** | TypeScript | 型別安全 |
| **資料庫** | PostgreSQL | 資料持久化 |
| **ORM** | Drizzle ORM | 型別安全查詢 |
| **驗證** | Zod | 請求驗證 |
| **股價** | priceProviders 模組 | 沿用原有多來源架構 |

---

## 目錄結構

```
workspace/
├── mobile/                        ← React Native App (Expo)
│   ├── app/                          Expo Router 檔案式路由
│   │   ├── _layout.tsx                  根佈局（Theme、Toast Provider）
│   │   └── (tabs)/                      底部分頁群組
│   │       ├── _layout.tsx                 Tab Navigator 設定
│   │       ├── index.tsx                   總覽頁 (Overview)
│   │       ├── holdings.tsx                持股頁 (Holdings)
│   │       └── settings.tsx                設定頁 (Settings)
│   │
│   ├── components/                   可重用 UI 元件
│   │   ├── Card.tsx                     卡片容器
│   │   ├── Button.tsx                   按鈕（多 variant）
│   │   ├── AnimatedNumber.tsx           數字動畫
│   │   ├── LeverageCard.tsx             槓桿率卡片
│   │   ├── ExposureCard.tsx             曝險目標卡片
│   │   ├── HoldingCard.tsx              個股持倉卡片
│   │   ├── SearchSheet.tsx              股票搜尋底部彈窗
│   │   ├── AdvicePanel.tsx              風險建議面板
│   │   ├── ApiStatsCard.tsx             API 統計圖表
│   │   └── SliderCard.tsx               漲跌模擬滑桿
│   │
│   ├── services/                     API 呼叫層
│   │   └── api.ts                       axios 封裝，所有 REST 呼叫
│   │
│   ├── hooks/                        自訂 Hooks
│   │   ├── useSimulation.ts             模擬局狀態管理
│   │   └── useHoldings.ts               持股 CRUD + 即時刷新
│   │
│   ├── types/                        共用型別
│   │   └── index.ts                     Simulation, Holding, ApiUsage 等
│   │
│   ├── constants/                    常數
│   │   ├── providers.ts                 PROVIDER_DEFS（股價來源定義）
│   │   └── theme.ts                     色彩定義（暗色主題）
│   │
│   ├── app.json                      Expo 設定
│   ├── tsconfig.json                 TypeScript 設定
│   └── package.json                  前端依賴
│
├── server/                        ← Express API Server
│   ├── src/
│   │   ├── index.ts                     進入點（Express app setup）
│   │   ├── routes/
│   │   │   ├── simulations.ts              /api/simulations 路由
│   │   │   ├── holdings.ts                 /api/holdings 路由
│   │   │   ├── sources.ts                  /api/sources 路由
│   │   │   └── search.ts                   /api/search 路由
│   │   │
│   │   ├── db/
│   │   │   ├── schema.ts                   Drizzle 表定義（沿用）
│   │   │   └── index.ts                    資料庫連線（沿用）
│   │   │
│   │   └── lib/
│   │       └── priceProviders.ts           股價撈取模組（沿用）
│   │
│   ├── drizzle.config.ts             Drizzle Kit 設定
│   ├── tsconfig.json                 TypeScript 設定
│   └── package.json                  後端依賴
│
└── shared/                        ← 前後端共用
    ├── types.ts                      共用型別定義
    └── validators.ts                 共用 Zod Schema
```

---

## 架構總覽圖

```
┌─────────────────────────────────────────────────────────────┐
│                   React Native App (Expo)                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  總覽 Tab │  │  持股 Tab │  │  設定 Tab │  ← Bottom Tabs  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │              │              │                        │
│  ┌────┴──────────────┴──────────────┴────┐                  │
│  │          Custom Hooks Layer           │                  │
│  │  useSimulation()   useHoldings()      │                  │
│  └───────────────────┬───────────────────┘                  │
│                      │                                      │
│  ┌───────────────────┴───────────────────┐                  │
│  │           API Service (axios)          │                  │
│  │  api.getSimulation()  api.addHolding() │                  │
│  └───────────────────┬───────────────────┘                  │
│                      │ HTTP (REST)                          │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────┴──────────────────────────────────────┐
│                Express.js API Server                        │
│                                                             │
│  ┌──────────────────────────────────────────┐               │
│  │              Route Layer                  │               │
│  │  /api/simulations  /api/holdings          │               │
│  │  /api/sources      /api/search            │               │
│  └─────────────────────┬────────────────────┘               │
│                        │                                    │
│  ┌─────────────────────┴────────────────────┐               │
│  │         Business Logic Layer              │               │
│  │  priceProviders   validators              │               │
│  └─────────────────────┬────────────────────┘               │
│                        │                                    │
│  ┌─────────────────────┴────────────────────┐               │
│  │         Drizzle ORM → PostgreSQL          │               │
│  └───────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

---

## 前端進入流程

```
App 啟動
    ↓
Expo Router _layout.tsx（載入 Theme、Toast Provider）
    ↓
(tabs)/_layout.tsx（建立 Bottom Tab Navigator）
    ↓
useSimulation() Hook
    ├── AsyncStorage 取得上次模擬 ID
    ├── 有 → GET /api/simulations/:id → 載入
    └── 沒有 → POST /api/simulations → 建立新模擬
    ↓
渲染 Tab 畫面
```

**無 splash 畫面**，進入即看到總覽頁面。

---

## 分頁結構（Bottom Tab Bar）

| 分頁 | 圖示 | 內容 |
|------|------|------|
| **總覽** | Home | 淨值、損益、漲跌模擬滑桿、槓桿率卡片、曝險目標卡片 |
| **持股** | Briefcase | 持倉列表、新增搜尋、現金／負債設定 |
| **設定** | Settings | 股價來源設定、API 統計、重設投資組合 |

---

## REST API 端點

### Simulations

| 方法 | 路徑 | 說明 |
|------|------|------|
| `POST` | `/api/simulations` | 建立新模擬局 |
| `GET` | `/api/simulations` | 列出所有模擬局 |
| `GET` | `/api/simulations/:id` | 取得單一模擬 |
| `PATCH` | `/api/simulations/:id` | 更新（cash / leverageLimit / exposureTarget） |
| `DELETE` | `/api/simulations/:id` | 刪除模擬局 |

### Holdings

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/simulations/:simId/holdings` | 取得持股清單 |
| `POST` | `/api/simulations/:simId/holdings` | 新增持股 |
| `PATCH` | `/api/holdings/:id` | 更新持股（shares / beta） |
| `DELETE` | `/api/holdings/:id` | 刪除持股 |
| `POST` | `/api/holdings/:id/fetch-price` | 撈取最新股價 |

### Sources

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/sources` | 取得所有來源設定 |
| `PUT` | `/api/sources/:sourceId` | 更新來源 API Key |
| `POST` | `/api/sources/:sourceId/set-default` | 設為預設來源 |

### Search & Stats

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/search?q=...` | 搜尋股票代號 |
| `GET` | `/api/stats` | 取得 API 使用統計 |

---

## 資料流

```
使用者操作（點擊新增持股 / 更新股價 / …）
    ↓
React Native 元件
    ↓ 呼叫 Custom Hook
useHoldings / useSimulation
    ↓ 呼叫 API Service
api.ts（axios）
    ↓ HTTP REST
Express Route Handler
    ↓ Drizzle ORM
PostgreSQL
    ↓ 回傳 JSON
axios response
    ↓ 更新 state
React Native 元件 re-render
```

---

## 遷移對照表

| Web 版（Next.js） | Mobile 版（React Native） |
|-------------------|--------------------------|
| `"use server"` Server Actions | Express.js REST API |
| `"use client"` 客戶端元件 | React Native 元件 |
| Next.js App Router | Expo Router + React Navigation |
| Tailwind CSS | StyleSheet（React Native 內建） |
| `<div>`, `<span>`, `<p>` | `<View>`, `<Text>` |
| `<input>` | `<TextInput>` |
| `<button onClick>` | `<Pressable onPress>` / `<TouchableOpacity>` |
| Framer Motion | React Native Reanimated |
| Recharts | 文字式統計（原生元件） |
| Sonner (Toast) | react-native-toast-message |
| localStorage | AsyncStorage |
| `fetch()` 直呼 Server Action | `axios` 呼叫 REST API |
| CSS `className` | `StyleSheet.create()` |
| `position: fixed` | 原生 Tab Bar（React Navigation 內建） |

---

## 環境變數

### Server

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `API_PORT` | API 伺服器埠號（預設 3001） |

### Mobile

| 變數 | 說明 |
|------|------|
| `EXPO_PUBLIC_API_URL` | API Server 位址（如 `http://192.168.x.x:3001`） |

---

## 開發指令

### Server

```bash
cd server
npm install
npm run dev          # 啟動開發伺服器（nodemon + tsx）
npm run db:push      # 推送資料庫 schema
```

### Mobile

```bash
cd mobile
npm install
npx expo start       # 啟動 Expo 開發伺服器
npx expo start --ios  # iOS 模擬器
npx expo start --android  # Android 模擬器
```

---

## 元件遷移對照

### 原始元件 → 新元件拆分

| 原始（Web） | 新（RN） | 說明 |
|------------|---------|------|
| `AppShell.tsx` | `useSimulation` hook | 載入邏輯移入 hook |
| `Dashboard.tsx`（1150 行） | 拆成多個 Tab Screen + 子元件 | 大幅拆分 |
| └ Overview 區塊 | `(tabs)/index.tsx` + `SliderCard` + `LeverageCard` + `ExposureCard` | |
| └ Holdings 區塊 | `(tabs)/holdings.tsx` + `HoldingCard` + `SearchSheet` | |
| └ Settings 區塊 | `(tabs)/settings.tsx` + `ApiStatsCard` | |
| `ui-elements.tsx` | `Card.tsx` + `Button.tsx` + `AnimatedNumber.tsx` | 各自獨立檔案 |
| `MarketChart.tsx` | 併入 `ApiStatsCard` 或獨立圖表元件 | 用 Victory Native |
| `AdvicePanel.tsx` | `AdvicePanel.tsx` | 直接遷移 |
