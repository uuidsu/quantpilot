# QuantPilot

台股量化交易管理平台 — 整合期權部位追蹤、策略模擬、風險分析與即時報價。

## 功能特色

- **部位總覽** — 即時追蹤股票與選擇權持倉，計算未實現損益
- **選擇權交易** — 台指期選擇權下單管理、Delta 曝險計算
- **策略管理** — 建立並追蹤多種交易策略
- **價格崩跌模擬** — 拖曳式情境模擬，即時預估極端行情下的 P&L
- **虛擬帳戶** — 多帳戶資金管理、借貸追蹤
- **行情圖表** — 歷史走勢視覺化
- **即時報價** — 支援 Yahoo Finance、富果 API 等多來源報價
- **離線同步** — 行動端 SQLite 本地快取 + 伺服器同步

## 架構

Monorepo 結構，三個主要模組：

```
quantpilot/
├── app/                  # Next.js 15 Web 前端 (App Router)
│   ├── actions.ts        # Server Actions
│   ├── page.tsx          # 首頁
│   └── simulation/       # 模擬頁面
├── components/           # Web 共用元件
│   ├── Dashboard.tsx     # 主控台 (多分頁)
│   ├── MarketChart.tsx   # 走勢圖
│   └── AdvicePanel.tsx   # 風險建議面板
├── server/               # Express API 伺服器
│   └── src/
│       ├── routes/       # RESTful API 端點
│       ├── db/           # PostgreSQL 連線 + Schema
│       └── lib/          # 報價提供者、台期選工具
├── mobile/               # Expo React Native App
│   ├── app/(tabs)/       # Tab 頁面
│   ├── components/       # Mobile 元件
│   ├── hooks/            # 自訂 Hooks
│   └── services/         # API 客戶端 + SQLite 快取
├── shared/               # 跨平台共用邏輯
│   ├── types.ts          # 型別定義
│   ├── portfolio.ts      # 投資組合計算
│   ├── optionsTrades.ts  # 選擇權交易邏輯
│   ├── accounts.ts       # 帳戶管理
│   ├── loan.ts           # 借貸計算
│   └── validators.ts     # Zod 驗證
├── db/                   # Web 端 Drizzle ORM
└── lib/                  # Web 端工具函式
```

## 技術棧

| 層級 | 技術 |
|------|------|
| Web 前端 | Next.js 15 · React 18 · Tailwind CSS 3 · Framer Motion · Recharts |
| API 伺服器 | Express 4 · TypeScript · tsx |
| 行動端 | Expo 54 · React Native 0.81 · Expo Router · expo-sqlite |
| 資料庫 | PostgreSQL (伺服器) · SQLite (行動端離線快取) |
| ORM | Drizzle ORM |
| 驗證 | Zod |

## 快速開始

### 環境需求

- Node.js 18+
- PostgreSQL

### 安裝

```bash
# Web 前端
npm install

# API 伺服器
cd server && npm install

# 行動端
cd mobile && npm install
```

### 環境變數

建立 `.env`：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/quantpilot
```

### 初始化資料庫

```bash
npm run db:push
cd server && npm run db:push
```

### 啟動

```bash
# Web 前端 (port 5000)
npm run dev

# API 伺服器
cd server && npm run dev

# 行動端
cd mobile && npx expo start
```

## 指令一覽

### Web 前端

| 指令 | 說明 |
|------|------|
| `npm run dev` | 開發模式 (port 5000) |
| `npm run build` | 建置生產版本 |
| `npm run start` | 啟動生產伺服器 |
| `npm run check` | TypeScript 型別檢查 |
| `npm run db:push` | 推送 schema 至資料庫 |

### API 伺服器

| 指令 | 說明 |
|------|------|
| `npm run dev` | 開發模式 (hot reload) |
| `npm run start` | 啟動伺服器 |
| `npm run db:push` | 推送 schema 至資料庫 |

### 行動端

| 指令 | 說明 |
|------|------|
| `npm start` | Expo 開發伺服器 |
| `npm run ios` | iOS 模擬器 |
| `npm run android` | Android 模擬器 |

## API 端點

伺服器提供以下 RESTful API：

| 路徑 | 說明 |
|------|------|
| `/api/sources` | 報價來源設定 |
| `/api/symbol-meta` | 商品資訊查詢 |
| `/api/search` | 搜尋 |
| `/api/options` | 選擇權資料 |
| `/api/options-trades` | 選擇權交易紀錄 |
| `/api/options-targets` | 選擇權目標 |
| `/api/stock-trades` | 股票交易紀錄 |
| `/api/strategies` | 策略管理 |
| `/api/simulations` | 模擬情境 |
| `/api/cash-events` | 資金事件 |
| `/api/loans` | 借貸管理 |
| `/api/app-settings` | 應用設定 |

## 授權條款

本專案以開源方式釋出，供學習、研究與非商業用途使用。

- **禁止商業使用** — 不得將本專案用於商業產品或付費服務
- **必須標示出處** — 使用或衍生作品須註明原始專案名稱與連結
- **衍生作品** — 須以相同條款釋出，不得移除版權聲明

> 本專案僅供模擬與教育用途，不構成投資建議。

---

如有商業合作需求，請透過 Issue 聯繫。
