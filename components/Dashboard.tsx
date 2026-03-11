"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCcw,
  Settings2,
  Home,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  BarChart2,
  X,
  Check,
  Crosshair,
  Activity,
  ChevronDown,
  Filter,
  History,
  Database,
  Clock,
  Briefcase,
  LayoutGrid,
  ChevronRight,
  GitBranch,
  AlertTriangle,
  Landmark,
  Wallet,
  Download,
  Upload,
  HardDrive,
  Bell,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Layers,
  CheckCircle2,
  XCircle,
  CalendarDays,
  List,
  ChevronLeft,
} from "lucide-react";
import {
  createSimulation,
  deleteSimulation,
  listSimulations,
  getSymbolMetas,
  upsertSymbolMeta,
  fetchSymbolPrice,
  fetchMarketIndex,
  getStrategies,
  addStrategy,
  updateStrategy,
  deleteStrategy,
  getApiStats,
  getSourceConfigs,
  upsertSourceConfig,
  setDefaultSource,
  fetchAndCacheOptionsDelta,
  getOptionsDeltaRows,
  getAvailableOptionsDates,
  getOptionsApiStats,
  getOptionsTrades,
  addOptionsTrade,
  deleteOptionsTrade,
  getStockTrades,
  addStockTrade,
  deleteStockTrade,
  deleteAllTrades,
  getOptionsPriceMap,
  getLoans,
  createLoan,
  deleteLoan,
  getApiCacheEntries,
  getApiUsageEntries,
  getOptionsDeltaCacheEntries,
  getOptionsTargets,
  createOptionsTarget,
  deleteOptionsTarget,
  getOptionsTargetMatches,
  updateLoan,
  updateOptionsTarget,
  updateOptionsTrade,
  updateStockTrade,
  getLoanPayments,
  addLoanPayment,
  updateLoanPayment,
  deleteLoanPayment,
  getLoanRateEvents,
  addLoanRateEvent,
  deleteLoanRateEvent,
  getAppSettings,
  upsertAppSetting,
  getCashEvents, addCashEvent, deleteCashEvent,
} from "@/app/actions";
import type { OptionsDeltaRow, OptionsTrade, StockTrade, Loan, OptionsTarget, LoanPayment, CashEvent } from "@/db/schema";
import type { SymbolMeta, Position, LoanInstallment, OptionsTargetMatch, OptionsHolding, LoanRateEvent } from "@/shared/types";
import { cashActionLabel, CASH_ACTIONS, type CashAction } from "@/shared/types";
import { computeDoubleEntrySnapshot } from "@/shared/virtualAccounts";
import { generateLoanSchedule, generateLoanTrades, computeLoanSummary, computeMonthlyPayment, computeRemainingBalance } from "@/shared/loan";
import { todayTW, nowTW } from "@/shared/dateUtils";
import { PROVIDER_DEFS, type ProviderId } from "@/lib/priceProviders";
import type { SourceConfig, Strategy } from "@/db/schema";
import { Card, Button, Input, Label, AnimatedNumber } from "@/components/ui-elements";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { computeHoldings, computePnlSummary, computePnlHistory, TXO_MULTIPLIER } from "@/shared/optionsTrades";
import { classifyContractMonth } from "@/shared/optionsFilter";
import { formatTradeDate, computeExplainedCashFlow } from "@/shared/tradeHistory";
import { buildUnifiedAccounts } from "@/shared/accounts";
import type { UnifiedAccount } from "@/shared/types";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { Simulation, ApiUsage } from "@/db/schema";
import {
  computePortfolioMetrics,
  computeLeverage,
  computeExposure,
  computeRebalancing,
  computeHoldingRecommendations,
  computePositions,
} from "@/shared/portfolio";

type Tab = "overview" | "account" | "trades" | "strategy" | "database" | "settings" | "sync" | "backup" | "feedback" | "cashflow";


type PendingNotif = {
  id: string;
  loanId: number;
  loanName: string;
  loanType: "annuity" | "interest_only";
  period: number;
  paymentDate: string;
  totalPayment: number;
  principalPortion: number;
  interestPortion: number;
};

interface DashboardProps {
  initialData: Simulation;
  onSimChange?: (sim: Simulation) => void;
}

// ── Module-level constants ──────────────────────────────────────────────────

const CHART_COLORS = ["#007aff", "#34c759", "#ff9f0a", "#ff375f", "#5e5ce6", "#32ade6", "#ac8e68"];

const INTERVALS = [
  { label: "關閉", value: 0 },
  { label: "1 分鐘", value: 60 },
  { label: "5 分鐘", value: 300 },
  { label: "15 分鐘", value: 900 },
  { label: "30 分鐘", value: 1800 },
  { label: "1 小時", value: 3600 },
];

// ── Module-level types ──────────────────────────────────────────────────────

type UnifiedRow = {
  id: string;
  type: "options" | "stock" | "loan" | "market_value" | "cash";
  date: string;
  action: string;
  from: string;
  to: string;
  price: number;
  qty: number;
  fee: number;
  deletable: boolean;
  source: "user" | "system";
};

// ── SwipeableRow：左滑展開右側操作按鈕、右滑展開左側按鈕 ──────────────────
// 使用 Pointer Events API + setPointerCapture，同時支援 mouse 和 touch
function SwipeableRow({
  children,
  onEdit,
  onDelete,
  onSwipeRight,
  editLabel = "編輯",
  deleteLabel = "刪除",
  swipeRightLabel = "調整",
  swipeRightColor = "bg-orange-500",
  isOpen = false,
}: {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onSwipeRight?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  swipeRightLabel?: string;
  swipeRightColor?: string;
  isOpen?: boolean;
}) {
  const RIGHT_BTN_W = (onEdit ? 60 : 0) + (onDelete ? 60 : 0);
  const LEFT_BTN_W  = onSwipeRight ? 72 : 0;
  const SNAP_THRESHOLD = 30;

  const [offset, setOffset] = React.useState(0);
  const offsetRef   = React.useRef(0);
  const startX      = React.useRef(0);
  const startY      = React.useRef(0);
  const startOff    = React.useRef(0);
  const didSwipe    = React.useRef(false);
  const dirLocked   = React.useRef<"h" | "v" | null>(null); // horizontal / vertical / undecided

  // offsetRef 跟 state 同步，供 onPointerUp 讀取最新值
  React.useEffect(() => { offsetRef.current = offset; }, [offset]);
  React.useEffect(() => { if (!isOpen) setOffset(0); }, [isOpen]);

  const close = () => setOffset(0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startX.current   = e.clientX;
    startY.current   = e.clientY;
    startOff.current = offsetRef.current;
    didSwipe.current  = false;
    dirLocked.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    // 方向未定：等移動超過 6px 再判斷
    if (dirLocked.current === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      dirLocked.current = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      if (dirLocked.current === "h") {
        // 確認是橫向滑動才捕捉 pointer
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }

    if (dirLocked.current !== "h") return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    if (Math.abs(dx) > 5) didSwipe.current = true;
    const raw = startOff.current + dx;
    setOffset(Math.max(-RIGHT_BTN_W, Math.min(LEFT_BTN_W, raw)));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const o = offsetRef.current;
    if      (o < -SNAP_THRESHOLD) setOffset(-RIGHT_BTN_W);
    else if (o >  SNAP_THRESHOLD) setOffset(LEFT_BTN_W);
    else                          setOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* 左側按鈕（右滑展開）*/}
      {onSwipeRight && (
        <div className="absolute left-0 top-0 bottom-0 flex" style={{ width: LEFT_BTN_W }}>
          <button onClick={() => { close(); onSwipeRight(); }}
            className={`flex-1 ${swipeRightColor} text-white text-[11px] font-semibold flex items-center justify-center`}
          >{swipeRightLabel}</button>
        </div>
      )}
      {/* 右側按鈕（左滑展開）*/}
      {RIGHT_BTN_W > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: RIGHT_BTN_W }}>
          {onEdit && (
            <button onClick={() => { close(); onEdit(); }}
              className="flex-1 bg-blue-500 text-white text-[11px] font-semibold flex items-center justify-center"
            >{editLabel}</button>
          )}
          {onDelete && (
            <button onClick={() => { close(); onDelete(); }}
              className="flex-1 bg-destructive text-white text-[11px] font-semibold flex items-center justify-center"
            >{deleteLabel}</button>
          )}
        </div>
      )}
      {/* 內容層 */}
      <div
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 || Math.abs(offset) === RIGHT_BTN_W || Math.abs(offset) === LEFT_BTN_W ? "transform 0.2s ease" : "none" }}
        className="relative bg-background select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClickCapture={e => { if (didSwipe.current) { e.stopPropagation(); didSwipe.current = false; } }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Trade row helpers (pure, no closure) ───────────────────────────────────

function getTradeIcon(r: UnifiedRow): React.ReactNode {
  if (r.type === "stock") return r.action === "SELL" ? <ArrowUpRight className="w-4 h-4 text-white" /> : <TrendingUp className="w-4 h-4 text-white" />;
  if (r.type === "options") return <Activity className="w-4 h-4 text-white" />;
  if (r.type === "market_value") return r.action === "MARKET_GAIN" ? <TrendingUp className="w-4 h-4 text-white" /> : <TrendingDown className="w-4 h-4 text-white" />;
  if (r.type === "cash") return CASH_ACTIONS[r.action as CashAction]?.direction === "in" ? <ArrowDownLeft className="w-4 h-4 text-white" /> : <ArrowUpRight className="w-4 h-4 text-white" />;
  if (r.action === "LOAN_IN") return <ArrowDownLeft className="w-4 h-4 text-white" />;
  if (r.action === "INTEREST_OUT") return <DollarSign className="w-4 h-4 text-white" />;
  return <Landmark className="w-4 h-4 text-white" />;
}

function getTradeIconBg(r: UnifiedRow): string {
  if (r.type === "stock") return r.action === "SELL" ? "bg-green-500" : "bg-blue-500";
  if (r.type === "options") return r.action === "SELL" ? "bg-purple-500" : "bg-indigo-500";
  if (r.type === "market_value") return r.action === "MARKET_GAIN" ? "bg-green-500" : "bg-destructive";
  if (r.type === "cash") return CASH_ACTIONS[r.action as CashAction]?.direction === "in" ? "bg-green-500" : "bg-destructive";
  if (r.action === "LOAN_IN") return "bg-orange-500";
  if (r.action === "INTEREST_OUT") return "bg-destructive";
  return "bg-orange-500";
}

// ── Account timeline chart helpers ────────────────────────────────────────────

type TimeSeriesPoint = { date: string; value: number; label: string };

function computeStockTimeSeries(
  trades: import("@/shared/types").StockTrade[],
): TimeSeriesPoint[] {
  const sorted = [...trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  let cumCost = 0;
  const points: TimeSeriesPoint[] = [];
  for (const t of sorted) {
    cumCost += t.action === "BUY" ? t.price * t.quantity + t.fee : -(t.price * t.quantity - t.fee);
    points.push({ date: t.tradeDate, value: cumCost, label: formatTradeDate(t.tradeDate) });
  }
  return points;
}

function computeOptionsTimeSeries(
  trades: import("@/shared/types").OptionsTrade[],
): TimeSeriesPoint[] {
  const sorted = [...trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  let cumPremium = 0;
  const points: TimeSeriesPoint[] = [];
  for (const t of sorted) {
    cumPremium += t.action === "SELL" ? t.price * t.quantity * TXO_MULTIPLIER - t.fee : -(t.price * t.quantity * TXO_MULTIPLIER + t.fee);
    points.push({ date: t.tradeDate, value: cumPremium, label: formatTradeDate(t.tradeDate) });
  }
  return points;
}

function computeLoanTimeSeries(
  schedule: LoanInstallment[],
): TimeSeriesPoint[] {
  if (schedule.length === 0) return [];
  const step = Math.max(1, Math.floor(schedule.length / 24));
  const sampled = schedule.filter((_, i) => i === 0 || i === schedule.length - 1 || i % step === 0);
  return sampled.map(s => ({
    date: s.paymentDate,
    value: s.remainingBalance,
    label: `${s.paymentDate.slice(0, 4)}/${s.paymentDate.slice(4, 6)}`,
  }));
}

function computeCashTimeSeries(
  stockTrades: import("@/shared/types").StockTrade[],
  optionsTrades: import("@/shared/types").OptionsTrade[],
  loans: import("@/shared/types").Loan[],
  payments: import("@/shared/types").LoanPayment[],
  cashEvents: import("@/shared/types").CashEvent[],
): TimeSeriesPoint[] {
  const events: { date: string; delta: number }[] = [];
  for (const t of stockTrades) {
    events.push({ date: t.tradeDate, delta: t.action === "SELL" ? t.price * t.quantity - t.fee : -(t.price * t.quantity + t.fee) });
  }
  for (const t of optionsTrades) {
    events.push({ date: t.tradeDate, delta: t.action === "SELL" ? t.price * t.quantity * TXO_MULTIPLIER - t.fee : -(t.price * t.quantity * TXO_MULTIPLIER + t.fee) });
  }
  for (const l of loans) {
    events.push({ date: l.startDate, delta: l.principal });
  }
  for (const p of payments) {
    events.push({ date: p.paymentDate, delta: -p.amount });
  }
  for (const e of cashEvents) {
    const dir = CASH_ACTIONS[e.action as CashAction]?.direction;
    if (dir === "in") events.push({ date: e.tradeDate, delta: e.amount });
    else if (dir === "out") events.push({ date: e.tradeDate, delta: -e.amount });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  let running = 0;
  return events.map(ev => {
    running += ev.delta;
    return { date: ev.date, value: running, label: formatTradeDate(ev.date) };
  });
}

function MiniLineChart({
  data,
  gradientId,
  positive,
  valueFormatter,
}: {
  data: TimeSeriesPoint[];
  gradientId: string;
  positive?: boolean;
  valueFormatter?: (v: number) => string;
}) {
  if (data.length < 2) return null;
  const last = data[data.length - 1].value;
  const first = data[0].value;
  const isPositive = positive ?? (last >= first);
  const color = isPositive ? "#34c759" : "#ff375f";
  return (
    <ResponsiveContainer width="100%" height={110}>
      <AreaChart data={data} margin={{ top: 8, right: 2, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "#8e8e93" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 10,
            fontSize: 11,
            padding: "4px 10px",
          }}
          formatter={(v: number) => [
            valueFormatter ? valueFormatter(v) : `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            "",
          ]}
          labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function getTradeAmount(r: UnifiedRow): number {
  if (r.type === "stock") return r.price * r.qty;
  if (r.type === "options") return r.price * r.qty * TXO_MULTIPLIER;
  if (r.type === "market_value") return r.price * r.qty;
  return r.price;
}

function getTradeActionLabel(r: UnifiedRow): string {
  if (r.action === "BUY") return r.type === "stock" ? "買股" : "買權";
  if (r.action === "SELL") return r.type === "stock" ? "賣股" : "賣權";
  if (r.action === "LOAN_IN") return "入帳";
  if (r.action === "LOAN_PAY") return "還款";
  if (r.action === "INTEREST_OUT" && r.type !== "cash") return "利息";
  if (r.action === "MARKET_GAIN") return "未實現↑";
  if (r.action === "MARKET_LOSS") return "未實現↓";
  if (r.type === "cash") return cashActionLabel(r.action as CashAction);
  return r.action;
}

// ── Shared UI components ────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-5 pb-1.5">{title}</p>
  );
}

function StatCard({ label, value, colorCls, iconBg, icon }: {
  label: string; value: string; colorCls: string; iconBg: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl p-3.5 shadow-card flex items-center gap-3">
      <div className={`w-9 h-9 rounded-[10px] ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-base font-bold tabular-nums leading-tight ${colorCls}`}>{value}</p>
      </div>
    </div>
  );
}

type SettingRowProps = {
  rowId: string;
  iconBg: string;
  icon: React.ReactNode;
  label: string;
  value?: string;
  last?: boolean;
  children?: React.ReactNode;
  action?: () => void;
  openRows: Set<string>;
  onToggle: (id: string) => void;
};

const SettingRow = React.memo(function SettingRow({ rowId, iconBg, icon, label, value, last = false, children, action, openRows, onToggle }: SettingRowProps) {
  const isOpen = openRows.has(rowId);
  return (
    <div>
      <button
        onClick={action ?? (() => onToggle(rowId))}
        className="w-full flex items-center px-4 py-3.5 hover:bg-secondary/30 active:bg-secondary/50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-[9px] ${iconBg} flex items-center justify-center shrink-0 mr-3.5`}>
          {icon}
        </div>
        <span className="flex-1 text-[15px] text-left">{label}</span>
        {value && <span className="text-sm text-muted-foreground mr-1.5">{value}</span>}
        {!action && <ChevronRight className={`w-4 h-4 text-muted-foreground/50 transition-transform ${isOpen ? "rotate-90" : ""}`} />}
      </button>
      {!action && isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-border/60">
          {children}
        </div>
      )}
      {!last && !isOpen && <div className="h-px bg-border/60 ml-[60px]" />}
    </div>
  );
});

export function Dashboard({ initialData, onSimChange }: DashboardProps) {
  const [sim, setSim] = useState<Simulation>(initialData);
  const [initLoading, setInitLoading] = useState(true);
  const [symbolMetas, setSymbolMetas] = useState<SymbolMeta[]>([]);
  const [baseIndex, setBaseIndex] = useState(22000); // 目前大盤指數
  const [simIndex, setSimIndex] = useState(22000);   // 模擬大盤指數
  const [indexLoading, setIndexLoading] = useState(false);
  const marketAdjust = baseIndex > 0 ? (simIndex - baseIndex) / baseIndex * 100 : 0;
  const indexDelta = simIndex - baseIndex;
  const [activeTab, setActiveTab] = useState<Tab>("account");
  // Strategy
  const [strategyList, setStrategyList] = useState<Strategy[]>([]);
  const [activeStrategyId, setActiveStrategyId] = useState<number | null>(null);
  const [expandedStrategyId, setExpandedStrategyId] = useState<number | null>(null);
  const [editingStrategyId, setEditingStrategyId] = useState<number | null>(null);
  const [editStrategyName, setEditStrategyName] = useState("");
  const [savingStrategy, setSavingStrategy] = useState<number | null>(null);

  // More menu
  const [showMore, setShowMore] = useState(false);

  // Notification panel
  const [openSettingRows, setOpenSettingRows] = useState<Set<string>>(new Set());
  const toggleSettingRow = (id: string) => setOpenSettingRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set());
  const [confirmingNotifId, setConfirmingNotifId] = useState<string | null>(null);
  const [confirmDraft, setConfirmDraft] = useState({ paymentDate: "", principal: "0", interest: "0" });

  // Search panel
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Inline beta editing (by symbol string)
  const [inlineBetaSymbol, setInlineBetaSymbol] = useState<string | null>(null);
  const [inlineBeta, setInlineBeta] = useState("");



  // Loading states
  const [isResetting, setIsResetting] = useState(false);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [apiStats, setApiStats] = useState<ApiUsage[]>([]);
  const [sourceConfigs, setSourceConfigs] = useState<SourceConfig[]>([]);
  const [keyDraft, setKeyDraft] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Database tab state
  const [dbPriceCache, setDbPriceCache] = useState<{ id: number; symbol: string; source: string; price: number; fetchedAt: string | null }[]>([]);
  const [dbApiUsage, setDbApiUsage] = useState<{ id: number; source: string; symbol: string; success: boolean; responseTimeMs: number | null; createdAt: string | null }[]>([]);
  const [dbDeltaCache, setDbDeltaCache] = useState<OptionsDeltaRow[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSubTab, setDbSubTab] = useState<"price" | "delta" | "usage">("price");
  const [dailyRefreshTime, setDailyRefreshTime] = useState("14:00");

  // Options Delta state
  const [optionsRows, setOptionsRows] = useState<OptionsDeltaRow[]>([]);
  const [optionsDates, setOptionsDates] = useState<string[]>([]);
  const [optionsDate, setOptionsDate] = useState<string>("");
  const [optionsFetching, setOptionsFetching] = useState(false);
  const [optionsFilter, setOptionsFilter] = useState({
    callPut: "ALL" as "ALL" | "C" | "P",
    deltaMin: "",
    deltaMax: "",
    strikePriceMin: "",
    strikePriceMax: "",
    contractMonth: "ALL",
  });
  const [optionsCooldownUntil, setOptionsCooldownUntil] = useState<Date | null>(null);
  const [optionsCallSuccess, setOptionsCallSuccess] = useState(0);
  const [optionsCallFail, setOptionsCallFail] = useState(0);
  const [optionsLastCall, setOptionsLastCall] = useState<Date | null>(null);
  const [cooldownRemain, setCooldownRemain] = useState(0);

  // Options Trades state
  const [optionsTrades, setOptionsTrades] = useState<OptionsTrade[]>([]);
  const [dailyPriceMap, setDailyPriceMap] = useState<Record<string, Record<string, number>>>({});
  const [stockTradesList, setStockTradesList] = useState<StockTrade[]>([]);
  const [loansList, setLoansList] = useState<Loan[]>([]);
  const [loanPaymentsMap, setLoanPaymentsMap] = useState<Record<number, LoanPayment[]>>({});
  const [loanRateEventsMap, setLoanRateEventsMap] = useState<Record<number, LoanRateEvent[]>>({});
  // Options targets state
  const [optionsTargetMatches, setOptionsTargetMatches] = useState<{
    target: OptionsTarget;
    matchedStrike: number | null;
    matchedDelta: number | null;
    matchedPrice: number | null;
    matchedContractMonth: string | null;
    lastMarketDate: string | null;
    lastFetchedAt: string | null;
  }[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  type AddMenuType = "stock" | "options_target" | "cash" | "loan";
  const [showAddForm, setShowAddForm] = useState<AddMenuType | null>(null);
  const nextMonthStr = (() => {
    const d = new Date(Date.now() + 8 * 3600_000); // UTC+8
    d.setUTCMonth(d.getUTCMonth() + 1);
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  })();
  const [optionsTargetForm, setOptionsTargetForm] = useState({
    action: "SELL" as "SELL" | "BUY",
    callPut: "P" as "C" | "P",
    targetDelta: "0.15",
    contractMonth: nextMonthStr,
    quantity: "1",
    notes: "",
  });
  const [accountLoanForm, setAccountLoanForm] = useState({
    name: "",
    principal: "",
    annualRate: "",
    periods: "",
    startDate: todayTW(),
    loanType: "annuity" as "annuity" | "interest_only",
    notes: "",
  });
  // Delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ label: string; onConfirm: () => Promise<void> } | null>(null);
  // Balance adjustment modal
  const [balanceAdjust, setBalanceAdjust] = useState<{ label: string; currentBalance: number; onConfirm: (target: number) => Promise<void> } | null>(null);
  const [balanceAdjustInput, setBalanceAdjustInput] = useState("");
  // Account tab: balance breakdown toggle
  const [showBalanceDetail, setShowBalanceDetail] = useState(false);
  // Account tab: detail overlay
  const [accountDetailId, setAccountDetailId] = useState<string | null>(null);
  const [accountTradeForm, setAccountTradeForm] = useState<"stock" | "options" | null>(null);
  const [acctStockTradeForm, setAcctStockTradeForm] = useState({
    tradeDate: todayTW(),
    action: "BUY" as "BUY" | "SELL",
    price: "",
    quantity: "",
    fee: "0",
  });
  const [acctOptionsTradeForm, setAcctOptionsTradeForm] = useState({
    tradeDate: todayTW(),
    action: "BUY" as "BUY" | "SELL",
    contractMonth: "",
    callPut: "P" as "C" | "P",
    strikePrice: "",
    price: "",
    quantity: "1",
    fee: "0",
  });

  type TradesSubTab = "all" | "stock" | "options" | "loans" | "market_value" | "cash";
  const [tradesSubTab, setTradesSubTab] = useState<TradesSubTab>("all");
  const [tradesView, setTradesView] = useState<"list" | "calendar">("list");
  const [calendarYM, setCalendarYM] = useState<string>(() => todayTW().slice(0, 6)); // YYYYMM
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [showSystemEvents, setShowSystemEvents] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showTradesPageForm, setShowTradesPageForm] = useState(false);
  const [addFormType, setAddFormType] = useState<"stock" | "options" | "loan" | "cash">("stock");
  const [showFutureLoanTrades, setShowFutureLoanTrades] = useState(false);
  const [loanForm, setLoanForm] = useState({
    name: "",
    principal: "",
    annualRate: "",
    periods: "",
    startDate: todayTW(),
    loanType: "annuity" as "annuity" | "interest_only",
    notes: "",
  });
  const [tradeForm, setTradeForm] = useState({
    tradeDate: todayTW(),
    action: "BUY" as "BUY" | "SELL",
    contractId: "TXO",
    contractMonth: "",
    callPut: "C" as "C" | "P",
    strikePrice: "",
    price: "",
    quantity: "1",
    fee: "0",
    notes: "",
  });
  const [stockTradeForm, setStockTradeForm] = useState({
    tradeDate: todayTW(),
    action: "BUY" as "BUY" | "SELL",
    symbol: "",
    price: "",
    quantity: "",
    fee: "0",
    notes: "",
  });

  // Edit states for trades/loans/targets
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editTradeForm, setEditTradeForm] = useState({
    date: "", action: "BUY" as "BUY" | "SELL",
    price: "", qty: "", fee: "",
    symbol: "", contractMonth: "", callPut: "C" as "C" | "P", strikePrice: "",
  });
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [editLoanForm, setEditLoanForm] = useState({ name: "", principal: "", annualRate: "", periods: "", startDate: "", loanType: "annuity" as "annuity" | "interest_only", notes: "" });
  const [editingTargetId, setEditingTargetId] = useState<number | null>(null);
  const [editTargetForm, setEditTargetForm] = useState({ action: "SELL" as "BUY" | "SELL", callPut: "P" as "C" | "P", targetDelta: "", contractMonth: "", quantity: "1" });
  // Loan payment states
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ paymentDate: "", amount: "", principal: "", interest: "", notes: "" });
  const [addingPaymentLoanId, setAddingPaymentLoanId] = useState<number | null>(null);
  const [addPaymentForm, setAddPaymentForm] = useState({ paymentDate: todayTW(), amount: "", notes: "" });
  const [showLoanSettings, setShowLoanSettings] = useState<number | null>(null); // loanId
  const [addingRateEventLoanId, setAddingRateEventLoanId] = useState<number | null>(null);
  const [rateEventForm, setRateEventForm] = useState({ effectiveDate: todayTW(), newRate: "", notes: "" });
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Cash Events state
  const [cashEventsList, setCashEventsList] = useState<CashEvent[]>([]);
  const [cashEventForm, setCashEventForm] = useState<{ tradeDate: string; action: CashAction; amount: string; notes: string }>({
    tradeDate: todayTW(),
    action: "SALARY",
    amount: "",
    notes: "",
  });
  const [deletingCashEventId, setDeletingCashEventId] = useState<number | null>(null);

  const simId = sim.id;

  useEffect(() => {
    setSim(initialData);
  }, [initialData]);

  useEffect(() => {
    setInitLoading(true);
    Promise.all([
      getSymbolMetas().then(setSymbolMetas),
      getOptionsTrades(simId).then(setOptionsTrades),
      getStockTrades(simId).then(setStockTradesList),
      getLoans(simId).then(async (list) => {
        setLoansList(list);
        // 同時載入每筆貸款的還款紀錄 + 利率事件
        const [pmtEntries, rateEntries] = await Promise.all([
          Promise.all(list.map(l => getLoanPayments(l.id).then(p => [l.id, p] as [number, LoanPayment[]]))),
          Promise.all(list.map(l => getLoanRateEvents(l.id).then(r => [l.id, r] as [number, LoanRateEvent[]]))),
        ]);
        setLoanPaymentsMap(Object.fromEntries(pmtEntries));
        setLoanRateEventsMap(Object.fromEntries(rateEntries));
      }),
      getOptionsTargetMatches(simId).then(setOptionsTargetMatches),
      getCashEvents(simId).then(setCashEventsList),
      getOptionsPriceMap("TXO").then(setDailyPriceMap),
      getStrategies(simId).then(async (list) => {
        if (list.length === 0) {
          const s = await addStrategy(simId, { name: "預設策略" });
          list = [s];
        }
        setStrategyList(list);
        if (list.length > 0 && !activeStrategyId) setActiveStrategyId(list[0].id);
      }),
      fetchMarketIndex().then((res) => {
        if ("index" in res) {
          setBaseIndex(res.index);
          setSimIndex(res.index);
        }
      }),
    ]).catch(() => {}).finally(() => setInitLoading(false));
  }, [simId]);

  const loadOptionsStats = () => {
    getOptionsApiStats().then(({ calls, cooldownUntil }) => {
      const todayStr = todayTW(); // YYYYMMDD in UTC+8
      const todayCalls = calls.filter((c) => {
        if (!c.createdAt) return false;
        // 將 createdAt (UTC) 轉為 UTC+8 再取日期比較
        const twDate = new Date(new Date(c.createdAt).getTime() + 8 * 3600_000);
        return twDate.toISOString().slice(0, 10).replace(/-/g, "") === todayStr;
      });
      setOptionsCallSuccess(todayCalls.filter((c) => c.success).length);
      setOptionsCallFail(todayCalls.filter((c) => !c.success).length);
      const last = calls.find((c) => c.createdAt);
      setOptionsLastCall(last?.createdAt ? new Date(last.createdAt) : null);
      if (cooldownUntil) {
        setOptionsCooldownUntil(new Date(cooldownUntil));
      } else {
        setOptionsCooldownUntil(null);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    if (activeTab === "settings") {
      getApiStats().then(setApiStats).catch(() => {});
      getSourceConfigs().then(setSourceConfigs).catch(() => {});
      getAppSettings().then(s => { if (s.dailyRefreshTime) setDailyRefreshTime(s.dailyRefreshTime); }).catch(() => {});
    }
    if (activeTab === "database") {
      setDbLoading(true);
      Promise.all([
        getApiCacheEntries().then(setDbPriceCache),
        getApiUsageEntries().then(setDbApiUsage),
        getOptionsDeltaCacheEntries().then(setDbDeltaCache),
      ]).catch(() => {}).finally(() => setDbLoading(false));
    }
    if (activeTab === "account") {
      getOptionsTargetMatches(sim.id).then(setOptionsTargetMatches).catch(() => {});
    }
    if (activeTab === "trades") {
      getCashEvents(simId).then(setCashEventsList).catch(() => {});
    }
    if (activeTab === "trades" || activeTab === "account") {
      loadOptionsStats();
      getOptionsPriceMap("TXO").then(setDailyPriceMap).catch(() => {});
      getAvailableOptionsDates("TXO").then((dates) => {
        setOptionsDates(dates);
        if (dates.length > 0) {
          const latestDate = optionsDate || dates[0];
          setOptionsDate(latestDate);
          getOptionsDeltaRows("TXO", latestDate).then(setOptionsRows).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (!optionsCooldownUntil) { setCooldownRemain(0); return; }
    const update = () => {
      const diff = optionsCooldownUntil.getTime() - Date.now();
      if (diff <= 0) {
        setCooldownRemain(0);
        setOptionsCooldownUntil(null);
      } else {
        setCooldownRemain(Math.ceil(diff / 60000));
      }
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [optionsCooldownUntil]);

  const handleRefreshAll = async () => {
    const positions = computePositions(stockTradesList as import("@/shared/types").StockTrade[], symbolMetas);
    if (positions.length === 0) return;
    setIsRefreshingAll(true);
    let ok = 0;
    for (const pos of positions) {
      try {
        const { symbolMeta } = await fetchSymbolPrice(pos.symbol);
        setSymbolMetas(prev => {
          const exists = prev.find(m => m.symbol === symbolMeta.symbol);
          return exists ? prev.map(m => m.symbol === symbolMeta.symbol ? symbolMeta : m) : [...prev, symbolMeta];
        });
        ok++;
      } catch {}
    }
    setIsRefreshingAll(false);
    toast.success(`已更新 ${ok}/${positions.length} 檔股價`);
  };

  // Computed portfolio values (using shared functions)
  const activeStrategy = strategyList.find(s => s.id === activeStrategyId) ?? null;
  const leverageLimitRatio = activeStrategy?.leverageLimit ?? 1.5;
  const leverageCap = activeStrategy?.leverageCap ?? null;
  const exposureTarget = activeStrategy?.exposureTarget ?? 1.0;

  const positions = useMemo(
    () => computePositions(stockTradesList as import("@/shared/types").StockTrade[], symbolMetas),
    [stockTradesList, symbolMetas]
  );

  const allLoanPayments = useMemo(
    () => Object.values(loanPaymentsMap).flat(),
    [loanPaymentsMap]
  );

  const loanTotalPaidMap = useMemo(
    () => Object.fromEntries(loansList.map(loan => [loan.id, (loanPaymentsMap[loan.id] ?? []).reduce((s, p) => s + p.amount, 0)])),
    [loansList, loanPaymentsMap]
  );

  const cash = useMemo(
    () => computeExplainedCashFlow(
      stockTradesList as import("@/shared/types").StockTrade[],
      optionsTrades as import("@/shared/types").OptionsTrade[],
      loansList as import("@/shared/types").Loan[],
      allLoanPayments as import("@/shared/types").LoanPayment[],
      cashEventsList as import("@/shared/types").CashEvent[],
    ),
    [stockTradesList, optionsTrades, loansList, allLoanPayments, cashEventsList]
  );

  const metrics = computePortfolioMetrics(positions, cash, marketAdjust, true);
  const { totalCost, totalCurrentValue, totalAdjustedStockValue } = metrics;

  const optionsTradesTyped = useMemo(
    () => optionsTrades as import("@/shared/types").OptionsTrade[],
    [optionsTrades]
  );
  const optHoldings = useMemo(() => computeHoldings(optionsTradesTyped), [optionsTradesTyped]);

  const doubleEntrySnapshot = useMemo(
    () => computeDoubleEntrySnapshot({
      cash,
      positions,
      loans: loansList as import("@/shared/types").Loan[],
      loanPaymentsMap,
      stockTrades: stockTradesList as import("@/shared/types").StockTrade[],
      optionsTrades: optionsTradesTyped,
      cashEvents: cashEventsList as import("@/shared/types").CashEvent[],
    }),
    [cash, positions, loansList, loanPaymentsMap, stockTradesList, optionsTradesTyped, cashEventsList]
  );
  const incomeVirtuals = useMemo(
    () => doubleEntrySnapshot.accounts.filter(a => a.kind === "virtual_income"),
    [doubleEntrySnapshot]
  );
  const expenseVirtuals = useMemo(
    () => doubleEntrySnapshot.accounts.filter(a => a.kind === "virtual_expense"),
    [doubleEntrySnapshot]
  );
  // ── 統一帳戶明細：從所有資料來源拉相關交易 ─────────────────────────
  type AItem = { key: string; date: string; desc: string; amount: number };
  const getAccountItems = (acctId: string): AItem[] => {
    const items: AItem[] = [];
    const virtualAction = acctId.startsWith("virtual:") ? acctId.replace("virtual:", "") as CashAction : null;
    if (virtualAction === "OPTIONS_PREMIUM") {
      optionsTrades.filter(t => t.action === "SELL").forEach(t => {
        const net = t.price * t.quantity * TXO_MULTIPLIER - t.fee;
        items.push({ key: `opt-${t.id}`, date: t.tradeDate, desc: `${t.contractMonth} ${t.callPut === "C" ? "Call" : "Put"} ${t.strikePrice.toLocaleString()} ×${t.quantity.toLocaleString()}`, amount: net });
      });
    } else if (virtualAction === "OPTIONS_BUY") {
      optionsTrades.filter(t => t.action === "BUY").forEach(t => {
        const cost = t.price * t.quantity * TXO_MULTIPLIER + t.fee;
        items.push({ key: `opt-${t.id}`, date: t.tradeDate, desc: `${t.contractMonth} ${t.callPut === "C" ? "Call" : "Put"} ${t.strikePrice.toLocaleString()} ×${t.quantity.toLocaleString()}`, amount: -cost });
      });
    }
    if (virtualAction === "MARKET_GAIN" || virtualAction === "MARKET_LOSS") {
      positions.forEach(pos => {
        const pnl = (pos.currentPrice - pos.costBasis) * pos.shares;
        if ((virtualAction === "MARKET_GAIN" && pnl >= 1) || (virtualAction === "MARKET_LOSS" && pnl <= -1)) {
          const dateStr = pos.priceUpdatedAt ? pos.priceUpdatedAt.replace(/-/g, "").slice(0, 8) : todayTW();
          items.push({ key: `mv-${pos.symbol}`, date: dateStr, desc: `${pos.symbol} ${pos.shares.toLocaleString()} 股（成本 $${pos.costBasis.toLocaleString()} → 現價 $${pos.currentPrice.toLocaleString()}）`, amount: pnl });
        }
      });
    }
    if ((virtualAction as string) === "CAPITAL_GAIN" || (virtualAction as string) === "CAPITAL_LOSS") {
      // 逐標的計算已實現損益：賣出收入 - 買入成本 + 剩餘庫存成本
      const symBuyCosts = new Map<string, number>();
      const symSellProceeds = new Map<string, { amount: number; lastDate: string }>();
      for (const t of stockTradesList) {
        if (t.action === "BUY") {
          symBuyCosts.set(t.symbol, (symBuyCosts.get(t.symbol) ?? 0) + t.price * t.quantity + t.fee);
        } else {
          const prev = symSellProceeds.get(t.symbol);
          symSellProceeds.set(t.symbol, { amount: (prev?.amount ?? 0) + t.price * t.quantity - t.fee, lastDate: t.tradeDate });
        }
      }
      for (const [sym, { amount: sellProceeds, lastDate }] of symSellProceeds.entries()) {
        const buyCost = symBuyCosts.get(sym) ?? 0;
        const pos = positions.find(p => p.symbol === sym);
        const remainingCost = pos ? pos.shares * pos.costBasis : 0;
        const realized = sellProceeds - buyCost + remainingCost;
        if (((virtualAction as string) === "CAPITAL_GAIN" && realized >= 1) || ((virtualAction as string) === "CAPITAL_LOSS" && realized <= -1)) {
          items.push({ key: `cap-${sym}`, date: lastDate, desc: sym, amount: realized });
        }
      }
    }
    if (virtualAction === "INTEREST_OUT") {
      allLoanPayments.filter(p => (p.interestPortion ?? 0) > 0).forEach(p => {
        const loan = loansList.find(l => l.id === p.loanId);
        items.push({ key: `lp-${p.id}`, date: p.paymentDate, desc: loan ? loan.name : `貸款 #${p.loanId}`, amount: -(p.interestPortion ?? 0) });
      });
    }
    if (virtualAction && virtualAction in CASH_ACTIONS) {
      cashEventsList.filter(e => e.action === virtualAction).forEach(ev => {
        const dir = CASH_ACTIONS[virtualAction as keyof typeof CASH_ACTIONS].direction;
        items.push({ key: `ev-${ev.id}`, date: ev.tradeDate, desc: ev.notes ?? "", amount: dir === "in" ? ev.amount : -ev.amount });
      });
    }
    if (acctId.startsWith("real:stock:")) {
      const sym = acctId.replace("real:stock:", "");
      stockTradesList.filter(t => t.symbol === sym).forEach(t => {
        const amt = t.action === "SELL" ? t.price * t.quantity - t.fee : -(t.price * t.quantity + t.fee);
        items.push({ key: `stk-${t.id}`, date: t.tradeDate, desc: `${t.action === "SELL" ? "賣出" : "買入"} ${t.quantity.toLocaleString()} 股 @$${t.price.toLocaleString()}`, amount: amt });
      });
    }
    if (acctId.startsWith("real:loan:")) {
      const loanId = parseInt(acctId.replace("real:loan:", ""));
      const loan = loansList.find(l => l.id === loanId);
      if (loan) items.push({ key: `loan-in`, date: loan.startDate, desc: "貸款入帳", amount: loan.principal });
      (loanPaymentsMap[loanId] ?? []).forEach(p => {
        items.push({ key: `lp-${p.id}`, date: p.paymentDate, desc: p.notes ?? "還款", amount: -p.amount });
      });
    }
    if (acctId === "real:cash" || acctId === "cash") {
      stockTradesList.forEach(t => {
        const amt = t.action === "SELL" ? t.price * t.quantity - t.fee : -(t.price * t.quantity + t.fee);
        items.push({ key: `stk-${t.id}`, date: t.tradeDate, desc: `${t.symbol} ${t.action === "SELL" ? "賣出" : "買入"}`, amount: amt });
      });
      optionsTrades.forEach(t => {
        const amt = t.action === "SELL" ? t.price * t.quantity * TXO_MULTIPLIER - t.fee : -(t.price * t.quantity * TXO_MULTIPLIER + t.fee);
        items.push({ key: `opt-${t.id}`, date: t.tradeDate, desc: `${t.contractMonth} ${t.callPut === "C" ? "Call" : "Put"} ${t.strikePrice.toLocaleString()}`, amount: amt });
      });
      allLoanPayments.forEach(p => {
        items.push({ key: `lp-${p.id}`, date: p.paymentDate, desc: loansList.find(l => l.id === p.loanId)?.name ?? "還款", amount: -p.amount });
      });
      loansList.forEach(l => {
        items.push({ key: `loan-in-${l.id}`, date: l.startDate, desc: `${l.name} 貸款入帳`, amount: l.principal });
      });
      cashEventsList.forEach(ev => {
        const dir = ev.action in CASH_ACTIONS ? CASH_ACTIONS[ev.action as keyof typeof CASH_ACTIONS].direction : "in";
        items.push({ key: `ev-${ev.id}`, date: ev.tradeDate, desc: `${cashActionLabel(ev.action as CashAction)}${ev.notes ? ` · ${ev.notes}` : ""}`, amount: dir === "in" ? ev.amount : -ev.amount });
      });
    }
    return items.sort((a, b) => b.date.localeCompare(a.date));
  };

  // Pre-compute item counts for virtual account cards (avoids calling getAccountItems per-card in render)
  const virtualItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const va of [...incomeVirtuals, ...expenseVirtuals]) {
      counts[va.id] = getAccountItems(va.id).length;
    }
    return counts;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomeVirtuals, expenseVirtuals, optionsTrades, stockTradesList, allLoanPayments, loansList, cashEventsList, loanPaymentsMap]);
  const optHoldingMonths = useMemo(
    () => [...new Set(optHoldings.map(h => h.contractMonth).filter(Boolean))].sort() as string[],
    [optHoldings]
  );
  const unifiedAccounts = useMemo(
    () => buildUnifiedAccounts({
      positions,
      optionsTargetMatches: optionsTargetMatches as OptionsTargetMatch[],
      optionsHoldings: optHoldings,
      loans: loansList as import("@/shared/types").Loan[],
      loanPaymentsMap,
      stockTrades: stockTradesList as import("@/shared/types").StockTrade[],
      optionsTrades: optionsTradesTyped,
    }),
    [positions, optionsTargetMatches, optHoldings, loansList, loanPaymentsMap, stockTradesList, optionsTradesTyped]
  );

  // 選擇權模擬損益：基於大盤指數變動的內含價值變化
  const optionsSimDelta = (() => {
    if (indexDelta === 0) return 0;
    return optHoldings.reduce((s, oh) => {
      const intrinsicNow = oh.callPut === "P"
        ? Math.max(oh.strikePrice - baseIndex, 0)
        : Math.max(baseIndex - oh.strikePrice, 0);
      const intrinsicSim = oh.callPut === "P"
        ? Math.max(oh.strikePrice - simIndex, 0)
        : Math.max(simIndex - oh.strikePrice, 0);
      return s + (intrinsicSim - intrinsicNow) * oh.netQuantity * TXO_MULTIPLIER;
    }, 0);
  })();

  const totalAdjustedValue = metrics.totalAdjustedValue + optionsSimDelta;
  const totalPnL = totalAdjustedValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const lev = computeLeverage(totalAdjustedStockValue, totalAdjustedValue, totalCurrentValue, leverageLimitRatio, leverageCap);
  const { portfolioLeverage, leveragePercent, isOverLeverage, isInfiniteOrNegative, effectiveLeverageLimit: leverageLimit } = lev;

  const exposure = computeExposure(positions, totalAdjustedValue, totalAdjustedStockValue, totalCurrentValue, marketAdjust, exposureTarget, leverageLimit);
  const { betaWeightedExposure, isBetaOverLimit, betaGapValue } = exposure;

  const rebalance = computeRebalancing({
    ...exposure,
    totalAdjustedValue,
    totalAdjustedStockValue,
    leverageLimit,
  });
  const { buyAmount, sellAmount, swapAmount, isMixedMode, isLeverageCapped, isOnTarget, projectedBetaExposure } = rebalance;

  const holdingRecommendations = computeHoldingRecommendations(positions, marketAdjust, rebalance, exposure);

  // ── Pending notifications（系統待確認事件）────────────────────
  // 計算每筆貸款「已到期但尚未記錄」的還款期數（不依賴 dismissedNotifIds）
  const allOverdueNotifs = useMemo((): PendingNotif[] => {
    const today = todayTW();
    const result: PendingNotif[] = [];
    for (const loan of loansList) {
      const schedule = generateLoanSchedule(loan as import("@/shared/types").Loan, loanRateEventsMap[loan.id] ?? [], loanPaymentsMap[loan.id] ?? []);
      const recorded = loanPaymentsMap[loan.id]?.length ?? 0;
      const unrecorded = schedule.filter(s => s.paymentDate <= today).slice(recorded);
      for (const inst of unrecorded) {
        result.push({
          id: `pending-loan-${loan.id}-${inst.period}`,
          loanId: loan.id,
          loanName: loan.name,
          loanType: (loan.loanType ?? "annuity") as "annuity" | "interest_only",
          period: inst.period,
          paymentDate: inst.paymentDate,
          totalPayment: inst.totalPayment,
          principalPortion: inst.principalPortion,
          interestPortion: inst.interestPortion,
        });
      }
    }
    return result;
  }, [loansList, loanPaymentsMap]);

  const pendingNotifications = useMemo(
    () => allOverdueNotifs.filter(n => !dismissedNotifIds.has(n.id)),
    [allOverdueNotifs, dismissedNotifIds]
  );

  const handleSaveStrategy = async (id: number, data: { leverageLimit?: number; leverageCap?: number | null; exposureTarget?: number }) => {
    setSavingStrategy(id);
    try {
      const updated = await updateStrategy(id, data);
      setStrategyList(prev => prev.map(s => s.id === id ? updated : s));
      toast.success("策略已更新");
    } catch { toast.error("儲存失敗"); }
    finally { setSavingStrategy(null); }
  };

  // Search helpers
  const handleSearchChange = (val: string) => {
    const upper = val.toUpperCase();
    setSearchQuery(upper);
    setSuggestions([]);
    if (searchTimer) clearTimeout(searchTimer);
    if (upper.length < 1) { setIsSearching(false); return; }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(upper)}`);
        const results = await res.json();
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    setSearchTimer(t);
  };

  const openSearch = () => {
    setSearchQuery(""); setSuggestions([]); setIsSearching(false);
    setShowSearch(true);
  };

  const closeSearch = () => { setShowSearch(false); setSearchQuery(""); setSuggestions([]); };

  const openTradesAddForm = (type: "stock" | "options" | "loan" | "cash", preDate?: string, preSymbol?: string) => {
    setAddFormType(type);
    const date = preDate ?? calendarSelectedDate ?? todayTW();
    if (type === "stock") {
      setStockTradeForm(f => ({ ...f, tradeDate: date, symbol: preSymbol ?? f.symbol }));
    } else if (type === "options") {
      setTradeForm(f => ({ ...f, tradeDate: date }));
    } else if (type === "loan") {
      setLoanForm(f => ({ ...f, startDate: date }));
    } else {
      setCashEventForm(f => ({ ...f, tradeDate: date }));
    }
    setShowTradesPageForm(true);
  };

  const handleAddStock = (s: { symbol: string; name: string }) => {
    closeSearch();
    setActiveTab("trades");
    openTradesAddForm("stock", calendarSelectedDate ?? todayTW(), s.symbol);
  };

  const startInlineBetaEdit = (symbol: string, currentBeta: number) => {
    setInlineBetaSymbol(symbol);
    setInlineBeta(String(currentBeta));
  };

  const commitInlineBetaEdit = async (symbol: string) => {
    const beta = parseFloat(inlineBeta);
    if (!isNaN(beta)) {
      try {
        const updated = await upsertSymbolMeta(symbol, { beta });
        setSymbolMetas(prev => {
          const exists = prev.find(m => m.symbol === symbol);
          return exists ? prev.map(m => m.symbol === symbol ? updated : m) : [...prev, updated];
        });
      } catch { toast.error("Beta 更新失敗"); }
    }
    setInlineBetaSymbol(null);
  };

  const handleFetchSymbolPrice = async (symbol: string) => {
    setFetchingId(-1);
    try {
      const { symbolMeta, fromCache } = await fetchSymbolPrice(symbol);
      setSymbolMetas(prev => {
        const exists = prev.find(m => m.symbol === symbolMeta.symbol);
        return exists ? prev.map(m => m.symbol === symbolMeta.symbol ? symbolMeta : m) : [...prev, symbolMeta];
      });
      toast.success(fromCache ? `${symbol} 使用快取價格` : `${symbol} 股價已更新`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撈取失敗");
    } finally {
      setFetchingId(null);
    }
  };

  const handleSaveKey = async (sourceId: string) => {
    const key = keyDraft[sourceId]?.trim() ?? "";
    setSavingKey(sourceId);
    try {
      const updated = await upsertSourceConfig(sourceId, key || null);
      setSourceConfigs(prev => {
        const exists = prev.find(c => c.sourceId === sourceId);
        return exists ? prev.map(c => c.sourceId === sourceId ? updated : c) : [...prev, updated];
      });
      toast.success("已儲存");
    } catch {
      toast.error("儲存失敗");
    } finally {
      setSavingKey(null);
    }
  };

  const handleSetDefault = async (sourceId: ProviderId) => {
    const def = PROVIDER_DEFS.find(p => p.id === sourceId)!;
    if (def.requiresKey) {
      const cfg = sourceConfigs.find(c => c.sourceId === sourceId);
      if (!cfg?.apiKey) { toast.error(`請先設定 ${def.label} 的 API Key`); return; }
    }
    try {
      await setDefaultSource(sourceId);
      setSourceConfigs(prev => prev.map(c => ({ ...c, isDefault: c.sourceId === sourceId })));
      if (sourceId === "twse" && !sourceConfigs.find(c => c.sourceId === "twse")) {
        await upsertSourceConfig("twse", null);
      }
      toast.success(`已切換為 ${def.label}`);
    } catch {
      toast.error("切換失敗");
    }
  };

  const defaultSourceId = sourceConfigs.find(c => c.isDefault)?.sourceId ?? "twse";

  const handleFetchOptions = async () => {
    setOptionsFetching(true);
    try {
      const result = await fetchAndCacheOptionsDelta("TXO");
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`已載入 ${result.date} 共 ${result.count} 筆選擇權資料`);
        const dates = await getAvailableOptionsDates("TXO");
        setOptionsDates(dates);
        setOptionsDate(result.date);
        const rows = await getOptionsDeltaRows("TXO", result.date);
        setOptionsRows(rows);
      }
      loadOptionsStats();
    } catch {
      toast.error("取得選擇權資料失敗");
    } finally {
      setOptionsFetching(false);
    }
  };

  const handleOptionsDateChange = async (date: string) => {
    setOptionsDate(date);
    try {
      const rows = await getOptionsDeltaRows("TXO", date);
      setOptionsRows(rows);
    } catch {
      toast.error("載入資料失敗");
    }
  };

  const availableContractMonths = [...new Set(optionsRows.map(r => r.contractMonth).filter(Boolean))] as string[];

  const filteredOptionsRows = optionsRows.filter((row) => {
    if (optionsFilter.callPut !== "ALL" && row.callPut !== optionsFilter.callPut) return false;
    if (optionsFilter.contractMonth !== "ALL" && row.contractMonth !== optionsFilter.contractMonth) return false;
    const dMin = optionsFilter.deltaMin !== "" ? parseFloat(optionsFilter.deltaMin) : null;
    const dMax = optionsFilter.deltaMax !== "" ? parseFloat(optionsFilter.deltaMax) : null;
    if (dMin !== null && (row.delta ?? 0) < dMin) return false;
    if (dMax !== null && (row.delta ?? 0) > dMax) return false;
    const spMin = optionsFilter.strikePriceMin !== "" ? parseFloat(optionsFilter.strikePriceMin) : null;
    const spMax = optionsFilter.strikePriceMax !== "" ? parseFloat(optionsFilter.strikePriceMax) : null;
    if (spMin !== null && row.strikePrice < spMin) return false;
    if (spMax !== null && row.strikePrice > spMax) return false;
    return true;
  });

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await deleteAllTrades(simId);
      await deleteSimulation(simId);
      const newSim = await createSimulation();
      setSim(newSim);
      setSymbolMetas([]);
      setStockTradesList([]);
      setOptionsTrades([]);
      setLoansList([]);
      setLoanPaymentsMap({});
      setOptionsTargetMatches([]);
      onSimChange?.(newSim);
      toast.success("已還原原廠設定");
    } catch {
      toast.error("重設失敗");
    } finally {
      setIsResetting(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "account", label: "帳戶", icon: <Home className="w-5 h-5" /> },
    { id: "trades", label: "明細", icon: <History className="w-5 h-5" /> },
    { id: "feedback", label: "績效", icon: <BarChart2 className="w-5 h-5" /> },
    { id: "overview", label: "模擬器", icon: <Wallet className="w-5 h-5" /> },
  ];

  const MORE_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "cashflow", label: "收支分析", icon: <DollarSign className="w-5 h-5" /> },
    { id: "strategy", label: "策略", icon: <Crosshair className="w-5 h-5" /> },
    { id: "database", label: "資料庫", icon: <Database className="w-5 h-5" /> },
    { id: "backup", label: "備份", icon: <HardDrive className="w-5 h-5" /> },
    { id: "sync", label: "同步", icon: <GitBranch className="w-5 h-5" /> },
    { id: "settings", label: "設定", icon: <Settings2 className="w-5 h-5" /> },
  ];

  if (initLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">初始化中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative">

      {/* ── 刪除確認彈窗 ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center max-w-md mx-auto">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-background rounded-t-3xl w-full px-5 pt-6 pb-10 space-y-3">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            <p className="text-base font-semibold text-center">{deleteConfirm.label}</p>
            <p className="text-sm text-muted-foreground text-center">此操作無法復原</p>
            <button
              onClick={async () => { try { await deleteConfirm.onConfirm(); } finally { setDeleteConfirm(null); } }}
              className="w-full py-3 rounded-2xl bg-destructive text-white font-semibold text-sm mt-2"
            >
              確認刪除
            </button>
            <button
              onClick={() => setDeleteConfirm(null)}
              className="w-full py-3 rounded-2xl bg-secondary text-foreground font-medium text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* ── 餘額調整彈窗 ── */}
      {balanceAdjust && (() => {
        const target = Number(balanceAdjustInput);
        const diff = target - balanceAdjust.currentBalance;
        const valid = balanceAdjustInput !== "" && !isNaN(target) && Math.abs(diff) >= 1;
        return (
          <div className="fixed inset-0 z-[200] flex items-end justify-center max-w-md mx-auto">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setBalanceAdjust(null); setBalanceAdjustInput(""); }} />
            <div className="relative bg-background rounded-t-3xl w-full px-5 pt-6 pb-10 space-y-4">
              <div className="w-10 h-1 bg-border rounded-full mx-auto" />
              <p className="text-base font-semibold text-center">{balanceAdjust.label}</p>
              <div className="bg-secondary rounded-2xl px-4 py-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">目前餘額</span>
                  <span className="font-mono font-semibold">${balanceAdjust.currentBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                {valid && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">調整金額</span>
                    <span className={`font-mono font-semibold ${diff > 0 ? "text-success" : "text-destructive"}`}>
                      {diff > 0 ? "+" : "−"}${Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">輸入目標餘額</label>
                <input
                  type="number"
                  value={balanceAdjustInput}
                  onChange={e => setBalanceAdjustInput(e.target.value)}
                  placeholder={String(Math.round(balanceAdjust.currentBalance))}
                  autoFocus
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-lg font-mono font-semibold border-0 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                disabled={!valid}
                onClick={async () => {
                  if (!valid) return;
                  await balanceAdjust.onConfirm(target);
                  setBalanceAdjust(null);
                  setBalanceAdjustInput("");
                }}
                className={`w-full py-3 rounded-2xl font-semibold text-sm transition-colors ${valid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {valid ? `確認調整（${diff > 0 ? "+" : "−"}$${Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 })}）` : "請輸入目標餘額"}
              </button>
              <button onClick={() => { setBalanceAdjust(null); setBalanceAdjustInput(""); }}
                className="w-full py-3 rounded-2xl bg-secondary text-foreground font-medium text-sm">
                取消
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── 帳戶詳情全版頁面 overlay（任何 tab 均可觸發） ── */}
      {accountDetailId && (() => {
        const vaAcct = doubleEntrySnapshot.accounts.find(a => a.id === accountDetailId);
        const unifiedAcct = !vaAcct ? unifiedAccounts.find(a => a.id === accountDetailId) : null;
        const items = getAccountItems(accountDetailId);
        const label = vaAcct?.label ?? unifiedAcct?.label ?? accountDetailId;
        const balance = vaAcct?.balance ?? unifiedAcct?.value ?? 0;
        const isIncome = vaAcct?.kind === "virtual_income";
        const isExpense = vaAcct?.kind === "virtual_expense";
        const amtColor = isIncome ? "text-success" : isExpense ? "text-destructive" : balance >= 0 ? "text-foreground" : "text-destructive";
        const amtPrefix = isIncome ? "+" : isExpense ? "-" : balance < 0 ? "-" : "";
        const closeOverlay = () => { setAccountDetailId(null); setAccountTradeForm(null); setEditingTargetId(null); setEditingLoanId(null); };

        const itemsList = items.length > 0 && (
          <Card className="overflow-hidden p-0">
            {items.map((item, idx) => (
              <div key={item.key} className={`flex items-center px-4 py-3 ${idx < items.length - 1 ? "border-b border-border/60" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground font-mono">{formatTradeDate(item.date)}</p>
                  {item.desc && <p className="text-[13px] font-medium truncate mt-0.5">{item.desc}</p>}
                </div>
                <span className={`text-[15px] font-mono font-semibold shrink-0 ml-3 ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
                  {item.amount >= 0 ? "+" : "-"}${Math.abs(item.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </Card>
        );

        return (
          <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-md mx-auto">
            <div className="flex items-center gap-3 px-4 py-4 border-b border-border/60 shrink-0">
              <button onClick={closeOverlay} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">{items.length > 0 ? `${items.length} 筆明細` : "自動計算"}</p>
              </div>
              <span className={`text-base font-mono font-bold ${amtColor}`}>
                {amtPrefix}${Math.abs(balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

              {/* Virtual account: simple list */}
              {vaAcct && (items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <p className="text-sm text-muted-foreground">此金額由系統自動計算</p>
                  <p className="text-xs text-muted-foreground">無法追溯至個別交易明細</p>
                </div>
              ) : itemsList)}

              {/* ── Cash account ── */}
              {unifiedAcct?.type === "cash" && (() => {
                const pts = computeCashTimeSeries(
                  stockTradesList as import("@/shared/types").StockTrade[],
                  optionsTradesTyped,
                  loansList as import("@/shared/types").Loan[],
                  allLoanPayments as import("@/shared/types").LoanPayment[],
                  cashEventsList as import("@/shared/types").CashEvent[],
                );
                return (
                  <>
                    <p className="text-xs text-muted-foreground">現金餘額由交易事件自動推算，如需調整請至「總覽」頁修改初始現金。</p>
                    {pts.length >= 2 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">現金餘額走勢</p>
                        <MiniLineChart data={pts} gradientId="cash-chart-grad" />
                      </div>
                    )}
                    {itemsList}
                  </>
                );
              })()}

              {/* ── Stock account ── */}
              {unifiedAcct?.type === "stock" && (() => {
                const pos: Position = unifiedAcct.data.position;
                const trades: import("@/shared/types").StockTrade[] = unifiedAcct.data.trades ?? [];
                const isEditingBeta = inlineBetaSymbol === pos.symbol;
                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">股數（由交易計算）</p>
                        <p className="font-mono font-semibold mt-0.5">{pos.shares.toLocaleString()} 股</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Beta</p>
                        {isEditingBeta ? (
                          <input type="number" step="0.01" value={inlineBeta}
                            onChange={e => setInlineBeta(e.target.value)}
                            onBlur={() => commitInlineBetaEdit(pos.symbol)}
                            onKeyDown={e => { if (e.key === "Enter") commitInlineBetaEdit(pos.symbol); if (e.key === "Escape") setInlineBetaSymbol(null); }}
                            autoFocus className="font-mono font-semibold mt-0.5 bg-muted border border-blue-400/40 rounded-lg px-2 py-0.5 w-16 text-xs outline-none" />
                        ) : (
                          <button onClick={() => startInlineBetaEdit(pos.symbol, pos.beta ?? 1.0)} className="font-mono font-semibold mt-0.5 hover:text-primary transition-colors flex items-center gap-1">
                            {(pos.beta ?? 1.0).toFixed(2)} <Pencil className="w-2.5 h-2.5 opacity-40" />
                          </button>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">現價</p>
                        <p className="font-mono font-semibold mt-0.5">${Number(pos.currentPrice.toFixed(2)).toLocaleString()}</p>
                      </div>
                    </div>
                    {trades.length >= 2 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">投入成本走勢</p>
                        <MiniLineChart data={computeStockTimeSeries(trades)} gradientId={`stock-grad-${pos.symbol}`} positive={true} />
                      </div>
                    )}
                    {trades.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">交易記錄</p>
                        <div className="space-y-1">
                          {trades.slice().sort((a, b) => b.tradeDate.localeCompare(a.tradeDate)).map(t => (
                            <div key={t.id} className="flex items-center justify-between text-xs bg-muted rounded-lg px-2.5 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-mono">{formatTradeDate(t.tradeDate)}</span>
                                <span className={`font-semibold ${t.action === "BUY" ? "text-success" : "text-destructive"}`}>{t.action}</span>
                              </div>
                              <span className="font-mono">{t.quantity.toLocaleString()}股 ${t.price.toLocaleString()}{t.fee > 0 ? ` 費$${t.fee.toLocaleString()}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {accountTradeForm === "stock" && (
                      <div className="bg-muted/50 rounded-xl p-3 space-y-2 border border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">新增交易</p>
                        <div className="flex gap-1 text-xs">
                          {(["BUY", "SELL"] as const).map(a => (
                            <button key={a} onClick={() => setAcctStockTradeForm(f => ({ ...f, action: a }))}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${acctStockTradeForm.action === a ? (a === "BUY" ? "bg-success/20 text-success border border-success/40" : "bg-destructive/20 text-destructive border border-destructive/40") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                              {a}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-muted-foreground">日期</label>
                            <input type="text" value={acctStockTradeForm.tradeDate} onChange={e => setAcctStockTradeForm(f => ({ ...f, tradeDate: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-muted-foreground">價格</label>
                            <input type="number" value={acctStockTradeForm.price} onChange={e => setAcctStockTradeForm(f => ({ ...f, price: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-muted-foreground">股數</label>
                            <input type="number" value={acctStockTradeForm.quantity} onChange={e => setAcctStockTradeForm(f => ({ ...f, quantity: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-muted-foreground">手續費</label>
                            <input type="number" value={acctStockTradeForm.fee} onChange={e => setAcctStockTradeForm(f => ({ ...f, fee: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const price = parseFloat(acctStockTradeForm.price);
                            const qty = parseInt(acctStockTradeForm.quantity);
                            if (!price || !qty) { toast.error("請填寫價格與股數"); return; }
                            try {
                              await addStockTrade({ simulationId: simId, tradeDate: acctStockTradeForm.tradeDate, action: acctStockTradeForm.action, symbol: pos.symbol, price, quantity: qty, fee: parseFloat(acctStockTradeForm.fee) || 0 });
                              setAccountTradeForm(null);
                              setAcctStockTradeForm(f => ({ ...f, price: "", quantity: "", fee: "0" }));
                              getStockTrades(simId).then(setStockTradesList).catch(() => {});
                              toast.success("交易已新增");
                            } catch { toast.error("新增失敗"); }
                          }}
                          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >確認新增</button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => setAccountTradeForm(accountTradeForm === "stock" ? null : "stock")}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20 hover:bg-primary/20 transition-colors">
                        <Plus className="w-3 h-3" /> 新增交易
                      </button>
                      <button onClick={() => handleFetchSymbolPrice(pos.symbol)} disabled={fetchingId === -1}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50">
                        <RefreshCcw className={`w-3 h-3 ${fetchingId === -1 ? "animate-spin" : ""}`} /> 更新價格
                      </button>
                    </div>
                  </>
                );
              })()}

              {/* ── Options account ── */}
              {unifiedAcct?.type === "options" && (() => {
                const targetMatch: typeof optionsTargetMatches[0] | null = unifiedAcct.data.targetMatch ?? null;
                const holding: OptionsHolding | null = unifiedAcct.data.holding ?? null;
                const trades: import("@/shared/types").OptionsTrade[] = unifiedAcct.data.trades ?? [];
                return (
                  <>
                    {targetMatch && targetMatch.matchedStrike != null && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-muted-foreground">履約價</p><p className="font-mono font-semibold mt-0.5">{targetMatch.matchedStrike.toLocaleString()}</p></div>
                        <div><p className="text-muted-foreground">Delta</p><p className="font-mono font-semibold mt-0.5">{targetMatch.matchedDelta?.toFixed(4)}</p></div>
                        <div><p className="text-muted-foreground">收盤</p><p className="font-mono font-semibold mt-0.5">{targetMatch.matchedPrice?.toFixed(1) ?? "-"}</p></div>
                      </div>
                    )}
                    {holding && (
                      <div className="grid grid-cols-3 gap-2 text-xs border-t border-border/50 pt-2">
                        <div><p className="text-muted-foreground">口數</p><p className={`font-mono font-semibold mt-0.5 ${holding.netQuantity > 0 ? "text-success" : "text-destructive"}`}>{holding.netQuantity > 0 ? "+" : ""}{holding.netQuantity}</p></div>
                        <div><p className="text-muted-foreground">均價</p><p className="font-mono font-semibold mt-0.5">{holding.avgCost.toFixed(1)}</p></div>
                        <div><p className="text-muted-foreground">成本</p><p className="font-mono font-semibold mt-0.5">{holding.totalCost.toLocaleString()}</p></div>
                      </div>
                    )}
                    {targetMatch?.lastMarketDate && (
                      <p className="text-[10px] text-muted-foreground">最後市場日 {targetMatch.lastMarketDate}{targetMatch.lastFetchedAt ? ` · 拉取於 ${new Date(targetMatch.lastFetchedAt).toLocaleString("zh-TW")}` : ""}</p>
                    )}
                    {trades.length >= 2 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">累積損益走勢</p>
                        <MiniLineChart data={computeOptionsTimeSeries(trades)} gradientId={`opt-grad-${accountDetailId}`} />
                      </div>
                    )}
                    {trades.length > 0 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">交易記錄</p>
                        <div className="space-y-1">
                          {trades.slice().sort((a, b) => b.tradeDate.localeCompare(a.tradeDate)).map(t => (
                            <div key={t.id} className="flex items-center justify-between text-xs bg-muted rounded-lg px-2.5 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground font-mono">{formatTradeDate(t.tradeDate)}</span>
                                <span className={`font-semibold ${t.action === "BUY" ? "text-success" : "text-destructive"}`}>{t.action}</span>
                              </div>
                              <span className="font-mono">{t.quantity.toLocaleString()}口 ${t.price.toLocaleString()}{t.fee > 0 ? ` 費$${t.fee.toLocaleString()}` : ""}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {accountTradeForm === "options" && (
                      <div className="bg-muted/50 rounded-xl p-3 space-y-2 border border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">新增交易</p>
                        <div className="flex gap-1 text-xs">
                          {(["BUY", "SELL"] as const).map(a => (
                            <button key={a} onClick={() => setAcctOptionsTradeForm(f => ({ ...f, action: a }))}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${acctOptionsTradeForm.action === a ? (a === "BUY" ? "bg-success/20 text-success border border-success/40" : "bg-destructive/20 text-destructive border border-destructive/40") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                              {a}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><label className="text-muted-foreground">日期</label>
                            <input type="text" value={acctOptionsTradeForm.tradeDate} onChange={e => setAcctOptionsTradeForm(f => ({ ...f, tradeDate: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">合約月</label>
                            <input type="text" value={acctOptionsTradeForm.contractMonth} onChange={e => setAcctOptionsTradeForm(f => ({ ...f, contractMonth: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">C/P</label>
                            <div className="flex gap-1 mt-1">
                              {(["P", "C"] as const).map(cp => (
                                <button key={cp} onClick={() => setAcctOptionsTradeForm(f => ({ ...f, callPut: cp }))}
                                  className={`flex-1 py-1 rounded-lg font-medium transition-colors ${acctOptionsTradeForm.callPut === cp ? (cp === "P" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-success/20 text-success border border-success/40") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                                  {cp === "P" ? "Put" : "Call"}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div><label className="text-muted-foreground">履約價</label>
                            <input type="number" value={acctOptionsTradeForm.strikePrice} onChange={e => setAcctOptionsTradeForm(f => ({ ...f, strikePrice: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">價格</label>
                            <input type="number" value={acctOptionsTradeForm.price} onChange={e => setAcctOptionsTradeForm(f => ({ ...f, price: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">口數</label>
                            <input type="number" value={acctOptionsTradeForm.quantity} onChange={e => setAcctOptionsTradeForm(f => ({ ...f, quantity: e.target.value }))}
                              className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                        </div>
                        <button
                          onClick={async () => {
                            const price = parseFloat(acctOptionsTradeForm.price);
                            const strike = parseFloat(acctOptionsTradeForm.strikePrice);
                            const qty = parseInt(acctOptionsTradeForm.quantity);
                            if (!price || !strike || !qty || !acctOptionsTradeForm.contractMonth) { toast.error("請填寫完整"); return; }
                            try {
                              await addOptionsTrade({ simulationId: simId, tradeDate: acctOptionsTradeForm.tradeDate, action: acctOptionsTradeForm.action, contractId: "TXO", contractMonth: acctOptionsTradeForm.contractMonth, callPut: acctOptionsTradeForm.callPut, strikePrice: strike, price, quantity: qty, fee: parseFloat(acctOptionsTradeForm.fee) || 0 });
                              setAccountTradeForm(null);
                              setAcctOptionsTradeForm(f => ({ ...f, strikePrice: "", price: "", quantity: "1", fee: "0" }));
                              getOptionsTrades(simId).then(setOptionsTrades).catch(() => {});
                              toast.success("交易已新增");
                            } catch { toast.error("新增失敗"); }
                          }}
                          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >確認新增</button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => {
                        setAccountTradeForm(accountTradeForm === "options" ? null : "options");
                        if (targetMatch) {
                          setAcctOptionsTradeForm(f => ({ ...f, contractMonth: targetMatch.matchedContractMonth ?? "", callPut: targetMatch.target.callPut as "C" | "P", strikePrice: targetMatch.matchedStrike?.toString() ?? "" }));
                        } else if (holding) {
                          setAcctOptionsTradeForm(f => ({ ...f, contractMonth: holding.contractMonth, callPut: holding.callPut as "C" | "P", strikePrice: holding.strikePrice.toString() }));
                        }
                      }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium border border-primary/20 hover:bg-primary/20 transition-colors">
                        <Plus className="w-3 h-3" /> 新增交易
                      </button>
                      {targetMatch && (
                        <button
                          onClick={() => {
                            const t = targetMatch.target;
                            if (editingTargetId === t.id) { setEditingTargetId(null); return; }
                            setEditingTargetId(t.id);
                            setEditTargetForm({ action: t.action as "BUY" | "SELL", callPut: t.callPut as "C" | "P", targetDelta: String(t.targetDelta), contractMonth: t.contractMonth ?? "", quantity: String(t.quantity) });
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${editingTargetId === targetMatch.target.id ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:bg-muted"}`}>
                          <Pencil className="w-3 h-3" /> 編輯
                        </button>
                      )}
                      {targetMatch && (
                        <button onClick={async () => {
                          await deleteOptionsTarget(targetMatch.target.id);
                          getOptionsTargetMatches(sim.id).then(setOptionsTargetMatches).catch(() => {});
                          closeOverlay();
                        }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-destructive text-xs font-medium border border-destructive/20 hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3 h-3" /> 刪除帳戶
                        </button>
                      )}
                    </div>
                    {editingTargetId === targetMatch?.target.id && (
                      <div className="w-full mt-2 bg-muted/40 rounded-xl p-3 space-y-2 border border-primary/20">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">編輯策略</p>
                        <div className="flex gap-1 text-xs">
                          {(["SELL", "BUY"] as const).map(a => (
                            <button key={a} onClick={() => setEditTargetForm(f => ({ ...f, action: a }))}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${editTargetForm.action === a ? (a === "SELL" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-success/20 text-success border border-success/40") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                              {a}
                            </button>
                          ))}
                          {(["P", "C"] as const).map(cp => (
                            <button key={cp} onClick={() => setEditTargetForm(f => ({ ...f, callPut: cp }))}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${editTargetForm.callPut === cp ? (cp === "P" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-success/20 text-success border border-success/40") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                              {cp === "P" ? "Put" : "Call"}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><label className="text-muted-foreground">目標 Delta</label>
                            <input type="number" step="0.01" value={editTargetForm.targetDelta} onChange={e => setEditTargetForm(f => ({ ...f, targetDelta: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">口數</label>
                            <input type="number" value={editTargetForm.quantity} onChange={e => setEditTargetForm(f => ({ ...f, quantity: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div className="col-span-2"><label className="text-muted-foreground">合約月份（空白=最近月）</label>
                            <input type="text" value={editTargetForm.contractMonth} onChange={e => setEditTargetForm(f => ({ ...f, contractMonth: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              const delta = parseFloat(editTargetForm.targetDelta);
                              if (isNaN(delta)) { toast.error("請填寫有效的 Delta 值"); return; }
                              try {
                                await updateOptionsTarget(targetMatch!.target.id, { action: editTargetForm.action, callPut: editTargetForm.callPut, targetDelta: delta, contractMonth: editTargetForm.contractMonth || null, quantity: parseInt(editTargetForm.quantity) || 1 });
                                setEditingTargetId(null);
                                getOptionsTargetMatches(sim.id).then(setOptionsTargetMatches).catch(() => {});
                                toast.success("策略已更新");
                              } catch { toast.error("更新失敗"); }
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                          >儲存</button>
                          <button onClick={() => setEditingTargetId(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-muted transition-colors">取消</button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* ── Loan account ── */}
              {unifiedAcct?.type === "loan" && (() => {
                const loan: Loan = unifiedAcct.data.loan;
                const monthly: number = unifiedAcct.data.monthly;
                const payments = loanPaymentsMap[loan.id] ?? [];
                const rateEvents = loanRateEventsMap[loan.id] ?? [];
                const totalPaid = loanTotalPaidMap[loan.id] ?? 0;
                const actualRemaining = computeRemainingBalance(loan as import("@/shared/types").Loan, totalPaid, undefined, rateEvents, payments as import("@/shared/types").LoanPayment[]);
                const schedule = generateLoanSchedule(loan as import("@/shared/types").Loan, rateEvents, payments as import("@/shared/types").LoanPayment[]);
                const pts = computeLoanTimeSeries(schedule);
                return (
                  <>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><p className="text-muted-foreground">剩餘本金</p><p className="font-mono font-semibold mt-0.5 text-destructive">${actualRemaining.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">原始本金</p><p className="font-mono font-semibold mt-0.5">${loan.principal.toLocaleString()}</p></div>
                      <div><p className="text-muted-foreground">利率</p><p className="font-mono font-semibold mt-0.5">{(loan.annualRate * 100).toFixed(1)}%</p></div>
                      <div><p className="text-muted-foreground">月付</p><p className="font-mono font-semibold mt-0.5">${Math.round(monthly).toLocaleString()}</p></div>
                    </div>
                    {pts.length >= 2 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">還款進度預測</p>
                        <MiniLineChart data={pts} gradientId={`loan-grad-${loan.id}`} positive={false} />
                      </div>
                    )}
                    {payments.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">還款紀錄</p>
                        {payments.map(pmt => (
                          <React.Fragment key={pmt.id}>
                            <SwipeableRow
                              isOpen={editingPaymentId === pmt.id}
                              onEdit={() => { if (editingPaymentId === pmt.id) { setEditingPaymentId(null); return; } setEditingPaymentId(pmt.id); setEditPaymentForm({ paymentDate: pmt.paymentDate, amount: String(pmt.amount), principal: String(pmt.principalPortion ?? ""), interest: String(pmt.interestPortion ?? ""), notes: pmt.notes ?? "" }); }}
                              onDelete={() => setDeleteConfirm({ label: `刪除 ${pmt.paymentDate.slice(0,4)}-${pmt.paymentDate.slice(4,6)} 還款紀錄？`, onConfirm: async () => { await deleteLoanPayment(pmt.id); setLoanPaymentsMap(prev => ({ ...prev, [loan.id]: (prev[loan.id] ?? []).filter(p => p.id !== pmt.id) })); toast.success("已刪除"); } })}
                            >
                            <div className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0 px-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-muted-foreground">{pmt.paymentDate.slice(0,4)}-{pmt.paymentDate.slice(4,6)}-{pmt.paymentDate.slice(6,8)}</span>
                                {pmt.notes && <span className="text-muted-foreground truncate max-w-[80px]">{pmt.notes}</span>}
                              </div>
                              <span className="font-mono font-medium text-green-400">-${pmt.amount.toLocaleString()}</span>
                            </div>
                            </SwipeableRow>
                            {editingPaymentId === pmt.id && (
                              <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-primary/20 mb-1">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div><label className="text-muted-foreground">日期</label>
                                    <input value={editPaymentForm.paymentDate} onChange={e => setEditPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                                  <div><label className="text-muted-foreground">本金</label>
                                    <input type="number" value={editPaymentForm.principal} onChange={e => setEditPaymentForm(f => ({ ...f, principal: e.target.value, amount: String((Number(e.target.value) || 0) + (Number(f.interest) || 0)) }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                                  <div><label className="text-muted-foreground">利息</label>
                                    <input type="number" value={editPaymentForm.interest} onChange={e => setEditPaymentForm(f => ({ ...f, interest: e.target.value, amount: String((Number(f.principal) || 0) + (Number(e.target.value) || 0)) }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                                  <div><label className="text-muted-foreground">總計</label>
                                    <input type="number" readOnly value={editPaymentForm.amount}
                                      className="w-full mt-1 bg-muted rounded-lg px-2 py-1.5 font-mono border border-border text-xs text-muted-foreground" /></div>
                                  <div className="col-span-2"><label className="text-muted-foreground">備註</label>
                                    <input value={editPaymentForm.notes} onChange={e => setEditPaymentForm(f => ({ ...f, notes: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={async () => {
                                    try {
                                      const principalPortion = editPaymentForm.principal !== "" ? Number(editPaymentForm.principal) : null;
                                      const interestPortion = editPaymentForm.interest !== "" ? Number(editPaymentForm.interest) : null;
                                      const updated = await updateLoanPayment(pmt.id, { paymentDate: editPaymentForm.paymentDate, amount: Number(editPaymentForm.amount), principalPortion, interestPortion, notes: editPaymentForm.notes || null });
                                      setLoanPaymentsMap(prev => ({ ...prev, [loan.id]: (prev[loan.id] ?? []).map(p => p.id === pmt.id ? updated : p) }));
                                      setEditingPaymentId(null);
                                      toast.success("已更新");
                                    } catch { toast.error("更新失敗"); }
                                  }} className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">儲存</button>
                                  <button onClick={() => setEditingPaymentId(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-muted transition-colors">取消</button>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                    {addingPaymentLoanId === loan.id ? (
                      <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-primary/20">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">新增還款（差額）</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><label className="text-muted-foreground">日期</label>
                            <input value={addPaymentForm.paymentDate} onChange={e => setAddPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                          <div><label className="text-muted-foreground">金額（差額）</label>
                            <input type="number" value={addPaymentForm.amount} onChange={e => setAddPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0"
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                          <div className="col-span-2"><label className="text-muted-foreground">備註</label>
                            <input value={addPaymentForm.notes} onChange={e => setAddPaymentForm(f => ({ ...f, notes: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            const amt = Number(addPaymentForm.amount);
                            if (!addPaymentForm.paymentDate || !amt) { toast.error("請填寫日期與金額"); return; }
                            try {
                              const newPmt = await addLoanPayment({ loanId: loan.id, paymentDate: addPaymentForm.paymentDate, amount: amt, notes: addPaymentForm.notes || null });
                              setLoanPaymentsMap(prev => ({ ...prev, [loan.id]: [newPmt, ...(prev[loan.id] ?? [])] }));
                              setAddingPaymentLoanId(null);
                              setAddPaymentForm({ paymentDate: todayTW(), amount: "", notes: "" });
                              toast.success("還款已記錄");
                            } catch { toast.error("新增失敗"); }
                          }} className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">確認</button>
                          <button onClick={() => setAddingPaymentLoanId(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-muted transition-colors">取消</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingPaymentLoanId(loan.id); setAddPaymentForm({ paymentDate: todayTW(), amount: "", notes: "" }); }}
                        className="w-full py-1.5 rounded-lg border border-dashed border-primary/40 text-primary text-xs font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-1">
                        <Plus className="w-3 h-3" /> 新增還款
                      </button>
                    )}
                    {/* ── 貸款設定（提前還款策略 + 利率調整）── */}
                    <Card className="overflow-hidden">
                      <button onClick={() => setShowLoanSettings(showLoanSettings === loan.id ? null : loan.id)}
                        className="w-full flex items-center px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                        <div className="w-7 h-7 rounded-[8px] bg-blue-500 flex items-center justify-center shrink-0 mr-2.5">
                          <Settings2 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="flex-1 text-left text-[13px] font-medium">貸款設定</span>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground/50 transition-transform ${showLoanSettings === loan.id ? "rotate-90" : ""}`} />
                      </button>
                      {showLoanSettings === loan.id && (
                        <div className="border-t border-border/60 px-3 py-3 space-y-4">
                          {/* 提前還款策略 */}
                          {loan.loanType !== "interest_only" && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">提前還款後的策略</p>
                              <div className="grid grid-cols-2 gap-2">
                                {(["reduce_payment", "reduce_term"] as const).map(s => (
                                  <button key={s}
                                    onClick={async () => {
                                      const updated = await updateLoan(loan.id, { prepaymentStrategy: s });
                                      setLoansList(prev => prev.map(l => l.id === loan.id ? { ...l, ...updated } : l));
                                      toast.success("已更新");
                                    }}
                                    className={`py-2 rounded-xl text-xs font-medium border transition-colors ${(loan.prepaymentStrategy ?? "reduce_payment") === s ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground border-transparent"}`}>
                                    {s === "reduce_payment" ? "月付變小" : "提早還完"}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {(loan.prepaymentStrategy ?? "reduce_payment") === "reduce_payment"
                                  ? "每次多還本金後，剩餘期數不變，下期月付自動縮小"
                                  : "維持原月付金額，餘額提早歸零即提早結束"}
                              </p>
                            </div>
                          )}
                          {/* 利率調整事件 */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">利率調整紀錄</p>
                            {rateEvents.length === 0 && (
                              <p className="text-[11px] text-muted-foreground">尚無利率調整紀錄（使用貸款原始利率 {(loan.annualRate * 100).toFixed(2)}%）</p>
                            )}
                            {rateEvents.map(re => (
                              <SwipeableRow key={re.id}
                                onDelete={() => setDeleteConfirm({ label: `刪除 ${re.effectiveDate.slice(0,4)}-${re.effectiveDate.slice(4,6)} 利率調整紀錄？`, onConfirm: async () => { await deleteLoanRateEvent(re.id); setLoanRateEventsMap(prev => ({ ...prev, [loan.id]: (prev[loan.id] ?? []).filter(r => r.id !== re.id) })); toast.success("已刪除"); } })}
                              >
                                <div className="flex items-center gap-2 py-1 border-b border-border/40 last:border-0">
                                  <span className="text-[11px] font-mono text-muted-foreground">{re.effectiveDate.slice(0,4)}-{re.effectiveDate.slice(4,6)}-{re.effectiveDate.slice(6,8)}</span>
                                  <span className="text-[12px] font-semibold font-mono">{(re.newRate * 100).toFixed(2)}%</span>
                                  {re.notes && <span className="text-[11px] text-muted-foreground">· {re.notes}</span>}
                                </div>
                              </SwipeableRow>
                            ))}
                            {addingRateEventLoanId === loan.id ? (
                              <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-primary/20">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div><label className="text-muted-foreground">生效日期</label>
                                    <input value={rateEventForm.effectiveDate} onChange={e => setRateEventForm(f => ({ ...f, effectiveDate: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                                  <div><label className="text-muted-foreground">新年利率 (%)</label>
                                    <input type="number" step="0.01" value={rateEventForm.newRate} onChange={e => setRateEventForm(f => ({ ...f, newRate: e.target.value }))} placeholder="2.50"
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                                  <div className="col-span-2"><label className="text-muted-foreground">備註</label>
                                    <input value={rateEventForm.notes} onChange={e => setRateEventForm(f => ({ ...f, notes: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs" /></div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={async () => {
                                    const rate = Number(rateEventForm.newRate);
                                    if (!rateEventForm.effectiveDate || !rate) { toast.error("請填寫日期與利率"); return; }
                                    try {
                                      const newRe = await addLoanRateEvent({ loanId: loan.id, effectiveDate: rateEventForm.effectiveDate, newRate: rate / 100, notes: rateEventForm.notes || null });
                                      setLoanRateEventsMap(prev => ({ ...prev, [loan.id]: [...(prev[loan.id] ?? []), newRe as LoanRateEvent].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)) }));
                                      setAddingRateEventLoanId(null);
                                      setRateEventForm({ effectiveDate: todayTW(), newRate: "", notes: "" });
                                      toast.success("利率調整已記錄");
                                    } catch { toast.error("新增失敗"); }
                                  }} className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">確認</button>
                                  <button onClick={() => setAddingRateEventLoanId(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium">取消</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => { setAddingRateEventLoanId(loan.id); setRateEventForm({ effectiveDate: todayTW(), newRate: "", notes: "" }); }}
                                className="w-full py-1.5 rounded-lg border border-dashed border-orange-400/50 text-orange-500 text-xs font-medium hover:bg-orange-500/5 transition-colors flex items-center justify-center gap-1">
                                <Plus className="w-3 h-3" /> 新增利率調整
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <button
                        onClick={() => {
                          if (editingLoanId === loan.id) { setEditingLoanId(null); return; }
                          setEditingLoanId(loan.id);
                          setEditLoanForm({ name: loan.name, principal: String(loan.principal), annualRate: String((loan.annualRate * 100).toFixed(2)), periods: String(loan.periods), startDate: loan.startDate, loanType: (loan.loanType ?? "annuity") as "annuity" | "interest_only", notes: loan.notes ?? "" });
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${editingLoanId === loan.id ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground border-border hover:bg-muted"}`}>
                        <Pencil className="w-3 h-3" /> 編輯貸款
                      </button>
                      <button onClick={() => setDeleteConfirm({ label: `確定刪除貸款「${loan.name}」？`, onConfirm: async () => { await deleteLoan(loan.id); setLoansList(prev => prev.filter(l => l.id !== loan.id)); setLoanPaymentsMap(prev => { const n = { ...prev }; delete n[loan.id]; return n; }); closeOverlay(); toast.success("貸款已刪除"); } })}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-destructive text-xs font-medium border border-destructive/20 hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3 h-3" /> 刪除
                      </button>
                    </div>
                    {editingLoanId === loan.id && (
                      <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-primary/20">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">編輯貸款</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="col-span-2"><label className="text-muted-foreground">名稱</label>
                            <input value={editLoanForm.name} onChange={e => setEditLoanForm(f => ({ ...f, name: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">本金</label>
                            <input type="number" value={editLoanForm.principal} onChange={e => setEditLoanForm(f => ({ ...f, principal: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">年利率 (%)</label>
                            <input type="number" step="0.01" value={editLoanForm.annualRate} onChange={e => setEditLoanForm(f => ({ ...f, annualRate: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">期數</label>
                            <input type="number" value={editLoanForm.periods} onChange={e => setEditLoanForm(f => ({ ...f, periods: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div><label className="text-muted-foreground">起始日</label>
                            <input value={editLoanForm.startDate} onChange={e => setEditLoanForm(f => ({ ...f, startDate: e.target.value }))}
                              className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                          <div className="col-span-2"><label className="text-muted-foreground">類型</label>
                            <div className="flex gap-4 mt-1">
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`editLoanType-${loan.id}`} value="annuity" checked={editLoanForm.loanType === "annuity"} onChange={() => setEditLoanForm(f => ({ ...f, loanType: "annuity" }))} /><span>等額本息</span></label>
                              <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`editLoanType-${loan.id}`} value="interest_only" checked={editLoanForm.loanType === "interest_only"} onChange={() => setEditLoanForm(f => ({ ...f, loanType: "interest_only" }))} /><span>質押（只還利息）</span></label>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const newPrincipal = Number(editLoanForm.principal);
                                const updated = await updateLoan(loan.id, { name: editLoanForm.name, principal: newPrincipal, annualRate: Number(editLoanForm.annualRate) / 100, periods: Number(editLoanForm.periods), startDate: editLoanForm.startDate, loanType: editLoanForm.loanType, notes: editLoanForm.notes || null });
                                setLoansList(prev => prev.map(l => l.id === loan.id ? updated : l));
                                setEditingLoanId(null);
                                if (newPrincipal !== loan.principal) {
                                  listSimulations().then(sims => { const s = sims.find(s => s.id === sim.id); if (s) setSim(s); }).catch(() => {});
                                }
                                toast.success("貸款已更新");
                              } catch { toast.error("更新失敗"); }
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                          >儲存</button>
                          <button onClick={() => setEditingLoanId(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-muted transition-colors">取消</button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

            </div>
          </div>
        );
      })()}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-sm leading-none">QuantPilot</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{positions.length} 檔持股 · {optionsTrades.length} 選擇權持倉</p>
        </div>
        <button
          onClick={() => { setShowNotifications(v => !v); setShowMore(false); }}
          className="relative p-2 rounded-xl hover:bg-secondary/60 transition-colors"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          {pendingNotifications.length > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {pendingNotifications.length > 9 ? "9+" : pendingNotifications.length}
            </span>
          )}
        </button>
      </header>

      {/* Notification Full Page */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background flex flex-col max-w-md mx-auto"
          >
            {/* Page Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
              <button onClick={() => setShowNotifications(false)} className="p-1.5 rounded-xl hover:bg-secondary/60 text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 flex-1">
                <Bell className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold">待確認事件</span>
                {pendingNotifications.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-destructive/15 text-destructive text-[10px] font-bold rounded-full">
                    {pendingNotifications.length}
                  </span>
                )}
              </div>
            </header>

            {pendingNotifications.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">沒有待確認的事件</p>
                  <p className="text-xs text-muted-foreground mt-1">所有還款均已處理</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {pendingNotifications.map(notif => {
                  const isConfirming = confirmingNotifId === notif.id;
                  const draftPrincipal = Number(confirmDraft.principal) || 0;
                  const draftInterest = Number(confirmDraft.interest) || 0;
                  const draftTotal = draftPrincipal + draftInterest;
                  // paymentDate 在 draft 中以 YYYY-MM-DD 儲存，轉回 YYYYMMDD
                  const draftDateYmd = confirmDraft.paymentDate.replace(/-/g, "");
                  return (
                    <div key={notif.id} className="px-4 py-3">
                      {/* 摘要列 */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-warning/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Landmark className="w-3.5 h-3.5 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium">{notif.loanName} 第 {notif.period} 期還款</p>
                          {!isConfirming && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {notif.paymentDate.slice(0,4)}/{notif.paymentDate.slice(4,6)}/{notif.paymentDate.slice(6,8)} ·{" "}
                              {notif.loanType === "interest_only"
                                ? `利息 $${notif.interestPortion.toLocaleString()}`
                                : `本金 $${notif.principalPortion.toLocaleString()} + 利息 $${notif.interestPortion.toLocaleString()}`}
                              {" · "}總計 <span className="font-semibold text-foreground">${notif.totalPayment.toLocaleString()}</span>
                            </p>
                          )}
                        </div>
                        {!isConfirming && (
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setConfirmingNotifId(notif.id);
                                // date: YYYYMMDD → YYYY-MM-DD for input[type=date]
                                const d = notif.paymentDate;
                                setConfirmDraft({
                                  paymentDate: `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`,
                                  principal: String(notif.principalPortion),
                                  interest: String(notif.interestPortion),
                                });
                              }}
                              className="px-3 py-1 bg-primary text-white text-[11px] font-semibold rounded-lg active:scale-95 transition-transform"
                            >
                              確認
                            </button>
                            <button
                              onClick={() => setDismissedNotifIds(prev => new Set([...prev, notif.id]))}
                              className="px-3 py-1 bg-secondary text-muted-foreground text-[11px] font-medium rounded-lg active:scale-95 transition-transform"
                            >
                              略過
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 可編輯確認表單 */}
                      {isConfirming && (
                        <div className="mt-2 ml-10 space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-muted-foreground w-12 shrink-0">日期</label>
                            <input
                              type="date"
                              value={confirmDraft.paymentDate}
                              onChange={e => setConfirmDraft(d => ({ ...d, paymentDate: e.target.value }))}
                              className="flex-1 text-[12px] border border-border rounded-lg px-2 py-1 bg-background font-mono"
                            />
                          </div>
                          {notif.loanType !== "interest_only" && (
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] text-muted-foreground w-12 shrink-0">本金</label>
                              <input
                                type="number"
                                value={confirmDraft.principal}
                                onChange={e => setConfirmDraft(d => ({ ...d, principal: e.target.value }))}
                                className="flex-1 text-[12px] border border-border rounded-lg px-2 py-1 bg-background font-mono"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-muted-foreground w-12 shrink-0">利息</label>
                            <input
                              type="number"
                              value={confirmDraft.interest}
                              onChange={e => setConfirmDraft(d => ({ ...d, interest: e.target.value }))}
                              className="flex-1 text-[12px] border border-border rounded-lg px-2 py-1 bg-background font-mono"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-muted-foreground">
                              總計 <span className="font-mono font-semibold text-foreground">${draftTotal.toLocaleString()}</span>
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmingNotifId(null)}
                                className="px-3 py-1 bg-secondary text-muted-foreground text-[11px] font-medium rounded-lg active:scale-95 transition-transform"
                              >
                                取消
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const payment = await addLoanPayment({
                                      loanId: notif.loanId,
                                      paymentDate: draftDateYmd,
                                      amount: draftTotal,
                                      principalPortion: draftPrincipal,
                                      interestPortion: draftInterest,
                                      notes: `第 ${notif.period} 期`,
                                    });
                                    setLoanPaymentsMap(prev => ({
                                      ...prev,
                                      [notif.loanId]: [...(prev[notif.loanId] ?? []), payment],
                                    }));
                                    setConfirmingNotifId(null);
                                    toast.success(`${notif.loanName} 第 ${notif.period} 期已記錄`);
                                  } catch { toast.error("記錄失敗"); }
                                }}
                                className="px-3 py-1 bg-primary text-white text-[11px] font-semibold rounded-lg active:scale-95 transition-transform"
                              >
                                儲存
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trades Add Form Full Page */}
      <AnimatePresence>
        {showTradesPageForm && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background flex flex-col max-w-md mx-auto"
          >
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
              <button onClick={() => setShowTradesPageForm(false)} className="p-1.5 rounded-xl hover:bg-secondary/60 text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold flex-1">新增交易</span>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
              {/* Type selector */}
              <div className="flex gap-1.5 flex-wrap">
                {(["stock", "options", "loan", "cash"] as const).map((ft) => (
                  <button key={ft} onClick={() => setAddFormType(ft)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${addFormType === ft ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                  >{ft === "stock" ? "股票" : ft === "options" ? "選擇權" : ft === "loan" ? "貸款" : "收支"}</button>
                ))}
              </div>

              {/* Stock form */}
              {addFormType === "stock" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">交易日</Label>
                    <Input value={stockTradeForm.tradeDate} onChange={(e) => setStockTradeForm(f => ({ ...f, tradeDate: e.target.value }))} placeholder="YYYYMMDD" className="font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">股票代號</Label>
                    <Input value={stockTradeForm.symbol} onChange={(e) => setStockTradeForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="2330.TW" className="font-mono mt-1" />
                  </div>
                  <div className="flex gap-2">
                    {(["BUY", "SELL"] as const).map((a) => (
                      <button key={a} onClick={() => setStockTradeForm(f => ({ ...f, action: a }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${stockTradeForm.action === a ? (a === "BUY" ? "bg-success/20 text-success border border-success/30" : "bg-destructive/20 text-destructive border border-destructive/30") : "bg-muted text-muted-foreground"}`}
                      >{a === "BUY" ? "買進" : "賣出"}</button>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">成交價</Label>
                    <Input type="number" value={stockTradeForm.price} onChange={(e) => setStockTradeForm(f => ({ ...f, price: e.target.value }))} placeholder="580" className="font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">數量（股）</Label>
                    <Input type="number" value={stockTradeForm.quantity} onChange={(e) => setStockTradeForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1000" className="font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">手續費</Label>
                    <Input type="number" value={stockTradeForm.fee} onChange={(e) => setStockTradeForm(f => ({ ...f, fee: e.target.value }))} className="font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">備註</Label>
                    <Input value={stockTradeForm.notes} onChange={(e) => setStockTradeForm(f => ({ ...f, notes: e.target.value }))} placeholder="備註（選填）" className="mt-1" />
                  </div>
                  <Button onClick={async () => {
                    if (!stockTradeForm.symbol || !stockTradeForm.price || !stockTradeForm.quantity) { toast.error("請填寫必要欄位"); return; }
                    try {
                      await addStockTrade({ simulationId: simId, tradeDate: stockTradeForm.tradeDate, action: stockTradeForm.action, symbol: stockTradeForm.symbol, price: Number(stockTradeForm.price), quantity: Number(stockTradeForm.quantity), fee: Number(stockTradeForm.fee), notes: stockTradeForm.notes || null });
                      toast.success("股票交易已新增");
                      setShowTradesPageForm(false);
                      setStockTradeForm(f => ({ ...f, symbol: "", price: "", quantity: "", fee: "0", notes: "" }));
                      getStockTrades(simId).then(setStockTradesList).catch(() => {});
                    } catch { toast.error("新增失敗"); }
                  }} className="w-full h-12 text-base rounded-xl">新增股票交易</Button>
                </div>
              )}

              {/* Options form */}
              {addFormType === "options" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">交易日</Label>
                    <Input value={tradeForm.tradeDate} onChange={(e) => setTradeForm(f => ({ ...f, tradeDate: e.target.value }))} placeholder="YYYYMMDD" className="font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">合約月份</Label>
                    <Input value={tradeForm.contractMonth} onChange={(e) => setTradeForm(f => ({ ...f, contractMonth: e.target.value }))} placeholder="202604" className="font-mono mt-1" />
                  </div>
                  <div className="flex gap-2">
                    {(["BUY", "SELL"] as const).map((a) => (
                      <button key={a} onClick={() => setTradeForm(f => ({ ...f, action: a }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tradeForm.action === a ? (a === "BUY" ? "bg-success/20 text-success border border-success/30" : "bg-destructive/20 text-destructive border border-destructive/30") : "bg-muted text-muted-foreground"}`}
                      >{a === "BUY" ? "買進" : "賣出"}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {(["C", "P"] as const).map((cp) => (
                      <button key={cp} onClick={() => setTradeForm(f => ({ ...f, callPut: cp }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tradeForm.callPut === cp ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}
                      >{cp === "C" ? "Call" : "Put"}</button>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">履約價</Label>
                    <Input type="number" value={tradeForm.strikePrice} onChange={(e) => setTradeForm(f => ({ ...f, strikePrice: e.target.value }))} placeholder="22000" className="font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">成交價</Label>
                    <Input type="number" value={tradeForm.price} onChange={(e) => setTradeForm(f => ({ ...f, price: e.target.value }))} placeholder="120" className="font-mono mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">口數</Label>
                      <Input type="number" value={tradeForm.quantity} onChange={(e) => setTradeForm(f => ({ ...f, quantity: e.target.value }))} className="font-mono mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">手續費</Label>
                      <Input type="number" value={tradeForm.fee} onChange={(e) => setTradeForm(f => ({ ...f, fee: e.target.value }))} className="font-mono mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">備註</Label>
                    <Input value={tradeForm.notes} onChange={(e) => setTradeForm(f => ({ ...f, notes: e.target.value }))} placeholder="備註（選填）" className="mt-1" />
                  </div>
                  <Button onClick={async () => {
                    if (!tradeForm.contractMonth || !tradeForm.strikePrice || !tradeForm.price) { toast.error("請填寫必要欄位"); return; }
                    try {
                      await addOptionsTrade({ simulationId: simId, tradeDate: tradeForm.tradeDate, action: tradeForm.action, contractId: tradeForm.contractId, contractMonth: tradeForm.contractMonth, callPut: tradeForm.callPut, strikePrice: Number(tradeForm.strikePrice), price: Number(tradeForm.price), quantity: Number(tradeForm.quantity), fee: Number(tradeForm.fee), notes: tradeForm.notes || null });
                      toast.success("選擇權交易已新增");
                      setShowTradesPageForm(false);
                      setTradeForm(f => ({ ...f, strikePrice: "", price: "", quantity: "1", fee: "0", notes: "" }));
                      getOptionsTrades(simId).then(setOptionsTrades).catch(() => {});
                    } catch { toast.error("新增失敗"); }
                  }} className="w-full h-12 text-base rounded-xl">新增選擇權交易</Button>
                </div>
              )}

              {/* Loan form */}
              {addFormType === "loan" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">貸款名稱</Label>
                    <Input value={loanForm.name} onChange={(e) => setLoanForm(f => ({ ...f, name: e.target.value }))} placeholder="房貸" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">起始日</Label>
                    <Input value={loanForm.startDate} onChange={(e) => setLoanForm(f => ({ ...f, startDate: e.target.value }))} placeholder="YYYYMMDD" className="font-mono mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">本金</Label>
                    <Input type="number" value={loanForm.principal} onChange={(e) => setLoanForm(f => ({ ...f, principal: e.target.value }))} placeholder="1000000" className="font-mono mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">年利率（%）</Label>
                      <Input type="number" value={loanForm.annualRate} onChange={(e) => setLoanForm(f => ({ ...f, annualRate: e.target.value }))} placeholder="2.5" className="font-mono mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">期數（月）</Label>
                      <Input type="number" value={loanForm.periods} onChange={(e) => setLoanForm(f => ({ ...f, periods: e.target.value }))} placeholder="240" className="font-mono mt-1" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(["annuity", "interest_only"] as const).map((lt) => (
                      <button key={lt} onClick={() => setLoanForm(f => ({ ...f, loanType: lt }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${loanForm.loanType === lt ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}
                      >{lt === "annuity" ? "等額本息" : "只還利息"}</button>
                    ))}
                  </div>
                  {loanForm.principal && loanForm.annualRate && loanForm.periods && (
                    <div className="bg-muted rounded-xl px-4 py-3 text-sm font-mono text-center">
                      {loanForm.loanType === "interest_only"
                        ? `月付利息 $${Math.round(Number(loanForm.principal) * Number(loanForm.annualRate) / 100 / 12).toLocaleString()}`
                        : `月付金 $${Math.round(computeMonthlyPayment(Number(loanForm.principal), Number(loanForm.annualRate) / 100, Number(loanForm.periods))).toLocaleString()}`}
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">備註</Label>
                    <Input value={loanForm.notes} onChange={(e) => setLoanForm(f => ({ ...f, notes: e.target.value }))} placeholder="備註（選填）" className="mt-1" />
                  </div>
                  <Button onClick={async () => {
                    if (!loanForm.name || !loanForm.principal || !loanForm.annualRate || !loanForm.periods || !loanForm.startDate) { toast.error("請填寫必要欄位"); return; }
                    if (!sim?.id) { toast.error("請先選擇模擬"); return; }
                    try {
                      await createLoan({ simulationId: sim.id, name: loanForm.name, principal: Number(loanForm.principal), annualRate: Number(loanForm.annualRate) / 100, periods: Number(loanForm.periods), startDate: loanForm.startDate, loanType: loanForm.loanType, notes: loanForm.notes || null });
                      toast.success("貸款已建立，現金已入帳");
                      setShowTradesPageForm(false);
                      setLoanForm({ name: "", principal: "", annualRate: "", periods: "", startDate: todayTW(), loanType: "annuity", notes: "" });
                      getLoans(sim.id).then(setLoansList).catch(() => {});
                      listSimulations().then(sims => { if (sims.length > 0) setSim(sims[0]); }).catch(() => {});
                    } catch { toast.error("建立失敗"); }
                  }} className="w-full h-12 text-base rounded-xl">新增貸款</Button>
                </div>
              )}

              {/* Cash event form */}
              {addFormType === "cash" && (() => {
                const MANUAL_INCOME_ACTIONS: CashAction[] = ["SALARY", "DIVIDEND", "INTEREST_IN", "TRANSFER_IN", "OTHER_IN", "UNKNOWN_IN"];
                const MANUAL_EXPENSE_ACTIONS: CashAction[] = ["LIVING", "INTEREST_OUT", "FEE", "TRANSFER_OUT", "OTHER_OUT", "UNKNOWN_OUT"];
                return (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">日期</Label>
                      <Input value={cashEventForm.tradeDate} onChange={e => setCashEventForm(f => ({ ...f, tradeDate: e.target.value }))} placeholder="YYYYMMDD" className="font-mono mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">科目</Label>
                      <select
                        value={cashEventForm.action}
                        onChange={e => setCashEventForm(f => ({ ...f, action: e.target.value as CashAction }))}
                        className="w-full mt-1 bg-secondary/50 rounded-xl border-0 px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <optgroup label="── 收入 ──">
                          {MANUAL_INCOME_ACTIONS.map(a => <option key={a} value={a}>{cashActionLabel(a)}</option>)}
                        </optgroup>
                        <optgroup label="── 支出 ──">
                          {MANUAL_EXPENSE_ACTIONS.map(a => <option key={a} value={a}>{cashActionLabel(a)}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">金額</Label>
                      <Input type="number" value={cashEventForm.amount} onChange={e => setCashEventForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" className="font-mono mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">備註（選填）</Label>
                      <Input value={cashEventForm.notes} onChange={e => setCashEventForm(f => ({ ...f, notes: e.target.value }))} placeholder="備註" className="mt-1" />
                    </div>
                    <Button onClick={async () => {
                      if (!cashEventForm.amount || Number(cashEventForm.amount) <= 0) { toast.error("金額必須大於 0"); return; }
                      try {
                        await addCashEvent({ simulationId: simId, tradeDate: cashEventForm.tradeDate, action: cashEventForm.action, amount: Number(cashEventForm.amount), notes: cashEventForm.notes || null });
                        toast.success("已新增");
                        setShowTradesPageForm(false);
                        setCashEventForm(f => ({ ...f, amount: "", notes: "" }));
                        getCashEvents(simId).then(setCashEventsList).catch(() => {});
                      } catch { toast.error("新增失敗"); }
                    }} className="w-full h-12 text-base rounded-xl">新增收支事件</Button>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* ==================== OVERVIEW TAB ==================== */}
            {activeTab === "overview" && (
              <div className="px-4 pt-5 space-y-4">
                {/* Hero */}
                <div className="text-center pb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                    {indexDelta !== 0 ? `模擬後淨資產（${indexDelta > 0 ? "+" : ""}${indexDelta.toFixed(0)} 點 / ${marketAdjust > 0 ? "+" : ""}${marketAdjust.toFixed(2)}%）` : "總淨資產"}
                  </p>
                  <div className="text-4xl font-bold font-mono tabular-nums">
                    <AnimatedNumber value={totalAdjustedValue} prefix="$" />
                  </div>
                </div>

                {/* 大盤指數模擬 */}
                <Card className="p-4 space-y-3">
                  {/* 目前大盤指數輸入 */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">大盤指數</label>
                    <input
                      type="number"
                      value={baseIndex}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setBaseIndex(v);
                        setSimIndex(v + indexDelta);
                      }}
                      className="flex-1 bg-secondary/50 rounded-lg px-3 py-1.5 text-sm font-mono text-right border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={async () => {
                        setIndexLoading(true);
                        try {
                          const res = await fetchMarketIndex();
                          if ("index" in res) {
                            setBaseIndex(res.index);
                            setSimIndex(res.index);
                            toast.success(`加權指數 ${res.index.toLocaleString()}`);
                          } else {
                            toast.error(res.error);
                          }
                        } catch {
                          toast.error("無法取得大盤指數");
                        } finally {
                          setIndexLoading(false);
                        }
                      }}
                      disabled={indexLoading}
                      className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title="從證交所取得即時指數"
                    >
                      <RefreshCcw size={14} className={indexLoading ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {/* 模擬指數與漲跌資訊 */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">漲跌模擬</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold tabular-nums text-foreground">
                        {simIndex.toLocaleString()}
                      </span>
                      <span className={`text-sm font-mono font-bold tabular-nums px-2 py-0.5 rounded-lg ${
                        indexDelta > 0 ? "text-success bg-success/10" :
                        indexDelta < 0 ? "text-destructive bg-destructive/10" :
                        "text-muted-foreground bg-secondary/50"
                      }`}>
                        {indexDelta > 0 ? "+" : ""}{indexDelta.toFixed(0)} 點
                      </span>
                      <span className={`text-xs font-mono tabular-nums px-1.5 py-0.5 rounded ${
                        marketAdjust > 0 ? "text-success/70" :
                        marketAdjust < 0 ? "text-destructive/70" :
                        "text-muted-foreground/50"
                      }`}>
                        {marketAdjust > 0 ? "+" : ""}{marketAdjust.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Slider：用點數拉 */}
                  <input
                    type="range"
                    min={Math.round(baseIndex * 0.5)}
                    max={Math.round(baseIndex * 1.5)}
                    step={Math.max(1, Math.round(baseIndex * 0.001))}
                    value={simIndex}
                    onChange={(e) => setSimIndex(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-secondary"
                  />
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span>{Math.round(baseIndex * 0.5).toLocaleString()}</span>
                    {indexDelta !== 0 ? (
                      <button
                        onClick={() => setSimIndex(baseIndex)}
                        className="text-primary hover:underline text-[10px]"
                      >
                        重置
                      </button>
                    ) : (
                      <span className="text-muted-foreground/50">拖曳模擬大盤點數</span>
                    )}
                    <span>{Math.round(baseIndex * 1.5).toLocaleString()}</span>
                  </div>
                </Card>

                {/* Stock Holdings */}
                {positions.length > 0 && (() => {
                  const totalStockSimDelta = positions.reduce((s, pos) => {
                    const mv = pos.shares * pos.currentPrice;
                    return s + mv * (marketAdjust / 100) * (pos.beta ?? 1.0);
                  }, 0);

                  return (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 pt-1 pb-0.5 flex items-center justify-between">
                        <span>股票持倉</span>
                        {indexDelta !== 0 && (
                          <span className={`font-mono normal-case tracking-normal ${totalStockSimDelta >= 0 ? "text-success" : "text-destructive"}`}>
                            模擬 {totalStockSimDelta >= 0 ? "+" : ""}{totalStockSimDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </p>
                      <Card className="overflow-hidden">
                        {positions.map((pos, i) => {
                          const marketValue = pos.shares * pos.currentPrice;
                          const simDelta = marketValue * (marketAdjust / 100) * (pos.beta ?? 1.0);
                          const pnl = (pos.currentPrice - pos.costBasis) * pos.shares;
                          return (
                            <div key={pos.symbol} className={`flex items-center px-4 py-3 ${i < positions.length - 1 ? "border-b border-border/60" : ""}`}>
                              <div className="w-8 h-8 rounded-[9px] bg-green-500 flex items-center justify-center shrink-0 mr-3.5">
                                <TrendingUp className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold font-mono">{pos.symbol}</p>
                                <p className="text-xs text-muted-foreground font-mono">{pos.shares.toLocaleString()}股 · 均${Math.round(pos.costBasis).toLocaleString()}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-mono font-semibold">${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                {indexDelta !== 0 ? (
                                  <p className={`text-xs font-mono ${simDelta >= 0 ? "text-success" : "text-destructive"}`}>
                                    {simDelta >= 0 ? "+" : ""}{simDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </p>
                                ) : pnl !== 0 ? (
                                  <p className={`text-xs font-mono ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                                    {pnl >= 0 ? "+" : ""}{pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </Card>
                    </>
                  );
                })()}

                {/* Options Holdings */}
                {(() => {
                  if (optHoldings.length === 0) return null;
                  const tradeHoldings = optHoldings;

                  const computeOptionSimDelta = (oh: typeof tradeHoldings[0]) => {
                    if (indexDelta === 0) return 0;
                    const intrinsicNow = oh.callPut === "P"
                      ? Math.max(oh.strikePrice - baseIndex, 0)
                      : Math.max(baseIndex - oh.strikePrice, 0);
                    const intrinsicSim = oh.callPut === "P"
                      ? Math.max(oh.strikePrice - simIndex, 0)
                      : Math.max(simIndex - oh.strikePrice, 0);
                    return (intrinsicSim - intrinsicNow) * oh.netQuantity * TXO_MULTIPLIER;
                  };

                  const totalOptionSimDelta = tradeHoldings.reduce((s, h) => s + computeOptionSimDelta(h), 0);

                  return (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 pt-1 pb-0.5 flex items-center justify-between">
                        <span>選擇權持倉</span>
                        {indexDelta !== 0 && (
                          <span className={`font-mono normal-case tracking-normal ${totalOptionSimDelta >= 0 ? "text-success" : "text-destructive"}`}>
                            模擬 {totalOptionSimDelta >= 0 ? "+" : ""}{totalOptionSimDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </p>
                      <Card className="overflow-hidden">
                        {tradeHoldings.map((h, i) => {
                          const optSimDelta = computeOptionSimDelta(h);
                          const isLong = h.netQuantity > 0;
                          const tag = classifyContractMonth(h.contractMonth, optHoldingMonths);
                          return (
                            <div key={i} className={`flex items-center px-4 py-3 ${i < tradeHoldings.length - 1 ? "border-b border-border/60" : ""}`}>
                              <div className={`w-8 h-8 rounded-[9px] ${h.callPut === "C" ? "bg-blue-500" : "bg-purple-500"} flex items-center justify-center shrink-0 mr-3.5`}>
                                <Activity className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[15px] font-semibold font-mono">{h.contractMonth}</span>
                                  <span className={`text-[10px] font-bold px-1 rounded ${h.callPut === "C" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>{h.callPut}</span>
                                  {tag && <span className={`text-[9px] px-1 rounded leading-tight font-semibold ${tag === "近月" ? "bg-warning/20 text-warning" : "bg-sky-500/20 text-sky-400"}`}>{tag}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground font-mono">履 {h.strikePrice.toLocaleString()} · 均 {Number(h.avgCost.toFixed(1)).toLocaleString()}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={`text-sm font-mono font-bold ${isLong ? "text-success" : "text-destructive"}`}>
                                  {isLong ? "+" : ""}{h.netQuantity.toLocaleString()} 口
                                </p>
                                {indexDelta !== 0 && (
                                  <p className={`text-xs font-mono ${optSimDelta >= 0 ? "text-success" : "text-destructive"}`}>
                                    {optSimDelta >= 0 ? "+" : ""}{optSimDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </Card>
                    </>
                  );
                })()}

                {/* Cash / Debt */}
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1 pt-1 pb-0.5">資產負債</p>
                <Card className="overflow-hidden">
                  <div className="flex items-center px-4 py-3">
                    <div className={`w-8 h-8 rounded-[9px] ${cash >= 0 ? "bg-green-500" : "bg-destructive"} flex items-center justify-center shrink-0 mr-3.5`}>
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px]">現金</p>
                      <p className="text-xs text-muted-foreground">由交易事件自動計算</p>
                    </div>
                    <span className={`text-sm font-mono font-bold ${cash >= 0 ? "text-success" : "text-destructive"}`}>
                      {cash < 0 ? "-" : ""}${Math.abs(cash).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Loan rows */}
                  {loansList.map((loan, i) => {
                    const isInterestOnly = loan.loanType === "interest_only";
                    const totalPaid = loanTotalPaidMap[loan.id] ?? 0;
                    const remaining = computeRemainingBalance(loan as import("@/shared/types").Loan, totalPaid);
                    const monthly = isInterestOnly
                      ? remaining * loan.annualRate / 12
                      : computeMonthlyPayment(loan.principal, loan.annualRate, loan.periods);
                    return (
                      <div key={loan.id} className="flex items-center px-4 py-3 border-t border-border/60">
                        <div className="w-8 h-8 rounded-[9px] bg-orange-500 flex items-center justify-center shrink-0 mr-3.5">
                          <Landmark className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[15px] truncate">{loan.name}</p>
                            {isInterestOnly && <span className="text-[10px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full font-medium shrink-0">質押</span>}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{(loan.annualRate * 100).toFixed(1)}% · 月${Math.round(monthly).toLocaleString()}</p>
                        </div>
                        <span className="text-sm font-mono font-bold text-destructive shrink-0">-${remaining.toLocaleString()}</span>
                      </div>
                    );
                  })}

                  {loansList.length > 0 && (() => {
                    const summary = computeLoanSummary(loansList as any);
                    return (
                      <div className="border-t border-border/60 px-4 py-2.5 flex items-center justify-between bg-muted/30">
                        <p className="text-xs text-muted-foreground">貸款合計 {summary.count} 筆 · 月付 ${summary.totalMonthlyPayment.toLocaleString()}</p>
                        <p className="text-xs font-mono font-semibold text-warning">-${summary.totalPrincipal.toLocaleString()}</p>
                      </div>
                    );
                  })()}
                </Card>

                {/* Empty state */}
                {positions.length === 0 && optionsTrades.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground">尚無持倉，點擊右上角新增持股</p>
                    <p className="text-xs text-muted-foreground mt-1">或在「交易」tab 新增選擇權交易</p>
                  </div>
                )}
              </div>
            )}

            {/* ==================== ACCOUNT TAB ==================== */}
            {activeTab === "account" && (() => {
              const accounts = unifiedAccounts;

              const { realTotal, grandTotal, isBalanced } = doubleEntrySnapshot;

              return (
                <div className="space-y-2 pb-24 px-4 pt-5">

                  {/* 帳戶平衡狀態橫幅 */}
                  <Card className="overflow-hidden mb-1">
                    <button onClick={() => setShowBalanceDetail(v => !v)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                      <div className={`w-8 h-8 rounded-[9px] ${isBalanced ? "bg-green-500" : "bg-destructive"} flex items-center justify-center shrink-0`}>
                        {isBalanced ? <CheckCircle2 className="w-4.5 h-4.5 text-white" /> : <AlertTriangle className="w-4.5 h-4.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-semibold ${isBalanced ? "text-success" : "text-destructive"}`}>
                          {isBalanced ? "帳戶平衡 ✓" : "帳戶不平衡"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {isBalanced ? "Σ所有帳戶 = $0，點擊查看明細" : `差異 = $${Math.abs(grandTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}（未記帳事件）`}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground/50 transition-transform ${showBalanceDetail ? "rotate-90" : ""}`} />
                    </button>
                    {showBalanceDetail && (() => {
                      const { accounts: allAccts, realTotal: rt, virtualTotal: vt, grandTotal: gt } = doubleEntrySnapshot;
                      const realAccts = allAccts.filter(a => a.kind.startsWith("real"));
                      const virtAccts = allAccts.filter(a => a.kind.startsWith("virtual"));
                      const fmtAmt = (n: number) => `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                      return (
                        <div className="border-t border-border/60 px-4 py-3 space-y-3">
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">實體帳戶</p>
                            {realAccts.map(a => (
                              <div key={a.id} className="flex justify-between items-center py-0.5">
                                <span className="text-[12px] text-foreground">{a.label}</span>
                                <span className={`text-[12px] font-mono ${a.balance >= 0 ? "text-foreground" : "text-destructive"}`}>{fmtAmt(a.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center border-t border-border/60 pt-1 mt-1">
                              <span className="text-[11px] font-semibold text-muted-foreground">小計</span>
                              <span className={`text-[12px] font-mono font-bold ${rt >= 0 ? "text-foreground" : "text-destructive"}`}>{fmtAmt(rt)}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">虛帳（來源 / 消耗）</p>
                            {virtAccts.map(a => (
                              <div key={a.id} className="flex justify-between items-center py-0.5">
                                <span className="text-[12px] text-foreground">{a.label}</span>
                                <span className={`text-[12px] font-mono ${a.balance <= 0 ? "text-success" : "text-destructive"}`}>{fmtAmt(a.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center border-t border-border/60 pt-1 mt-1">
                              <span className="text-[11px] font-semibold text-muted-foreground">小計</span>
                              <span className={`text-[12px] font-mono font-bold ${vt <= 0 ? "text-success" : "text-destructive"}`}>{fmtAmt(vt)}</span>
                            </div>
                          </div>
                          <div className={`flex justify-between items-center rounded-xl px-3 py-2 ${Math.abs(gt) < 1 ? "bg-success/10" : "bg-destructive/10"}`}>
                            <span className="text-[12px] font-bold">Σ 總計</span>
                            <span className={`text-[13px] font-mono font-bold ${Math.abs(gt) < 1 ? "text-success" : "text-destructive"}`}>{fmtAmt(gt)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>

                  {/* 實體帳戶 section label */}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground pt-1">實體帳戶</p>

                  {/* Unified Account List */}
                  {accounts.map(acct => {

                    // ── Cash Account ──
                    if (acct.type === "cash") {
                      return (
                        <Card key={acct.id} className="overflow-hidden">
                          <SwipeableRow
                            onEdit={() => setAccountDetailId(acct.id)}
                            editLabel="明細"
                            onSwipeRight={() => {
                              setBalanceAdjustInput("");
                              setBalanceAdjust({
                                label: "現金餘額調整",
                                currentBalance: acct.value,
                                onConfirm: async (target) => {
                                  const diff = target - acct.value;
                                  const action = diff > 0 ? "UNKNOWN_IN" : "UNKNOWN_OUT";
                                  const newEvt = await addCashEvent({ simulationId: simId, tradeDate: todayTW(), action, amount: Math.round(Math.abs(diff)), notes: "餘額調整" });
                                  setCashEventsList(prev => [newEvt, ...prev]);
                                  toast.success("已新增餘額調整");
                                },
                              });
                            }}
                            swipeRightLabel="調整"
                            swipeRightColor="bg-orange-500"
                          >
                            <div className="w-full flex items-center px-4 py-3.5">
                              <div className={`w-9 h-9 rounded-[10px] ${acct.value >= 0 ? "bg-green-500" : "bg-destructive"} flex items-center justify-center shrink-0 mr-3.5`}>
                                <Wallet className="w-4.5 h-4.5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-[15px] font-medium">現金</p>
                                {acct.subtitle && <p className="text-xs text-muted-foreground">{acct.subtitle}</p>}
                              </div>
                              <span className={`text-sm font-mono font-bold mr-2 ${acct.value >= 0 ? "text-success" : "text-destructive"}`}>
                                {acct.value < 0 ? "-" : ""}${Math.abs(acct.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                          </SwipeableRow>
                        </Card>
                      );
                    }

                    // ── Stock Account ──
                    if (acct.type === "stock") {
                      const pos: Position = acct.data.position;
                      const marketValue = pos.shares * pos.currentPrice;

                      return (
                        <Card key={acct.id} className="overflow-hidden">
                          <SwipeableRow onEdit={() => setAccountDetailId(acct.id)} editLabel="明細">
                            <div className="w-full flex items-center px-4 py-3.5">
                              <div className="w-9 h-9 rounded-[10px] bg-green-500 flex items-center justify-center shrink-0 mr-3.5">
                                <TrendingUp className="w-4.5 h-4.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-semibold font-mono">{pos.symbol}</p>
                                <p className="text-xs text-muted-foreground font-mono">{pos.shares.toLocaleString()}股 · 均${Math.round(pos.costBasis > 0 ? pos.costBasis : pos.currentPrice).toLocaleString()}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold">${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                            </div>
                          </SwipeableRow>
                        </Card>
                      );
                    }

                    // ── Options Account ──
                    if (acct.type === "options") {
                      const holding: OptionsHolding | null = acct.data.holding ?? null;

                      return (
                        <Card key={acct.id} className="overflow-hidden">
                          <SwipeableRow onEdit={() => setAccountDetailId(acct.id)} editLabel="明細">
                            <div className="w-full flex items-center px-4 py-3.5">
                              <div className={`w-9 h-9 rounded-[10px] ${acct.data.holding?.callPut === "C" ? "bg-blue-500" : "bg-purple-500"} flex items-center justify-center shrink-0 mr-3.5`}>
                                <Activity className="w-4.5 h-4.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-medium truncate">{acct.label}</p>
                                {acct.subtitle && <p className="text-xs text-muted-foreground truncate">{acct.subtitle}</p>}
                              </div>
                              <div className="flex items-center gap-2">
                                {holding && (
                                  <span className={`text-sm font-mono font-bold ${holding.netQuantity > 0 ? "text-success" : "text-destructive"}`}>
                                    {holding.netQuantity > 0 ? "+" : ""}{holding.netQuantity}口
                                  </span>
                                )}
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                            </div>
                          </SwipeableRow>
                        </Card>
                      );
                    }

                    // ── Loan Account ──
                    if (acct.type === "loan") {
                      const loan: Loan = acct.data.loan;
                      const monthly: number = acct.data.monthly;
                      const totalPaid = loanTotalPaidMap[loan.id] ?? 0;
                      const actualRemaining = computeRemainingBalance(loan as import("@/shared/types").Loan, totalPaid);

                      return (
                        <Card key={acct.id} className="overflow-hidden">
                          <SwipeableRow onEdit={() => setAccountDetailId(acct.id)} editLabel="明細">
                            <div className="w-full flex items-center px-4 py-3.5">
                              <div className="w-9 h-9 rounded-[10px] bg-orange-500 flex items-center justify-center shrink-0 mr-3.5">
                                <Landmark className="w-4.5 h-4.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-medium">{loan.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">月付 ${Math.round(monthly).toLocaleString()} · {(loan.annualRate * 100).toFixed(1)}%</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono font-bold text-destructive">-${actualRemaining.toLocaleString()}</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                              </div>
                            </div>
                          </SwipeableRow>
                        </Card>
                      );
                    }

                    return null;
                  })}

                  {/* Empty state */}
                  {accounts.length <= 1 && (
                    <Card className="p-8 text-center">
                      <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">尚無帳戶</p>
                      <p className="text-xs text-muted-foreground mt-1">點擊右上角 + 新增</p>
                    </Card>
                  )}

                  {/* ── 虛帳收入 / 支出 cards ── */}
                  {[
                    { list: incomeVirtuals, label: "收入來源", isIncome: true },
                    { list: expenseVirtuals, label: "支出消耗", isIncome: false },
                  ].map(({ list, label: sectionLabel, isIncome }) => list.length > 0 && (
                    <React.Fragment key={sectionLabel}>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground pt-2">{sectionLabel}</p>
                      {list.map(va => {
                        const itemCount = virtualItemCounts[va.id] ?? 0;
                        const amtColor = isIncome ? "text-success" : "text-destructive";
                        const amtPrefix = isIncome ? "+" : "-";
                        const iconBg = isIncome ? "bg-green-500" : "bg-destructive";
                        return (
                          <Card key={va.id} className="overflow-hidden">
                            <button onClick={() => setAccountDetailId(va.id)} className="w-full flex items-center px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors">
                              <div className={`w-9 h-9 rounded-[10px] ${iconBg} flex items-center justify-center shrink-0 mr-3.5`}>
                                {isIncome ? <ArrowDownLeft className="w-4.5 h-4.5 text-white" /> : <ArrowUpRight className="w-4.5 h-4.5 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-medium">{va.label}</p>
                                <p className="text-xs text-muted-foreground">{itemCount > 0 ? `${itemCount} 筆` : "自動計算"}</p>
                              </div>
                              <span className={`text-sm font-mono font-bold ${amtColor} mr-2`}>
                                {amtPrefix}${Math.abs(va.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                            </button>
                          </Card>
                        );
                      })}
                    </React.Fragment>
                  ))}

                  {/* ── Add Form Modals ── */}
                  {showAddForm === "options_target" && (
                    <Card className="p-4 border-2 border-primary/30">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold">新增選擇權策略</p>
                        <button onClick={() => setShowAddForm(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex gap-1">
                          {(["SELL", "BUY"] as const).map(a => (
                            <button key={a} onClick={() => setOptionsTargetForm(f => ({ ...f, action: a }))}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${optionsTargetForm.action === a ? (a === "SELL" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-success/20 text-success border border-success/40") : "bg-muted text-muted-foreground border border-transparent"}`}>
                              {a}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          {(["P", "C"] as const).map(cp => (
                            <button key={cp} onClick={() => setOptionsTargetForm(f => ({ ...f, callPut: cp }))}
                              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${optionsTargetForm.callPut === cp ? (cp === "P" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-success/20 text-success border border-success/40") : "bg-muted text-muted-foreground border border-transparent"}`}>
                              {cp === "P" ? "Put" : "Call"}
                            </button>
                          ))}
                        </div>
                        <div>
                          <label className="text-muted-foreground">目標 Delta</label>
                          <input type="number" step="0.01" value={optionsTargetForm.targetDelta}
                            onChange={e => setOptionsTargetForm(f => ({ ...f, targetDelta: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-muted-foreground">口數</label>
                          <input type="number" value={optionsTargetForm.quantity}
                            onChange={e => setOptionsTargetForm(f => ({ ...f, quantity: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-muted-foreground">合約月份（空白=最近月）</label>
                          <input type="text" placeholder="如 202604" value={optionsTargetForm.contractMonth}
                            onChange={e => setOptionsTargetForm(f => ({ ...f, contractMonth: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const delta = parseFloat(optionsTargetForm.targetDelta);
                          if (isNaN(delta)) return;
                          await createOptionsTarget({
                            simulationId: sim.id,
                            action: optionsTargetForm.action,
                            callPut: optionsTargetForm.callPut,
                            targetDelta: delta,
                            contractMonth: optionsTargetForm.contractMonth || null,
                            quantity: parseInt(optionsTargetForm.quantity) || 1,
                          });
                          setShowAddForm(null);
                          getOptionsTargetMatches(sim.id).then(setOptionsTargetMatches).catch(() => {});
                          toast.success("已新增選擇權策略");
                        }}
                        className="mt-3 w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        新增
                      </button>
                    </Card>
                  )}

                  {showAddForm === "loan" && (
                    <Card className="p-4 border-2 border-primary/30">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold">新增貸款</p>
                        <button onClick={() => setShowAddForm(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-muted-foreground">名稱</label>
                          <input type="text" value={accountLoanForm.name}
                            onChange={e => setAccountLoanForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-muted-foreground">起始日 (YYYYMMDD)</label>
                          <input type="text" value={accountLoanForm.startDate}
                            onChange={e => setAccountLoanForm(f => ({ ...f, startDate: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-muted-foreground">本金</label>
                          <input type="number" value={accountLoanForm.principal}
                            onChange={e => setAccountLoanForm(f => ({ ...f, principal: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-muted-foreground">年利率 (%)</label>
                          <input type="number" step="0.1" value={accountLoanForm.annualRate}
                            onChange={e => setAccountLoanForm(f => ({ ...f, annualRate: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-muted-foreground">期數（月）</label>
                          <input type="number" value={accountLoanForm.periods}
                            onChange={e => setAccountLoanForm(f => ({ ...f, periods: e.target.value }))}
                            className="w-full mt-1 bg-secondary/50 rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="text-muted-foreground">月付</label>
                          <p className="mt-1 font-mono font-semibold text-sm">
                            {(() => {
                              const p = parseFloat(accountLoanForm.principal);
                              const r = parseFloat(accountLoanForm.annualRate) / 100;
                              const n = parseInt(accountLoanForm.periods);
                              if (!p || !r || !n) return "-";
                              if (accountLoanForm.loanType === "interest_only") return `$${Math.round(p * r / 12).toLocaleString()} (利息)`;
                              return `$${Math.round(computeMonthlyPayment(p, r, n)).toLocaleString()}`;
                            })()}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <label className="text-muted-foreground">類型</label>
                          <div className="flex gap-3 mt-1">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="acctLoanType" value="annuity" checked={accountLoanForm.loanType === "annuity"} onChange={() => setAccountLoanForm(f => ({ ...f, loanType: "annuity" }))} />
                              <span>等額本息</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="radio" name="acctLoanType" value="interest_only" checked={accountLoanForm.loanType === "interest_only"} onChange={() => setAccountLoanForm(f => ({ ...f, loanType: "interest_only" }))} />
                              <span>質押（只還利息）</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const p = parseFloat(accountLoanForm.principal);
                          const r = parseFloat(accountLoanForm.annualRate) / 100;
                          const n = parseInt(accountLoanForm.periods);
                          if (!accountLoanForm.name || !p || r == null || !n || !accountLoanForm.startDate) {
                            toast.error("請填寫完整");
                            return;
                          }
                          await createLoan({
                            simulationId: sim.id,
                            name: accountLoanForm.name,
                            principal: p,
                            annualRate: r,
                            periods: n,
                            startDate: accountLoanForm.startDate,
                            loanType: accountLoanForm.loanType,
                            notes: accountLoanForm.notes || null,
                          });
                          setShowAddForm(null);
                          setAccountLoanForm({ name: "", principal: "", annualRate: "", periods: "", startDate: todayTW(), loanType: "annuity", notes: "" });
                          getLoans(sim.id).then(setLoansList).catch(() => {});
                          listSimulations().then(sims => { if (sims[0]) setSim(sims[0]); }).catch(() => {});
                          toast.success("已新增貸款");
                        }}
                        className="mt-3 w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        新增
                      </button>
                    </Card>
                  )}
                </div>
              );
            })()}

            {/* ==================== STRATEGY TAB ==================== */}
            {activeTab === "strategy" && (() => {
              const strat = strategyList[0];
              if (!strat) return (
                <div className="px-4 pt-5">
                  <Card className="p-8 text-center">
                    <Crosshair className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">載入中…</p>
                  </Card>
                </div>
              );

              const isSaving = savingStrategy === strat.id;
              const sLev = computeLeverage(totalAdjustedStockValue, totalAdjustedValue, totalCurrentValue, strat.leverageLimit ?? 1.5, strat.leverageCap ?? null);
              const sEffectiveLeverageLimit = sLev.effectiveLeverageLimit;
              const sIsOverLeverage = sLev.isOverLeverage;
              const sLeveragePercent = sLev.leveragePercent;
              const sExposure = computeExposure(positions, totalAdjustedValue, totalAdjustedStockValue, totalCurrentValue, marketAdjust, strat.exposureTarget ?? 1.0, sEffectiveLeverageLimit);
              const sIsBetaOverLimit = sExposure.isBetaOverLimit;
              const sRebalance = computeRebalancing({
                ...sExposure,
                totalAdjustedValue,
                totalAdjustedStockValue,
                leverageLimit: sEffectiveLeverageLimit,
              });
              const { buyAmount: sBuyAmount, sellAmount: sSellAmount, swapAmount: sSwapAmount, isMixedMode: sIsMixedMode, isLeverageCapped: sIsLeverageCapped, isLeverageForced: sIsLeverageForced, isOnTarget: sIsOnTarget, projectedBetaExposure: sProjectedBetaExposure } = sRebalance;

              return (
                <div className="pb-24">
                  {/* 參數設定 */}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-5 pb-1.5">策略參數</p>
                  <Card className="p-4 space-y-3 mx-4">

                    {/* 槓桿倍數上限 */}
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5">槓桿倍數上限</p>
                      <div className="flex items-center gap-2">
                        <input type="range" min="1.0" max="5.0" step="0.1" value={strat.leverageLimit}
                          onChange={e => { const val = parseFloat(e.target.value); setStrategyList(prev => prev.map(s => s.id === strat.id ? { ...s, leverageLimit: val } : s)); }}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-secondary" />
                        <input type="number" min="0.1" max="10" step="0.1" value={strat.leverageLimit ?? 1.5}
                          onChange={e => { const val = parseFloat(e.target.value); if (!isNaN(val) && val >= 0.1) setStrategyList(prev => prev.map(s => s.id === strat.id ? { ...s, leverageLimit: val } : s)); }}
                          className="w-16 bg-secondary/50 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right border border-border focus:outline-none focus:ring-1 focus:ring-primary tabular-nums" />
                        <span className="text-[10px] text-muted-foreground">x</span>
                      </div>
                    </div>

                    {/* 槓桿金額上限 */}
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5">槓桿金額上限（股票市值上限）</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">$</span>
                        <input type="number" inputMode="numeric" placeholder="不限" value={strat.leverageCap ?? ""}
                          onChange={e => { const raw = e.target.value; if (raw === "") { setStrategyList(prev => prev.map(s => s.id === strat.id ? { ...s, leverageCap: null } : s)); return; } const val = parseFloat(raw); if (!isNaN(val) && val >= 0) setStrategyList(prev => prev.map(s => s.id === strat.id ? { ...s, leverageCap: val } : s)); }}
                          className="flex-1 bg-secondary/50 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-right border border-border focus:outline-none focus:ring-1 focus:ring-primary tabular-nums" />
                        {strat.leverageCap != null && (
                          <button onClick={() => setStrategyList(prev => prev.map(s => s.id === strat.id ? { ...s, leverageCap: null } : s))} className="p-1 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground" title="清除金額限制"><X size={12} /></button>
                        )}
                      </div>
                      {strat.leverageCap != null && totalAdjustedValue > 0 && (
                        <p className="text-[9px] text-muted-foreground mt-1">等同 {(strat.leverageCap / totalAdjustedValue).toFixed(2)}x 槓桿（以目前淨值計）</p>
                      )}
                    </div>

                    {/* 曝險目標 */}
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1.5">曝險目標</p>
                      <div className="flex items-center gap-2">
                        <input type="range" min="0" max="3.0" step="0.05" value={strat.exposureTarget}
                          onChange={e => { const val = parseFloat(e.target.value); setStrategyList(prev => prev.map(s => s.id === strat.id ? { ...s, exposureTarget: val } : s)); }}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-secondary" />
                        <input type="number" min="0" max="10" step="0.05" value={strat.exposureTarget}
                          onChange={e => { const val = parseFloat(e.target.value); if (!isNaN(val) && val >= 0) setStrategyList(prev => prev.map(s => s.id === strat.id ? { ...s, exposureTarget: val } : s)); }}
                          className="w-16 bg-secondary/50 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right border border-border focus:outline-none focus:ring-1 focus:ring-primary tabular-nums" />
                        <span className="text-[10px] text-primary font-bold w-10 text-right tabular-nums">{((strat.exposureTarget ?? 1) * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveStrategy(strat.id, { leverageLimit: strat.leverageLimit, leverageCap: strat.leverageCap, exposureTarget: strat.exposureTarget })}
                      disabled={isSaving}
                      className="w-full mt-1 px-3 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <RefreshCcw className="w-3 h-3 animate-spin mx-auto" /> : "儲存參數"}
                    </button>
                  </Card>

                  {/* 策略指標 */}
                  {positions.length > 0 && totalAdjustedValue > 0 && (
                    <>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-4 pb-1.5">當前指標</p>
                    <Card className="p-4 space-y-3 mx-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`rounded-xl p-2 text-center ${isInfiniteOrNegative ? "bg-destructive/10" : sIsOverLeverage ? "bg-warning/10" : "bg-success/10"}`}>
                          <p className="text-[9px] text-muted-foreground">槓桿率</p>
                          <p className={`text-lg font-bold font-mono tabular-nums ${isInfiniteOrNegative ? "text-destructive" : sIsOverLeverage ? "text-warning" : "text-success"}`}>
                            {isInfiniteOrNegative ? "∞" : `${portfolioLeverage.toFixed(2)}x`}
                          </p>
                        </div>
                        <div className={`rounded-xl p-2 text-center ${isInfiniteOrNegative ? "bg-destructive/10" : sIsBetaOverLimit ? "bg-warning/10" : "bg-primary/10"}`}>
                          <p className="text-[9px] text-muted-foreground">曝險率</p>
                          <p className={`text-lg font-bold font-mono tabular-nums ${isInfiniteOrNegative ? "text-destructive" : sIsBetaOverLimit ? "text-warning" : "text-primary"}`}>
                            {isInfiniteOrNegative || betaWeightedExposure === Infinity ? "∞" : `${(betaWeightedExposure * 100).toFixed(0)}%`}
                          </p>
                        </div>
                      </div>

                      <div className="relative h-1 bg-secondary rounded-full overflow-hidden mb-1">
                        <motion.div
                          className={`absolute left-0 top-0 h-full rounded-full ${isInfiniteOrNegative ? "bg-destructive" : sIsOverLeverage ? "bg-warning" : sLeveragePercent > 80 ? "bg-warning" : "bg-success"}`}
                          initial={{ width: 0 }} animate={{ width: `${Math.min(sLeveragePercent, 100)}%` }} transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
                        <span>0x</span>
                        <span>上限 {sEffectiveLeverageLimit.toFixed(1)}x{strat.leverageCap != null && ` / $${Math.round(strat.leverageCap).toLocaleString()}`}</span>
                      </div>

                      <div className={`rounded-xl p-3 ${sIsOnTarget ? "bg-success/10" : sExposure.betaGapValue > 0 ? "bg-primary/10" : "bg-warning/10"}`}>
                        <p className={`text-xs font-semibold mb-1 ${sIsOnTarget ? "text-success" : sExposure.betaGapValue > 0 ? "text-primary" : "text-warning"}`}>
                          {sIsOnTarget ? "✓ 已達目標" : sExposure.betaGapValue > 0 ? sIsMixedMode ? `▲ 加碼 $${sBuyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} + 換倉 $${sSwapAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `▲ 建議加碼 $${sBuyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `▼ 建議減碼 $${sSellAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        </p>
                        {sIsLeverageForced && <p className="text-[10px] text-destructive">⚠ 槓桿超限，需減碼 ${sSellAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>}
                        {sIsMixedMode && <p className="text-[10px] text-warning">⚠ 槓桿滿，改以換倉補足</p>}
                        {sIsLeverageCapped && !sIsMixedMode && <p className="text-[10px] text-warning">⚠ 受槓桿上限限制</p>}
                        {!sIsOnTarget && (
                          <div className="flex items-center gap-1 mt-2 py-1 px-2 rounded-lg bg-muted text-[10px]">
                            <div className="text-center flex-1"><p className="text-muted-foreground">目前</p><p className="font-mono font-bold text-muted-foreground">{betaWeightedExposure === Infinity ? "∞" : `${(betaWeightedExposure * 100).toFixed(0)}%`}</p></div>
                            <span className={sExposure.betaGapValue > 0 ? "text-primary" : "text-warning"}>→</span>
                            <div className="text-center flex-1"><p className="text-muted-foreground">預計</p><p className={`font-mono font-bold ${sExposure.betaGapValue > 0 ? "text-primary" : "text-warning"}`}>{`${(sProjectedBetaExposure * 100).toFixed(0)}%`}</p></div>
                            <span className="text-muted-foreground/30">→</span>
                            <div className="text-center flex-1"><p className="text-muted-foreground">目標</p><p className="font-mono font-bold text-primary">{`${((strat.exposureTarget ?? 1.0) * 100).toFixed(0)}%`}</p></div>
                          </div>
                        )}
                      </div>
                    </Card>
                    </>
                  )}
                </div>
              );
            })()}

            {/* ==================== TRADES TAB ==================== */}
            {activeTab === "trades" && (
              <div className="px-4 pt-5 pb-28 space-y-4">
                {/* View toggle + sub-tab switcher */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-muted rounded-xl p-1 flex-1">
                    {(["all", "stock", "options", "loans", "cash", "market_value"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTradesSubTab(t)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          tradesSubTab === t
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t === "all" ? "全部" : t === "stock" ? "股票" : t === "options" ? "選擇權" : t === "loans" ? "貸款" : t === "cash" ? "收支" : "市值"}
                      </button>
                    ))}
                  </div>
                  {/* List / Calendar toggle */}
                  <button
                    onClick={() => { setTradesView(v => v === "list" ? "calendar" : "list"); setCalendarSelectedDate(null); }}
                    className={`p-2 rounded-xl transition-colors shrink-0 ${tradesView === "calendar" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                  >
                    {tradesView === "calendar" ? <List className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openTradesAddForm(
                      tradesSubTab === "options" ? "options" : tradesSubTab === "loans" ? "loan" : tradesSubTab === "cash" ? "cash" : "stock",
                      tradesView === "calendar" ? calendarSelectedDate ?? undefined : undefined
                    )}
                    className="p-2 rounded-xl bg-primary text-white transition-colors shrink-0 hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowSystemEvents(v => !v)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${showSystemEvents ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {showSystemEvents ? "隱藏系統事件" : "顯示系統事件"}
                  </button>
                </div>

                {/* ── ALL / STOCK / OPTIONS SUB-TABS (unified trade list) ── */}
                {(tradesSubTab === "all" || tradesSubTab === "stock" || tradesSubTab === "options" || tradesSubTab === "loans" || tradesSubTab === "market_value") && (() => {
                  // Build unified trade list
                  const CASH_LABEL = "現金";
                  const optRows: UnifiedRow[] = optionsTrades.map(t => {
                    const contract = `${t.callPut} ${t.strikePrice.toLocaleString()} ${t.contractMonth}`;
                    return {
                      id: `opt-${t.id}`, type: "options", date: t.tradeDate, action: t.action,
                      from: t.action === "SELL" ? contract : CASH_LABEL,
                      to:   t.action === "SELL" ? CASH_LABEL : contract,
                      price: t.price, qty: t.quantity, fee: t.fee, deletable: true, source: "user" as const,
                    };
                  });
                  const stkRows: UnifiedRow[] = stockTradesList.map(t => ({
                    id: `stk-${t.id}`, type: "stock", date: t.tradeDate, action: t.action,
                    from: t.action === "SELL" ? t.symbol : CASH_LABEL,
                    to:   t.action === "SELL" ? CASH_LABEL : t.symbol,
                    price: t.price, qty: t.quantity, fee: t.fee, deletable: true, source: "user" as const,
                  }));
                  const loanRows: UnifiedRow[] = loansList.flatMap(loan => {
                    const payments = loanPaymentsMap[loan.id] ?? [];
                    return [
                      {
                        id: `loan-${loan.id}-in`, type: "loan" as const, date: loan.startDate,
                        action: "LOAN_IN", from: loan.name, to: CASH_LABEL,
                        price: loan.principal, qty: 1, fee: 0, deletable: true, source: "user" as const,
                      },
                      ...payments.flatMap(p => {
                        if (p.principalPortion != null && p.interestPortion != null) {
                          // interest_only: principalPortion = 0，只顯示利息支出
                          if (p.principalPortion === 0) {
                            return [{
                              id: `lp-${p.id}`, type: "loan" as const, date: p.paymentDate,
                              action: "INTEREST_OUT", from: CASH_LABEL, to: loan.name,
                              price: p.interestPortion, qty: 1, fee: 0, deletable: true, source: "user" as const,
                            }];
                          }
                          // annuity: 本金還款 + 利息支出各一行
                          return [
                            {
                              id: `lp-${p.id}`, type: "loan" as const, date: p.paymentDate,
                              action: "LOAN_PAY", from: CASH_LABEL, to: loan.name,
                              price: p.principalPortion, qty: 1, fee: 0, deletable: true, source: "user" as const,
                            },
                            {
                              id: `lp-${p.id}-i`, type: "loan" as const, date: p.paymentDate,
                              action: "INTEREST_OUT", from: CASH_LABEL, to: loan.name,
                              price: p.interestPortion, qty: 1, fee: 0, deletable: false, source: "user" as const,
                            },
                          ];
                        }
                        // 舊資料（未拆分）：維持單一 LOAN_PAY 行
                        return [{
                          id: `lp-${p.id}`, type: "loan" as const, date: p.paymentDate,
                          action: "LOAN_PAY", from: CASH_LABEL, to: loan.name,
                          price: p.amount, qty: 1, fee: 0, deletable: true, source: "user" as const,
                        }];
                      }),
                    ];
                  });
                  // 市值損益（未實現，無現金流，系統生成）
                  const mvRows: UnifiedRow[] = positions
                    .filter(pos => pos.costBasis > 0 && pos.currentPrice > 0)
                    .map(pos => {
                      const pnl = (pos.currentPrice - pos.costBasis) * pos.shares;
                      const dateStr = pos.priceUpdatedAt
                        ? pos.priceUpdatedAt.replace(/-/g, "").slice(0, 8)
                        : todayTW();
                      return {
                        id: `mv-${pos.symbol}`, type: "market_value" as const, date: dateStr,
                        action: pnl >= 0 ? "MARKET_GAIN" : "MARKET_LOSS",
                        from: pnl >= 0 ? "浮動損益" : pos.symbol,
                        to:   pnl >= 0 ? pos.symbol   : "浮動損益",
                        price: pos.currentPrice - pos.costBasis,
                        qty: pos.shares,
                        fee: 0, deletable: false, source: "system" as const,
                      };
                    });

                  const cashRows: UnifiedRow[] = cashEventsList.map(e => ({
                    id: `cash-${e.id}`,
                    type: "cash" as const,
                    date: e.tradeDate,
                    action: e.action,
                    from: CASH_ACTIONS[e.action as CashAction]?.direction === "in" ? e.action : "現金",
                    to: CASH_ACTIONS[e.action as CashAction]?.direction === "in" ? "現金" : e.action,
                    price: e.amount,
                    qty: 1,
                    fee: 0,
                    deletable: true,
                    source: "user" as const,
                  }));
                  const _tab = tradesSubTab as string;
                  const typeFilter = _tab === "stock" ? "stock"
                    : _tab === "options" ? "options"
                    : _tab === "loans" ? "loan"
                    : _tab === "market_value" ? "market_value"
                    : _tab === "cash" ? "cash"
                    : null;
                  const allRows = [...optRows, ...stkRows, ...loanRows, ...cashRows, ...mvRows]
                    .filter(r => (showSystemEvents || r.source === "user") && (!typeFilter || r.type === typeFilter))
                    .sort((a, b) => b.date.localeCompare(a.date));


                  // ── Calendar view ────────────────────────────────────────
                  if (tradesView === "calendar") {
                    const year = parseInt(calendarYM.slice(0, 4));
                    const month = parseInt(calendarYM.slice(4, 6)); // 1-based
                    const daysInMonth = new Date(year, month, 0).getDate();
                    const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
                    const today = todayTW(); // YYYYMMDD
                    // dates with transactions in allRows
                    const datesWithTx = new Set(allRows.map(r => r.date));
                    const prevMonth = () => {
                      const d = new Date(year, month - 2, 1);
                      setCalendarYM(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
                      setCalendarSelectedDate(null);
                    };
                    const nextMonth = () => {
                      const d = new Date(year, month, 1);
                      setCalendarYM(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
                      setCalendarSelectedDate(null);
                    };
                    const selectedRows = calendarSelectedDate
                      ? allRows.filter(r => r.date === calendarSelectedDate)
                      : [];
                    // Build calendar grid (pad leading empty cells)
                    const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                    // pad trailing to complete last row
                    while (cells.length % 7 !== 0) cells.push(null);
                    return (
                      <div className="space-y-3">
                        <Card className="overflow-hidden p-0">
                          {/* Month navigation */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors">
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-semibold">{year} 年 {month} 月</span>
                            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground transition-colors">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Day headers */}
                          <div className="grid grid-cols-7 px-2 pt-2">
                            {["日","一","二","三","四","五","六"].map((d, i) => (
                              <div key={d} className={`text-center text-[11px] font-medium py-1 ${i === 0 ? "text-destructive/70" : i === 6 ? "text-primary/70" : "text-muted-foreground"}`}>{d}</div>
                            ))}
                          </div>
                          {/* Calendar grid */}
                          <div className="grid grid-cols-7 px-2 pb-3">
                            {cells.map((day, idx) => {
                              if (day === null) return <div key={`empty-${idx}`} />;
                              const dateStr = `${year}${String(month).padStart(2,"0")}${String(day).padStart(2,"0")}`;
                              const isToday = dateStr === today;
                              const isSelected = dateStr === calendarSelectedDate;
                              const hasTx = datesWithTx.has(dateStr);
                              const dow = (firstDow + day - 1) % 7;
                              const dayColor = dow === 0 ? "text-destructive" : dow === 6 ? "text-primary" : "text-foreground";
                              return (
                                <button
                                  key={dateStr}
                                  onClick={() => setCalendarSelectedDate(v => v === dateStr ? null : dateStr)}
                                  className={`relative flex flex-col items-center justify-center h-9 rounded-xl transition-colors ${
                                    isSelected ? "bg-primary text-white" :
                                    isToday ? "border border-primary" :
                                    "hover:bg-secondary/60"
                                  }`}
                                >
                                  <span className={`text-[13px] font-medium leading-none ${isSelected ? "text-white" : isToday ? "text-primary" : dayColor}`}>{day}</span>
                                  {hasTx && !isSelected && (
                                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday ? "bg-primary" : "bg-muted-foreground/50"}`} />
                                  )}
                                  {hasTx && isSelected && (
                                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white/60" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </Card>

                        {/* Selected date transactions */}
                        {calendarSelectedDate && (
                          <Card className="overflow-hidden p-0">
                            <div className="px-4 py-2.5 border-b border-border/60">
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{selectedRows.length} 筆</p>
                            </div>
                            {selectedRows.length === 0 ? (
                              <div className="px-4 py-6 text-center">
                                <p className="text-sm text-muted-foreground">當日無交易記錄</p>
                              </div>
                            ) : (
                              <div>
                                {selectedRows.map((r, idx) => {
                                  const total = getTradeAmount(r);
                                  const isSigned = r.type === "market_value";
                                  const amountColor = isSigned ? (total >= 0 ? "text-success" : "text-destructive") : (r.action === "LOAN_IN" ? "text-success" : "");
                                  const qtyLabel = r.type === "stock" ? `${r.qty.toLocaleString()} 股` : r.type === "options" ? `${r.qty.toLocaleString()} 口` : r.type === "market_value" ? `${r.qty.toLocaleString()} 股` : "";
                                  const rowSymbol = (r.type === "stock" || r.type === "market_value") ? (r.to !== "現金" ? r.to : r.from) : undefined;
                                  const rowType = r.type === "stock" ? "stock" : r.type === "options" ? "options" : r.type === "loan" ? "loan" : "stock";
                                  return (
                                    <div key={r.id} className={`flex items-center px-4 py-3 ${idx < selectedRows.length - 1 ? "border-b border-border/60" : ""}`}>
                                      <button
                                        onClick={() => openTradesAddForm(rowType as "stock" | "options" | "loan", r.date, rowSymbol)}
                                        className={`w-9 h-9 rounded-[10px] ${getTradeIconBg(r)} flex items-center justify-center shrink-0 mr-3.5 hover:opacity-70 transition-opacity`}
                                        title="點擊以此為基礎新增交易"
                                      >
                                        {getTradeIcon(r)}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[15px] font-medium truncate">{r.type === "cash" ? cashActionLabel(r.action as CashAction) : r.type === "stock" || r.type === "market_value" ? r.to !== "現金" ? r.to : r.from : r.type === "options" ? r.to !== "現金" ? r.to : r.from : r.to !== "現金" ? r.to : r.from}</span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                                            r.action === "BUY" ? "bg-blue-500/15 text-blue-400" :
                                            r.action === "SELL" ? "bg-green-500/15 text-green-400" :
                                            r.action === "LOAN_IN" ? "bg-orange-500/15 text-orange-400" :
                                            r.action === "INTEREST_OUT" ? "bg-destructive/15 text-destructive" :
                                            r.action === "MARKET_GAIN" ? "bg-success/15 text-success" :
                                            "bg-muted text-muted-foreground"
                                          }`}>
                                            {r.action === "BUY" ? "買入" : r.action === "SELL" ? "賣出" : r.action === "LOAN_IN" ? "貸款" : r.action === "LOAN_PAY" ? "還本" : r.action === "INTEREST_OUT" ? "利息" : r.action === "MARKET_GAIN" ? "浮盈" : r.action === "MARKET_LOSS" ? "浮虧" : r.action}
                                          </span>
                                        </div>
                                        {qtyLabel && <p className="text-[11px] text-muted-foreground mt-0.5">{qtyLabel}{r.price > 0 ? ` @ $${r.price.toLocaleString()}` : ""}</p>}
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <p className={`text-[15px] font-semibold font-mono ${amountColor}`}>
                                          {isSigned ? (total >= 0 ? "+" : "") : ""}${Math.abs(total).toLocaleString()}
                                        </p>
                                        {r.fee > 0 && <p className="text-[10px] text-muted-foreground font-mono">費${r.fee.toLocaleString()}</p>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </Card>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Unified trade list */}
                      {allRows.length > 0 ? (
                        <Card className="overflow-hidden p-0">
                          <div className="px-4 py-3 border-b border-border/60">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                              交易明細（{allRows.length} 筆）
                            </p>
                          </div>
                          <div>
                            {allRows.map((r, idx) => {
                              const isEditing = editingTradeId === r.id;
                              const total = getTradeAmount(r);
                              const isSigned = r.type === "market_value";
                              const cashDir = r.type === "cash" ? CASH_ACTIONS[r.action as CashAction]?.direction : undefined;
                              const amountColor = isSigned ? (total >= 0 ? "text-success" : "text-destructive") : r.type === "cash" ? (cashDir === "in" ? "text-success" : "text-destructive") : (r.action === "LOAN_IN" ? "text-success" : "");
                              const qtyLabel = r.type === "stock" ? `${r.qty.toLocaleString()} 股` : r.type === "options" ? `${r.qty.toLocaleString()} 口` : r.type === "market_value" ? `${r.qty.toLocaleString()} 股` : "";
                              return (
                                <React.Fragment key={r.id}>
                                <div className={`${idx < allRows.length - 1 ? "border-b border-border/60" : ""}`}>
                                  <div className="flex items-center px-4 py-3 hover:bg-secondary/20 transition-colors">
                                    <div className={`w-9 h-9 rounded-[10px] ${getTradeIconBg(r)} flex items-center justify-center shrink-0 mr-3.5`}>
                                      {getTradeIcon(r)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[15px] font-medium truncate">{r.type === "cash" ? cashActionLabel(r.action as CashAction) : r.type === "stock" || r.type === "market_value" ? r.to !== "現金" ? r.to : r.from : r.type === "options" ? r.to !== "現金" ? r.to : r.from : r.to !== "現金" ? r.to : r.from}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                                          r.action === "BUY" ? "bg-blue-500/15 text-blue-400" :
                                          r.action === "SELL" ? "bg-green-500/15 text-green-400" :
                                          r.action === "LOAN_IN" ? "bg-orange-500/15 text-orange-400" :
                                          r.action === "INTEREST_OUT" ? "bg-destructive/15 text-destructive" :
                                          r.action === "MARKET_GAIN" ? "bg-success/15 text-success" :
                                          r.action === "MARKET_LOSS" ? "bg-destructive/15 text-destructive" :
                                          "bg-muted text-muted-foreground"
                                        }`}>{getTradeActionLabel(r)}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground font-mono">{r.date.slice(0,4)}/{r.date.slice(4,6)}/{r.date.slice(6,8)}{qtyLabel ? ` · ${qtyLabel}` : ""}{r.fee > 0 ? ` · 費$${r.fee.toLocaleString()}` : ""}</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                      <p className={`text-sm font-mono font-semibold ${amountColor}`}>
                                        {isSigned && total >= 0 ? "+" : ""}{isSigned ? "" : r.type === "cash" ? (cashDir === "in" ? "+" : "-") : (r.action === "LOAN_IN" ? "+" : r.action === "SELL" ? "+" : "-")}${Math.round(Math.abs(total)).toLocaleString()}
                                      </p>
                                    </div>
                                    {r.deletable && (
                                      <button
                                        onClick={() => {
                                          if (editingTradeId === r.id) { setEditingTradeId(null); return; }
                                          setEditingTradeId(r.id);
                                          const parts = r.id.split("-");
                                          const type = parts[0];
                                          const numId = Number(parts[1]);
                                          if (type === "opt") {
                                            const t = optionsTrades.find(x => x.id === numId);
                                            if (t) setEditTradeForm({ date: t.tradeDate, action: t.action as "BUY" | "SELL", price: String(t.price), qty: String(t.quantity), fee: String(t.fee), symbol: "", contractMonth: t.contractMonth, callPut: t.callPut as "C" | "P", strikePrice: String(t.strikePrice) });
                                          } else if (type === "stk") {
                                            const t = stockTradesList.find(x => x.id === numId);
                                            if (t) setEditTradeForm({ date: t.tradeDate, action: t.action as "BUY" | "SELL", price: String(t.price), qty: String(t.quantity), fee: String(t.fee), symbol: t.symbol, contractMonth: "", callPut: "C", strikePrice: "" });
                                          } else if (type === "lp") {
                                            const p = Object.values(loanPaymentsMap).flat().find(x => x.id === numId);
                                            if (p) setEditPaymentForm({ paymentDate: p.paymentDate, amount: String(p.amount), principal: String(p.principalPortion ?? ""), interest: String(p.interestPortion ?? ""), notes: p.notes ?? "" });
                                          } else if (type === "loan") {
                                            const loan = loansList.find(x => x.id === numId);
                                            if (loan) setEditLoanForm({ name: loan.name, principal: String(loan.principal), annualRate: String((loan.annualRate * 100).toFixed(2)), periods: String(loan.periods), startDate: loan.startDate, loanType: (loan.loanType ?? "annuity") as "annuity" | "interest_only", notes: loan.notes ?? "" });
                                          }
                                        }}
                                        className={`ml-3 p-1.5 rounded-lg transition-colors ${isEditing ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                  {isEditing && (() => {
                                    const rowType = r.id.split("-")[0];
                                    const numId = Number(r.id.split("-")[1]);
                                    const fieldCls = "w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary text-xs";
                                    // cash rows: just show delete confirm
                                    if (rowType === "cash") return (
                                      <div className="bg-destructive/5 border-t border-destructive/20 px-4 py-3 flex items-center justify-between">
                                        <p className="text-xs text-destructive">確認刪除此筆收支紀錄？</p>
                                        <div className="flex gap-2">
                                          <button onClick={() => setEditingTradeId(null)} className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground">取消</button>
                                          <button onClick={async () => {
                                            try {
                                              await deleteCashEvent(numId);
                                              setCashEventsList(prev => prev.filter(x => x.id !== numId));
                                              setEditingTradeId(null);
                                              toast.success("已刪除");
                                            } catch { toast.error("刪除失敗"); }
                                          }} className="text-xs px-3 py-1.5 rounded-lg bg-destructive text-white font-semibold">刪除</button>
                                        </div>
                                      </div>
                                    );
                                    return (
                                      <div className="bg-muted/20 border-t border-primary/20 px-4 py-3">
                                        <div className="space-y-2 text-xs">

                                            {/* ── 貸款入帳 (loan) ── */}
                                            {rowType === "loan" && (
                                              <>
                                                <div className="grid grid-cols-2 gap-2">
                                                  <div>
                                                    <label className="text-muted-foreground">貸款名稱</label>
                                                    <input value={editLoanForm.name} onChange={e => setEditLoanForm(f => ({ ...f, name: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">起始日 (YYYYMMDD)</label>
                                                    <input value={editLoanForm.startDate} onChange={e => setEditLoanForm(f => ({ ...f, startDate: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                  <div>
                                                    <label className="text-muted-foreground">本金</label>
                                                    <input type="number" value={editLoanForm.principal} onChange={e => setEditLoanForm(f => ({ ...f, principal: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">年利率（%）</label>
                                                    <input type="number" step="0.01" value={editLoanForm.annualRate} onChange={e => setEditLoanForm(f => ({ ...f, annualRate: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">期數（月）</label>
                                                    <input type="number" value={editLoanForm.periods} onChange={e => setEditLoanForm(f => ({ ...f, periods: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                </div>
                                                <div className="flex gap-3 text-xs">
                                                  {(["annuity", "interest_only"] as const).map(lt => (
                                                    <label key={lt} className="flex items-center gap-1 cursor-pointer">
                                                      <input type="radio" name={`editLoanType-${r.id}`} checked={editLoanForm.loanType === lt} onChange={() => setEditLoanForm(f => ({ ...f, loanType: lt }))} />
                                                      {lt === "annuity" ? "等額本息" : "質押（只還利息）"}
                                                    </label>
                                                  ))}
                                                </div>
                                                <div>
                                                  <label className="text-muted-foreground">備註</label>
                                                  <input value={editLoanForm.notes} onChange={e => setEditLoanForm(f => ({ ...f, notes: e.target.value }))} className={fieldCls} />
                                                </div>
                                              </>
                                            )}

                                            {/* ── 還款紀錄 (lp) ── */}
                                            {rowType === "lp" && (
                                              <>
                                                <div className="grid grid-cols-2 gap-2">
                                                  <div className="col-span-2">
                                                    <label className="text-muted-foreground">還款日 (YYYYMMDD)</label>
                                                    <input value={editPaymentForm.paymentDate} onChange={e => setEditPaymentForm(f => ({ ...f, paymentDate: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">本金</label>
                                                    <input type="number" value={editPaymentForm.principal} onChange={e => setEditPaymentForm(f => ({ ...f, principal: e.target.value, amount: String((Number(e.target.value) || 0) + (Number(f.interest) || 0)) }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">利息</label>
                                                    <input type="number" value={editPaymentForm.interest} onChange={e => setEditPaymentForm(f => ({ ...f, interest: e.target.value, amount: String((Number(f.principal) || 0) + (Number(e.target.value) || 0)) }))} className={fieldCls} />
                                                  </div>
                                                  <div className="col-span-2">
                                                    <label className="text-muted-foreground">總計（自動）</label>
                                                    <input readOnly value={editPaymentForm.amount} className={`${fieldCls} text-muted-foreground`} />
                                                  </div>
                                                </div>
                                                <div>
                                                  <label className="text-muted-foreground">備註</label>
                                                  <input value={editPaymentForm.notes} onChange={e => setEditPaymentForm(f => ({ ...f, notes: e.target.value }))} className={fieldCls} />
                                                </div>
                                              </>
                                            )}

                                            {/* ── 股票 / 選擇權 ── */}
                                            {(rowType === "opt" || rowType === "stk") && (
                                              <>
                                                <div className="flex gap-1">
                                                  {(["BUY", "SELL"] as const).map(a => (
                                                    <button key={a} onClick={() => setEditTradeForm(f => ({ ...f, action: a }))}
                                                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${editTradeForm.action === a ? (a === "BUY" ? "bg-success/20 text-success border border-success/40" : "bg-destructive/20 text-destructive border border-destructive/40") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                                                      {a === "BUY" ? "買" : "賣"}
                                                    </button>
                                                  ))}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                  <div>
                                                    <label className="text-muted-foreground">日期</label>
                                                    <input value={editTradeForm.date} onChange={e => setEditTradeForm(f => ({ ...f, date: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">價格</label>
                                                    <input type="number" value={editTradeForm.price} onChange={e => setEditTradeForm(f => ({ ...f, price: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">{rowType === "opt" ? "口數" : "股數"}</label>
                                                    <input type="number" value={editTradeForm.qty} onChange={e => setEditTradeForm(f => ({ ...f, qty: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  <div>
                                                    <label className="text-muted-foreground">手續費</label>
                                                    <input type="number" value={editTradeForm.fee} onChange={e => setEditTradeForm(f => ({ ...f, fee: e.target.value }))} className={fieldCls} />
                                                  </div>
                                                  {rowType === "opt" && (
                                                    <>
                                                      <div>
                                                        <label className="text-muted-foreground">合約月</label>
                                                        <input value={editTradeForm.contractMonth} onChange={e => setEditTradeForm(f => ({ ...f, contractMonth: e.target.value }))} className={fieldCls} />
                                                      </div>
                                                      <div>
                                                        <label className="text-muted-foreground">履約價</label>
                                                        <input type="number" value={editTradeForm.strikePrice} onChange={e => setEditTradeForm(f => ({ ...f, strikePrice: e.target.value }))} className={fieldCls} />
                                                      </div>
                                                    </>
                                                  )}
                                                  {rowType === "stk" && (
                                                    <div>
                                                      <label className="text-muted-foreground">代號</label>
                                                      <input value={editTradeForm.symbol} onChange={e => setEditTradeForm(f => ({ ...f, symbol: e.target.value }))} className={fieldCls} />
                                                    </div>
                                                  )}
                                                </div>
                                                {rowType === "opt" && (
                                                  <div className="flex gap-1">
                                                    {(["C", "P"] as const).map(cp => (
                                                      <button key={cp} onClick={() => setEditTradeForm(f => ({ ...f, callPut: cp }))}
                                                        className={`px-3 py-1 rounded-lg font-medium transition-colors ${editTradeForm.callPut === cp ? (cp === "C" ? "bg-success/20 text-success border border-success/40" : "bg-destructive/20 text-destructive border border-destructive/40") : "bg-secondary text-muted-foreground border border-transparent"}`}>
                                                        {cp === "C" ? "Call" : "Put"}
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </>
                                            )}

                                            {/* ── 儲存 / 取消 ── */}
                                            <div className="flex gap-2">
                                              <button
                                                onClick={async () => {
                                                  try {
                                                    if (rowType === "loan") {
                                                      const updated = await updateLoan(numId, {
                                                        name: editLoanForm.name,
                                                        principal: Number(editLoanForm.principal),
                                                        annualRate: Number(editLoanForm.annualRate) / 100,
                                                        periods: Number(editLoanForm.periods),
                                                        startDate: editLoanForm.startDate,
                                                        loanType: editLoanForm.loanType,
                                                        notes: editLoanForm.notes || null,
                                                      });
                                                      setLoansList(prev => prev.map(x => x.id === numId ? updated : x));
                                                    } else if (rowType === "lp") {
                                                      const principalPortion = editPaymentForm.principal !== "" ? Number(editPaymentForm.principal) : null;
                                                      const interestPortion = editPaymentForm.interest !== "" ? Number(editPaymentForm.interest) : null;
                                                      const updated = await updateLoanPayment(numId, {
                                                        paymentDate: editPaymentForm.paymentDate,
                                                        amount: Number(editPaymentForm.amount),
                                                        principalPortion,
                                                        interestPortion,
                                                        notes: editPaymentForm.notes || null,
                                                      });
                                                      setLoanPaymentsMap(prev => {
                                                        const next = { ...prev };
                                                        for (const lid of Object.keys(next)) {
                                                          next[Number(lid)] = next[Number(lid)].map(p => p.id === numId ? updated : p);
                                                        }
                                                        return next;
                                                      });
                                                    } else if (rowType === "opt") {
                                                      const updated = await updateOptionsTrade(numId, {
                                                        tradeDate: editTradeForm.date,
                                                        action: editTradeForm.action,
                                                        contractMonth: editTradeForm.contractMonth,
                                                        callPut: editTradeForm.callPut,
                                                        strikePrice: Number(editTradeForm.strikePrice),
                                                        price: Number(editTradeForm.price),
                                                        quantity: Number(editTradeForm.qty),
                                                        fee: Number(editTradeForm.fee),
                                                      });
                                                      setOptionsTrades(prev => prev.map(x => x.id === numId ? updated : x));
                                                    } else if (rowType === "stk") {
                                                      const updated = await updateStockTrade(numId, {
                                                        tradeDate: editTradeForm.date,
                                                        action: editTradeForm.action,
                                                        symbol: editTradeForm.symbol,
                                                        price: Number(editTradeForm.price),
                                                        quantity: Number(editTradeForm.qty),
                                                        fee: Number(editTradeForm.fee),
                                                      });
                                                      setStockTradesList(prev => prev.map(x => x.id === numId ? updated : x));
                                                    }
                                                    setEditingTradeId(null);
                                                    toast.success("已更新");
                                                  } catch { toast.error("更新失敗"); }
                                                }}
                                                className="flex-1 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                                              >
                                                儲存
                                              </button>
                                              <button onClick={async () => {
                                                const parts = r.id.split("-");
                                                const type = parts[0];
                                                const numId = Number(parts[1]);
                                                try {
                                                  if (type === "opt") { await deleteOptionsTrade(numId); setOptionsTrades(prev => prev.filter(x => x.id !== numId)); }
                                                  else if (type === "lp") { await deleteLoanPayment(numId); setLoanPaymentsMap(prev => { const next = { ...prev }; for (const lid of Object.keys(next)) { next[Number(lid)] = next[Number(lid)].filter(p => p.id !== numId); } return next; }); }
                                                  else if (type === "loan") { await deleteLoan(numId); setLoansList(prev => prev.filter(x => x.id !== numId)); setLoanPaymentsMap(prev => { const next = { ...prev }; delete next[numId]; return next; }); }
                                                  else if (type === "stk") { await deleteStockTrade(numId); setStockTradesList(prev => prev.filter(x => x.id !== numId)); }
                                                  else if (type === "cash") { await deleteCashEvent(numId); setCashEventsList(prev => prev.filter(x => x.id !== numId)); }
                                                  setEditingTradeId(null); toast.success("已刪除");
                                                } catch { toast.error("刪除失敗"); }
                                              }} className="px-4 py-1.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
                                                刪除
                                              </button>
                                              <button onClick={() => setEditingTradeId(null)} className="px-4 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-medium hover:bg-muted transition-colors">
                                                取消
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                    );
                                  })()}
                                </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </Card>
                      ) : (
                        <Card className="p-10 text-center">
                          <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                          <p className="text-sm text-muted-foreground">尚無交易紀錄</p>
                          <p className="text-xs text-muted-foreground mt-1">點擊「新增交易」開始記錄</p>
                        </Card>
                      )}
                    </div>
                  );
                })()}


                {/* ── LOAN MANAGEMENT (shown in loans sub-tab) ── */}
                {tradesSubTab === "loans" && loansList.length > 0 && (
                  <Card className="overflow-hidden p-0">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        貸款管理（{loansList.length} 筆）
                      </p>
                    </div>
                    <div className="divide-y divide-border">
                      {loansList.map((loan) => {
                        const schedule = generateLoanSchedule(loan as import("@/shared/types").Loan, loanRateEventsMap[loan.id] ?? [], loanPaymentsMap[loan.id] as import("@/shared/types").LoanPayment[] ?? []);
                        const totalPaid = loanTotalPaidMap[loan.id] ?? 0;
                        const remaining = computeRemainingBalance(loan as import("@/shared/types").Loan, totalPaid);
                        const monthly = loan.loanType === "interest_only"
                          ? remaining * loan.annualRate / 12
                          : computeMonthlyPayment(loan.principal, loan.annualRate, loan.periods);
                        const totalInterest = schedule.reduce((s, inst) => s + inst.interestPortion, 0);
                        return (
                          <div key={loan.id} className="border-b border-border last:border-0">
                            <div className="px-4 py-3 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-sm font-semibold">{loan.name}</p>
                                <div className="flex gap-3 text-[11px] text-muted-foreground font-mono">
                                  <span>本金 ${loan.principal.toLocaleString()}</span>
                                  <span>{(loan.annualRate * 100).toFixed(1)}%</span>
                                  <span>{loan.periods}期</span>
                                  <span>月付 ${Math.round(monthly).toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  起始 {loan.startDate.slice(0, 4)}/{loan.startDate.slice(4, 6)}/{loan.startDate.slice(6, 8)} ・ 總利息 ${totalInterest.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    if (editingLoanId === loan.id) { setEditingLoanId(null); return; }
                                    setEditingLoanId(loan.id);
                                    setEditLoanForm({ name: loan.name, principal: String(loan.principal), annualRate: String((loan.annualRate * 100).toFixed(2)), periods: String(loan.periods), startDate: loan.startDate, loanType: (loan.loanType ?? "annuity") as "annuity" | "interest_only", notes: loan.notes ?? "" });
                                  }}
                                  className={`p-1 transition-colors ${editingLoanId === loan.id ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm({ label: `確定刪除貸款「${loan.name}」？`, onConfirm: async () => {
                                    try {
                                      await deleteLoan(loan.id);
                                      setLoansList(prev => prev.filter(l => l.id !== loan.id));
                                      listSimulations().then(sims => { if (sims.length > 0) setSim(sims[0]); }).catch(() => {});
                                      toast.success("貸款已刪除");
                                    } catch { toast.error("刪除失敗"); }
                                  }})}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            {editingLoanId === loan.id && (
                              <div className="px-4 pb-4 space-y-2 text-xs border-t border-primary/20 bg-muted/20">
                                <div className="grid grid-cols-2 gap-2 pt-3">
                                  <div className="col-span-2">
                                    <label className="text-muted-foreground">名稱</label>
                                    <input value={editLoanForm.name} onChange={e => setEditLoanForm(f => ({ ...f, name: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                                  </div>
                                  <div>
                                    <label className="text-muted-foreground">本金</label>
                                    <input type="number" value={editLoanForm.principal} onChange={e => setEditLoanForm(f => ({ ...f, principal: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                                  </div>
                                  <div>
                                    <label className="text-muted-foreground">年利率 (%)</label>
                                    <input type="number" step="0.01" value={editLoanForm.annualRate} onChange={e => setEditLoanForm(f => ({ ...f, annualRate: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                                  </div>
                                  <div>
                                    <label className="text-muted-foreground">期數</label>
                                    <input type="number" value={editLoanForm.periods} onChange={e => setEditLoanForm(f => ({ ...f, periods: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                                  </div>
                                  <div>
                                    <label className="text-muted-foreground">起始日</label>
                                    <input value={editLoanForm.startDate} onChange={e => setEditLoanForm(f => ({ ...f, startDate: e.target.value }))}
                                      className="w-full mt-1 bg-background rounded-lg px-2 py-1.5 font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-muted-foreground">類型</label>
                                    <div className="flex gap-4 mt-1">
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name={`editLoanType2-${loan.id}`} value="annuity" checked={editLoanForm.loanType === "annuity"} onChange={() => setEditLoanForm(f => ({ ...f, loanType: "annuity" }))} />
                                        <span>等額本息</span>
                                      </label>
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input type="radio" name={`editLoanType2-${loan.id}`} value="interest_only" checked={editLoanForm.loanType === "interest_only"} onChange={() => setEditLoanForm(f => ({ ...f, loanType: "interest_only" }))} />
                                        <span>質押（只還利息）</span>
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const newPrincipal = Number(editLoanForm.principal);
                                        const updated = await updateLoan(loan.id, {
                                          name: editLoanForm.name,
                                          principal: newPrincipal,
                                          annualRate: Number(editLoanForm.annualRate) / 100,
                                          periods: Number(editLoanForm.periods),
                                          startDate: editLoanForm.startDate,
                                          loanType: editLoanForm.loanType,
                                          notes: editLoanForm.notes || null,
                                        });
                                        setLoansList(prev => prev.map(l => l.id === loan.id ? updated : l));
                                        setEditingLoanId(null);
                                        if (newPrincipal !== loan.principal) {
                                          listSimulations().then(sims => { const s = sims.find(s => s.id === sim.id); if (s) setSim(s); }).catch(() => {});
                                        }
                                        toast.success("貸款已更新");
                                      } catch { toast.error("更新失敗"); }
                                    }}
                                    className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                                  >
                                    儲存
                                  </button>
                                  <button onClick={() => setEditingLoanId(null)} className="px-4 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:bg-muted transition-colors">
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* ── DELTA SUB-TAB ── */}
              </div>
            )}

            {/* ==================== FEEDBACK TAB ==================== */}
            {activeTab === "feedback" && (() => {
              const pnl = computePnlSummary(optionsTradesTyped);
              const pnlHistory = computePnlHistory(optionsTradesTyped, 60, dailyPriceMap);

              const totalStockMV = positions.reduce((s, pos) => s + pos.shares * pos.currentPrice, 0);
              const totalStockUnrealized = positions.reduce((s, pos) => s + (pos.currentPrice - pos.costBasis) * pos.shares, 0);
              const totalStockRealized = stockTradesList
                .filter(t => t.action === "SELL" || t.action === "sell")
                .reduce((s, t) => {
                  const pos = positions.find(p => p.symbol === t.symbol);
                  return s + (t.price - (pos?.costBasis ?? t.price)) * t.quantity - t.fee;
                }, 0);
              const totalUnrealized = totalStockUnrealized + pnl.unrealizedPnl;
              const totalRealized = totalStockRealized + pnl.realizedPnl;

              // 持股配置 pie data
              const allocationData = positions
                .filter(pos => pos.currentPrice > 0 && pos.shares > 0)
                .map(pos => ({ name: pos.symbol, value: Math.round(pos.shares * pos.currentPrice) }))
                .sort((a, b) => b.value - a.value);

              // P&L bar data（summary）
              const pnlBarData = [
                { name: "股票未實現", value: totalStockUnrealized },
                { name: "股票已實現", value: totalStockRealized },
                { name: "選擇權已實現", value: pnl.realizedPnl },
                { name: "選擇權未實現", value: pnl.unrealizedPnl },
              ].filter(d => d.value !== 0);

              return (
                <div className="px-4 pt-5 pb-28 space-y-4">

                  {/* 統計卡 */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="股票市值" value={`$${totalStockMV.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colorCls="text-primary" iconBg="bg-blue-500" icon={<Layers className="w-4.5 h-4.5 text-white" />} />
                    <StatCard label="未實現損益" value={`${totalUnrealized >= 0 ? "+" : ""}$${totalUnrealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colorCls={totalUnrealized >= 0 ? "text-success" : "text-destructive"} iconBg={totalUnrealized >= 0 ? "bg-green-500" : "bg-destructive"} icon={totalUnrealized >= 0 ? <TrendingUp className="w-4.5 h-4.5 text-white" /> : <TrendingDown className="w-4.5 h-4.5 text-white" />} />
                    <StatCard label="已實現損益" value={`${totalRealized >= 0 ? "+" : ""}$${totalRealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colorCls={totalRealized >= 0 ? "text-success" : "text-destructive"} iconBg={totalRealized >= 0 ? "bg-green-500" : "bg-destructive"} icon={<DollarSign className="w-4.5 h-4.5 text-white" />} />
                    <StatCard label="手續費" value={`$${pnl.totalFees.toLocaleString()}`} colorCls="text-warning" iconBg="bg-orange-500" icon={<ArrowUpRight className="w-4.5 h-4.5 text-white" />} />
                  </div>

                  {/* P&L 趨勢 */}
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary" /> 損益趨勢
                    </h3>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        {pnlHistory.length > 1 ? (
                          <AreaChart data={pnlHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="gradRealized" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34c759" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#34c759" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#007aff" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#007aff" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
                            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} labelFormatter={(l: string) => `日期：${l}`} />
                            <Area type="monotone" dataKey="realizedPnl" name="已實現" stroke="#34c759" strokeWidth={2} fill="url(#gradRealized)" dot={false} />
                            <Area type="monotone" dataKey="totalPnl" name="淨損益" stroke="#007aff" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                          </AreaChart>
                        ) : (
                          <BarChart data={pnlBarData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
                            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                            <Bar dataKey="value" name="損益" radius={[4, 4, 0, 0]}>
                              {pnlBarData.map((d, i) => <Cell key={i} fill={d.value >= 0 ? "#34c759" : "#ff3b30"} />)}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* 持股配置 Pie */}
                  {allocationData.length > 0 && (
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-primary" /> 持股配置
                      </h3>
                      <div className="flex items-center gap-4">
                        <div className="w-36 h-36 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={allocationData} cx="50%" cy="50%" innerRadius={36} outerRadius={62} dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                                {allocationData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {allocationData.slice(0, 7).map((item, i) => (
                            <div key={item.name} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="font-mono font-semibold truncate flex-1">{item.name}</span>
                              <span className="text-muted-foreground font-mono shrink-0">
                                {totalStockMV > 0 ? ((item.value / totalStockMV) * 100).toFixed(1) : "0"}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* 選擇權 P&L 拆分 */}
                  {(pnl.realizedPnl !== 0 || pnl.unrealizedPnl !== 0) && (
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" /> 選擇權損益
                      </h3>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-muted rounded-xl p-3">
                          <p className="text-muted-foreground mb-1">已實現</p>
                          <p className={`font-bold tabular-nums ${pnl.realizedPnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {pnl.realizedPnl >= 0 ? "+" : ""}${pnl.realizedPnl.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-muted rounded-xl p-3">
                          <p className="text-muted-foreground mb-1">未實現</p>
                          <p className={`font-bold tabular-nums ${pnl.unrealizedPnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {pnl.unrealizedPnl >= 0 ? "+" : ""}${pnl.unrealizedPnl.toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-muted rounded-xl p-3">
                          <p className="text-muted-foreground mb-1">手續費</p>
                          <p className="font-bold tabular-nums text-warning">${pnl.totalFees.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between text-[11px] text-muted-foreground">
                        <span>選擇權交易 {optionsTrades.length} 筆</span>
                        <span>股票交易 {stockTradesList.length} 筆</span>
                      </div>
                    </Card>
                  )}

                </div>
              );
            })()}

            {/* ==================== CASHFLOW TAB ==================== */}
            {activeTab === "cashflow" && (() => {
              const { accounts, realTotal, grandTotal, isBalanced } = doubleEntrySnapshot;
              const realAccounts = accounts.filter(a => a.kind.startsWith("real"));
              const totalIncome = incomeVirtuals.reduce((s, a) => s + Math.abs(a.balance), 0);
              const totalExpense = expenseVirtuals.reduce((s, a) => s + a.balance, 0);

              // 允許手動輸入的 cash action 科目（排除系統自動推算的）
              const MANUAL_INCOME_ACTIONS = (["SALARY", "DIVIDEND", "INTEREST_IN", "TRANSFER_IN", "OTHER_IN", "UNKNOWN_IN"] as CashAction[]);
              const MANUAL_EXPENSE_ACTIONS = (["LIVING", "INTEREST_OUT", "FEE", "TRANSFER_OUT", "OTHER_OUT", "UNKNOWN_OUT"] as CashAction[]);

              const VIRTUAL_KIND_COLOR: Record<string, string> = {
                virtual_income: "bg-green-500",
                virtual_expense: "bg-destructive",
              };

              return (
                <div className="px-4 pt-5 pb-28 space-y-4">
                  {/* 不變量狀態橫幅 */}
                  <Card className="overflow-hidden">
                    <button onClick={() => setShowBalanceDetail(v => !v)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors">
                      <div className={`w-8 h-8 rounded-[9px] ${isBalanced ? "bg-green-500" : "bg-destructive"} flex items-center justify-center shrink-0`}>
                        {isBalanced
                          ? <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                          : <AlertTriangle className="w-4.5 h-4.5 text-white" />
                        }
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-sm font-semibold ${isBalanced ? "text-success" : "text-destructive"}`}>
                          {isBalanced ? "帳戶平衡 ✓" : "帳戶不平衡"}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {isBalanced
                            ? `Σ所有帳戶 = $0，點擊查看明細`
                            : `差異 = $${Math.abs(grandTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}（未記帳事件）`
                          }
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground/50 transition-transform ${showBalanceDetail ? "rotate-90" : ""}`} />
                    </button>
                    {showBalanceDetail && (() => {
                      const fmtAmt = (n: number) => `${n < 0 ? "-" : "+"}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                      const realAccts = accounts.filter(a => a.kind.startsWith("real"));
                      const virtAccts = accounts.filter(a => a.kind.startsWith("virtual"));
                      return (
                        <div className="border-t border-border/60 px-4 py-3 space-y-3">
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">實體帳戶</p>
                            {realAccts.map(a => (
                              <div key={a.id} className="flex justify-between items-center py-0.5">
                                <span className="text-[12px] text-foreground">{a.label}</span>
                                <span className={`text-[12px] font-mono ${a.balance >= 0 ? "text-foreground" : "text-destructive"}`}>{fmtAmt(a.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center border-t border-border/60 pt-1 mt-1">
                              <span className="text-[11px] font-semibold text-muted-foreground">小計</span>
                              <span className={`text-[12px] font-mono font-bold ${realTotal >= 0 ? "text-foreground" : "text-destructive"}`}>{fmtAmt(realTotal)}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">虛帳（來源 / 消耗）</p>
                            {virtAccts.map(a => (
                              <div key={a.id} className="flex justify-between items-center py-0.5">
                                <span className="text-[12px] text-foreground">{a.label}</span>
                                <span className={`text-[12px] font-mono ${a.balance <= 0 ? "text-success" : "text-destructive"}`}>{fmtAmt(a.balance)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center border-t border-border/60 pt-1 mt-1">
                              <span className="text-[11px] font-semibold text-muted-foreground">小計</span>
                              <span className={`text-[12px] font-mono font-bold ${(grandTotal - realTotal) <= 0 ? "text-success" : "text-destructive"}`}>{fmtAmt(grandTotal - realTotal)}</span>
                            </div>
                          </div>
                          <div className={`flex justify-between items-center rounded-xl px-3 py-2 ${Math.abs(grandTotal) < 1 ? "bg-success/10" : "bg-destructive/10"}`}>
                            <span className="text-[12px] font-bold">Σ 總計</span>
                            <span className={`text-[13px] font-mono font-bold ${Math.abs(grandTotal) < 1 ? "text-success" : "text-destructive"}`}>{fmtAmt(grandTotal)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>

                  {/* 統計卡 */}
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard label="收入來源" value={`$${totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colorCls="text-success" iconBg="bg-green-500" icon={<ArrowDownLeft className="w-4.5 h-4.5 text-white" />} />
                    <StatCard label="支出消耗" value={`$${totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colorCls="text-destructive" iconBg="bg-destructive" icon={<ArrowUpRight className="w-4.5 h-4.5 text-white" />} />
                    <StatCard label="淨資產" value={`${realTotal >= 0 ? "" : "-"}$${Math.abs(realTotal).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} colorCls={realTotal >= 0 ? "text-primary" : "text-destructive"} iconBg="bg-blue-500" icon={<DollarSign className="w-4.5 h-4.5 text-white" />} />
                  </div>

                  {/* 兩欄：實體帳戶 | 虛帳收支類別 */}
                  <div className="flex gap-3 items-start">
                    {/* 左：實體帳戶 */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">帳戶</p>
                      <div className="space-y-1.5">
                        {realAccounts.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">尚無資料</p>
                        ) : realAccounts.map(acct => {
                          const iconBg = acct.kind === "real_cash"
                            ? (acct.balance >= 0 ? "bg-green-500" : "bg-destructive")
                            : acct.kind === "real_stock" ? "bg-blue-500"
                            : "bg-orange-500";
                          const icon = acct.kind === "real_cash" ? <Wallet className="w-3.5 h-3.5 text-white" />
                            : acct.kind === "real_stock" ? <TrendingUp className="w-3.5 h-3.5 text-white" />
                            : <Landmark className="w-3.5 h-3.5 text-white" />;
                          return (
                            <button key={acct.id} onClick={() => setAccountDetailId(acct.id)} className="w-full">
                              <Card className="px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-[8px] ${iconBg} flex items-center justify-center shrink-0`}>{icon}</div>
                                  <p className="flex-1 text-xs font-semibold font-mono truncate text-left">{acct.label}</p>
                                  <span className={`text-xs font-mono font-bold shrink-0 ${acct.balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                                    {acct.balance < 0 ? "-" : ""}${Math.abs(acct.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </span>
                                </div>
                              </Card>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 右：虛帳類別（收入 + 支出） */}
                    <div className="w-[47%] shrink-0 space-y-2">
                      {/* 收入虛帳 */}
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">收入來源</p>
                      <Card className="overflow-hidden">
                        {incomeVirtuals.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">尚無收入</p>
                        ) : incomeVirtuals.map((item, i) => (
                          <button key={item.id} onClick={() => setAccountDetailId(item.id)} className={`w-full flex items-center px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors ${i < incomeVirtuals.length - 1 ? "border-b border-border/50" : ""}`}>
                            <div className="w-5 h-5 rounded-[6px] bg-green-500 flex items-center justify-center shrink-0 mr-2">
                              <ArrowDownLeft className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium leading-tight truncate">{item.label}</p>
                              <p className="text-[10px] text-success font-mono font-semibold">+${Math.abs(item.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                          </button>
                        ))}
                      </Card>

                      {/* 支出虛帳 */}
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mt-3">支出消耗</p>
                      <Card className="overflow-hidden">
                        {expenseVirtuals.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">尚無支出</p>
                        ) : expenseVirtuals.map((item, i) => (
                          <button key={item.id} onClick={() => setAccountDetailId(item.id)} className={`w-full flex items-center px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors ${i < expenseVirtuals.length - 1 ? "border-b border-border/50" : ""}`}>
                            <div className="w-5 h-5 rounded-[6px] bg-destructive flex items-center justify-center shrink-0 mr-2">
                              <ArrowUpRight className="w-3 h-3 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium leading-tight truncate">{item.label}</p>
                              <p className="text-[10px] text-destructive font-mono font-semibold">-${item.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                          </button>
                        ))}
                      </Card>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* ==================== DATABASE TAB ==================== */}
            {activeTab === "database" && (
              <div className="px-4 pt-3 pb-24 space-y-4">
                {/* Sub-tab switcher */}
                <div className="flex gap-1 bg-muted rounded-xl p-1">
                  {([
                    { id: "price" as const, label: "股價快取" },
                    { id: "delta" as const, label: "選擇權 Delta" },
                    { id: "usage" as const, label: "API 紀錄" },
                  ]).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setDbSubTab(t.id)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        dbSubTab === t.id
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {dbLoading ? (
                  <div className="flex justify-center py-10">
                    <RefreshCcw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {/* 股價快取 */}
                    {dbSubTab === "price" && (
                      <Card className="overflow-hidden p-0">
                        <div className="px-4 py-3 border-b border-border/60">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">股價快取（{dbPriceCache.length} 筆）</p>
                        </div>
                        {dbPriceCache.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">尚無快取資料</p>
                        ) : dbPriceCache.map((row, i) => (
                          <div key={row.id} className={`flex items-center px-4 py-3 ${i < dbPriceCache.length - 1 ? "border-b border-border/60" : ""}`}>
                            <div className="w-8 h-8 rounded-[9px] bg-blue-500 flex items-center justify-center shrink-0 mr-3.5">
                              <Wifi className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold font-mono">{row.symbol}</p>
                              <p className="text-xs text-muted-foreground">{row.source} · {row.fetchedAt ? new Date(row.fetchedAt).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                            </div>
                            <p className="text-sm font-mono font-semibold">${Number(row.price.toFixed(2)).toLocaleString()}</p>
                          </div>
                        ))}
                      </Card>
                    )}

                    {/* 選擇權 Delta */}
                    {dbSubTab === "delta" && (() => {
                      const deltaCacheMonths = [...new Set(dbDeltaCache.map(r => r.contractMonth).filter(Boolean))].sort() as string[];
                      return (
                        <Card className="overflow-hidden p-0">
                          <div className="px-4 py-3 border-b border-border/60">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">選擇權 Delta（{dbDeltaCache.length} 筆）</p>
                          </div>
                          {dbDeltaCache.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">尚無 Delta 資料</p>
                          ) : dbDeltaCache.map((row, i) => {
                            const tag = row.contractMonth ? classifyContractMonth(row.contractMonth, deltaCacheMonths) : null;
                            return (
                              <div key={row.id} className={`flex items-center px-4 py-3 ${i < dbDeltaCache.length - 1 ? "border-b border-border/60" : ""}`}>
                                <div className={`w-8 h-8 rounded-[9px] ${row.callPut === "C" ? "bg-blue-500" : "bg-purple-500"} flex items-center justify-center shrink-0 mr-3.5`}>
                                  <span className="text-white text-xs font-bold">{row.callPut}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[15px] font-semibold font-mono">{row.strikePrice.toLocaleString()}</span>
                                    {tag && <span className={`text-[10px] px-1 rounded leading-tight font-semibold ${tag === "近月" ? "bg-warning/20 text-warning" : "bg-sky-500/20 text-sky-400"}`}>{tag}</span>}
                                    <span className="text-xs text-muted-foreground font-mono">{row.contractMonth}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono">{row.tradeDate} · 量{row.volume?.toLocaleString() ?? "—"} OI{row.openInterest?.toLocaleString() ?? "—"}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-mono font-semibold">{row.delta != null ? row.delta.toFixed(4) : "—"}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{row.closePrice != null ? row.closePrice.toLocaleString() : "—"}</p>
                                </div>
                              </div>
                            );
                          })}
                        </Card>
                      );
                    })()}

                    {/* API 使用紀錄 */}
                    {dbSubTab === "usage" && (
                      <Card className="overflow-hidden p-0">
                        <div className="px-4 py-3 border-b border-border/60">
                          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">API 紀錄（{dbApiUsage.length} 筆）</p>
                        </div>
                        {dbApiUsage.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">尚無呼叫紀錄</p>
                        ) : dbApiUsage.map((row, i) => (
                          <div key={row.id} className={`flex items-center px-4 py-3 ${i < dbApiUsage.length - 1 ? "border-b border-border/60" : ""}`}>
                            <div className={`w-8 h-8 rounded-[9px] ${row.success ? "bg-green-500" : "bg-destructive"} flex items-center justify-center shrink-0 mr-3.5`}>
                              {row.success ? <CheckCircle2 className="w-4 h-4 text-white" /> : <XCircle className="w-4 h-4 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-semibold font-mono">{row.symbol}</p>
                              <p className="text-xs text-muted-foreground">{row.source} · {row.createdAt ? new Date(row.createdAt).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                            </div>
                            <p className="text-sm font-mono text-muted-foreground shrink-0">{row.responseTimeMs != null ? `${row.responseTimeMs}ms` : "—"}</p>
                          </div>
                        ))}
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ==================== SETTINGS TAB ==================== */}
            {activeTab === "settings" && (() => {
              const currentIntervalLabel = INTERVALS.find(o => o.value === refreshInterval)?.label ?? "關閉";
              const defaultProviderLabel = PROVIDER_DEFS.find(p => p.id === defaultSourceId)?.label ?? defaultSourceId;

              return (
                <div className="pb-8">
                  {/* ── 資料環境 ────────────────────── */}
                  <SectionHeader title="資料環境" />
                  <Card className="overflow-hidden mx-4">
                    <SettingRow openRows={openSettingRows} onToggle={toggleSettingRow}
                      rowId="source"
                      iconBg="bg-blue-500"
                      icon={<Wifi className="w-4 h-4 text-white" />}
                      label="股價來源"
                      value={defaultProviderLabel}
                    >
                      <div className="space-y-2 mt-2">
                        {PROVIDER_DEFS.map(p => {
                          const cfg = sourceConfigs.find(c => c.sourceId === p.id);
                          const isDefault = defaultSourceId === p.id;
                          const hasKey = !p.requiresKey || !!cfg?.apiKey;
                          return (
                            <div key={p.id} className={`p-3 rounded-2xl border transition-colors ${
                              isDefault ? "border-primary/40 bg-primary/5" : "border-border bg-muted"
                            }`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">{p.label}</span>
                                  {isDefault && (
                                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">使用中</span>
                                  )}
                                </div>
                                {!isDefault && (
                                  <button
                                    onClick={() => handleSetDefault(p.id as ProviderId)}
                                    disabled={!hasKey}
                                    className="text-xs text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    設為預設
                                  </button>
                                )}
                              </div>
                              {p.requiresKey && (
                                <div className="flex gap-2">
                                  <Input
                                    type="password"
                                    value={keyDraft[p.id] ?? cfg?.apiKey ?? ""}
                                    onChange={e => setKeyDraft(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    placeholder={p.keyPlaceholder}
                                    className="font-mono h-9 text-sm flex-1"
                                  />
                                  <button
                                    onClick={() => handleSaveKey(p.id)}
                                    disabled={savingKey === p.id}
                                    className="px-3 h-9 rounded-xl bg-secondary/80 hover:bg-secondary border border-border text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                                  >
                                    {savingKey === p.id ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : "儲存"}
                                  </button>
                                </div>
                              )}
                              {p.requiresKey && cfg?.apiKey && (
                                <p className="text-[10px] text-success mt-1.5 flex items-center gap-1">
                                  <Check className="w-3 h-3" /> 已設定
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </SettingRow>

                    <SettingRow openRows={openSettingRows} onToggle={toggleSettingRow}
                      rowId="interval"
                      iconBg="bg-orange-500"
                      icon={<RefreshCcw className="w-4 h-4 text-white" />}
                      label="自動刷新間隔"
                      value={currentIntervalLabel}
                    >
                      <div className="flex flex-wrap gap-2 mt-2 mb-3">
                        {INTERVALS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { setRefreshInterval(opt.value); toast.success(opt.value > 0 ? `已設定每 ${opt.label} 刷新` : "已關閉自動刷新"); }}
                            className={`px-3 py-1.5 rounded-xl border text-xs transition-colors ${
                              refreshInterval === opt.value
                                ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                                : "border-border bg-muted text-muted-foreground hover:bg-secondary"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={handleRefreshAll}
                        disabled={isRefreshingAll}
                        className="w-full h-10 rounded-xl border border-primary/20 bg-primary/10 text-primary text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {isRefreshingAll ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                        立即刷新全部股價
                      </button>
                    </SettingRow>

                    <SettingRow openRows={openSettingRows} onToggle={toggleSettingRow}
                      rowId="schedule"
                      iconBg="bg-green-500"
                      icon={<Clock className="w-4 h-4 text-white" />}
                      label="每日排程"
                      value={dailyRefreshTime || "未設定"}
                      last
                    >
                      <div className="flex items-center gap-3 mt-2">
                        <input
                          type="time"
                          value={dailyRefreshTime}
                          onChange={async e => {
                            const val = e.target.value;
                            setDailyRefreshTime(val);
                            if (val) {
                              try {
                                await upsertAppSetting("dailyRefreshTime", val);
                                toast.success(`已設定每日 ${val} 自動拉取`);
                              } catch { toast.error("儲存失敗"); }
                            }
                          }}
                          className="bg-secondary/50 rounded-lg px-3 py-2 text-sm font-mono border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">UTC+8 自動更新</span>
                      </div>
                    </SettingRow>
                  </Card>

                  {/* ── 選擇權 ──────────────────────── */}
                  <SectionHeader title="選擇權" />
                  <Card className="overflow-hidden mx-4">
                    <SettingRow openRows={openSettingRows} onToggle={toggleSettingRow}
                      rowId="delta"
                      iconBg="bg-purple-500"
                      icon={<Activity className="w-4 h-4 text-white" />}
                      label="抓取最新 Delta"
                      value={optionsFetching ? "載入中…" : cooldownRemain > 0 ? `${cooldownRemain} 分鐘後` : ""}
                      action={(!optionsFetching && cooldownRemain === 0) ? handleFetchOptions : undefined}
                    />
                    <SettingRow openRows={openSettingRows} onToggle={toggleSettingRow}
                      rowId="stats"
                      iconBg="bg-indigo-500"
                      icon={<BarChart2 className="w-4 h-4 text-white" />}
                      label="API 統計"
                      last
                    >
                      <div className="mt-2">
                        <ApiStatsCard stats={apiStats} />
                      </div>
                    </SettingRow>
                  </Card>

                  {/* ── 系統 ────────────────────────── */}
                  <SectionHeader title="系統" />
                  <Card className="overflow-hidden mx-4">
                    <SettingRow openRows={openSettingRows} onToggle={toggleSettingRow}
                      rowId="reset"
                      iconBg="bg-destructive"
                      icon={<Settings2 className="w-4 h-4 text-white" />}
                      label="還原原廠設定"
                      last
                    >
                      <p className="text-xs text-muted-foreground mt-2 mb-3">清除所有資料（持股、交易、貸款），無法復原</p>
                      <button
                        onClick={handleReset}
                        disabled={isResetting}
                        className="w-full h-11 rounded-xl bg-destructive/80 hover:bg-destructive text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {isResetting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "確認還原"}
                      </button>
                    </SettingRow>
                  </Card>
                </div>
              );
            })()}

            {/* ==================== SYNC TAB ==================== */}
            {activeTab === "sync" && (
              <SyncTab simId={sim.id} />
            )}

            {/* ==================== BACKUP TAB ==================== */}
            {activeTab === "backup" && (() => {
              const tsNow = nowTW;

              const downloadCSV = (rows: (string | number | null)[][], filename: string) => {
                const csv = rows.map(row =>
                  row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
                ).join("\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = filename; a.click();
                URL.revokeObjectURL(url);
              };

              // 統一欄位：type 開頭，所有類型共用同一張表
              const HEADERS = ["type","tradeDate","action","contractId","contractMonth","callPut","strikePrice","price","quantity","fee","symbol","name","principal","annualRate_pct","periods","startDate","notes"];

              const exportAll = () => {
                const optRows = optionsTrades.map(t => ["options_trade",t.tradeDate,t.action,t.contractId,t.contractMonth,t.callPut,t.strikePrice,t.price,t.quantity,t.fee,"","","","","","",t.notes??""]);
                const stkRows = stockTradesList.map(t => ["stock_trade",t.tradeDate,t.action,"","","","",t.price,t.quantity,t.fee,t.symbol,"","","","","",t.notes??""]);
                const loanRows = loansList.map(l => ["loan","","","","","","","","","","",l.name,l.principal,(l.annualRate*100).toFixed(4),l.periods,l.startDate,l.notes??""]);
                downloadCSV([HEADERS, ...optRows, ...stkRows, ...loanRows], `backup_${tsNow()}.csv`);
              };

              const parseCSV = (text: string): Record<string, string>[] => {
                const lines = text.split(/\r?\n/).filter(l => l.trim());
                if (lines.length < 2) return [];
                const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g,"").trim());
                return lines.slice(1).map(line => {
                  const vals: string[] = [];
                  let inQ = false, cur = "";
                  for (const ch of line) {
                    if (ch === '"') inQ = !inQ;
                    else if (ch === "," && !inQ) { vals.push(cur); cur = ""; }
                    else cur += ch;
                  }
                  vals.push(cur);
                  const obj: Record<string,string> = {};
                  headers.forEach((h,i) => { obj[h] = (vals[i]??"").replace(/^"|"$/g,"").trim(); });
                  return obj;
                });
              };

              const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                setImportLoading(true);
                setImportStatus(null);
                try {
                  const text = await file.text();
                  const rows = parseCSV(text);
                  if (rows.length === 0) { setImportStatus("error:CSV 無有效資料"); setImportLoading(false); return; }
                  let optCount = 0, stkCount = 0, loanCount = 0;
                  for (const r of rows) {
                    try {
                      if (r.type === "options_trade") {
                        await addOptionsTrade({ simulationId: simId, tradeDate: r.tradeDate, action: r.action, contractId: r.contractId||"TXO", contractMonth: r.contractMonth, callPut: r.callPut as "C"|"P", strikePrice: Number(r.strikePrice), price: Number(r.price), quantity: Number(r.quantity), fee: Number(r.fee)||0, notes: r.notes||null });
                        optCount++;
                      } else if (r.type === "stock_trade") {
                        await addStockTrade({ simulationId: simId, tradeDate: r.tradeDate, action: r.action, symbol: r.symbol, price: Number(r.price), quantity: Number(r.quantity), fee: Number(r.fee)||0, notes: r.notes||null });
                        stkCount++;
                      } else if (r.type === "loan") {
                        await createLoan({ simulationId: sim.id, name: r.name, principal: Number(r.principal), annualRate: Number(r.annualRate_pct)/100, periods: Number(r.periods), startDate: r.startDate, notes: r.notes||null });
                        loanCount++;
                      }
                    } catch { /* skip invalid rows */ }
                  }
                  if (optCount) getOptionsTrades(simId).then(setOptionsTrades).catch(() => {});
                  if (stkCount) getStockTrades(simId).then(setStockTradesList).catch(() => {});
                  if (loanCount) { getLoans(sim.id).then(setLoansList).catch(() => {}); listSimulations().then(sims => { if (sims.length > 0) setSim(sims[0]); }).catch(() => {}); }
                  const total = optCount + stkCount + loanCount;
                  if (total === 0) setImportStatus("error:無匯入任何資料，請確認 type 欄位正確");
                  else setImportStatus(`ok:匯入 ${total} 筆（選擇權 ${optCount}・股票 ${stkCount}・貸款 ${loanCount}）`);
                } catch {
                  setImportStatus("error:匯入失敗，請確認檔案格式");
                }
                setImportLoading(false);
              };

              const total = optionsTrades.length + stockTradesList.length + loansList.length;

              return (
                <div className="pb-24">
                  {/* 統計 */}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-5 pb-1.5">資料統計</p>
                  <div className="grid grid-cols-3 gap-3 px-4">
                    {[
                      { label: "選擇權", count: optionsTrades.length, iconBg: "bg-blue-500", icon: <Activity className="w-4 h-4 text-white" /> },
                      { label: "股票", count: stockTradesList.length, iconBg: "bg-green-500", icon: <TrendingUp className="w-4 h-4 text-white" /> },
                      { label: "貸款", count: loansList.length, iconBg: "bg-orange-500", icon: <Landmark className="w-4 h-4 text-white" /> },
                    ].map(s => (
                      <div key={s.label} className="bg-card rounded-2xl shadow-card p-3 flex flex-col items-center gap-1.5">
                        <div className={`w-9 h-9 rounded-[10px] ${s.iconBg} flex items-center justify-center`}>{s.icon}</div>
                        <p className="text-lg font-bold font-mono tabular-nums">{s.count}</p>
                        <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* 備份 / 匯入 */}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-5 pb-1.5">備份與還原</p>
                  <Card className="overflow-hidden mx-4">
                    {/* 匯出 */}
                    <button onClick={exportAll} className="w-full flex items-center px-4 py-3.5 hover:bg-secondary/30 transition-colors">
                      <div className="w-8 h-8 rounded-[9px] bg-blue-500 flex items-center justify-center shrink-0 mr-3.5">
                        <Download className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[15px]">匯出備份</p>
                        <p className="text-xs text-muted-foreground">下載 CSV（選擇權・股票・貸款）</p>
                      </div>
                      <span className="text-sm text-muted-foreground font-mono mr-1">{total} 筆</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </button>

                    <div className="h-px bg-border/60 ml-[60px]" />

                    {/* 匯入 */}
                    <label className={`w-full flex items-center px-4 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer ${importLoading ? "opacity-50 pointer-events-none" : ""}`}>
                      <div className="w-8 h-8 rounded-[9px] bg-green-500 flex items-center justify-center shrink-0 mr-3.5">
                        <Upload className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[15px]">{importLoading ? "匯入中…" : "從 CSV 匯入"}</p>
                        <p className="text-xs text-muted-foreground">不覆蓋現有資料</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importLoading} />
                    </label>
                  </Card>

                  {importStatus && (
                    <div className={`mx-4 mt-2 px-4 py-3 rounded-2xl text-xs font-medium ${importStatus.startsWith("ok:") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {importStatus.startsWith("ok:") ? "✓ " : "✗ "}{importStatus.slice(3)}
                    </div>
                  )}

                  {/* CSV 格式說明 */}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-4 pt-5 pb-1.5">格式說明</p>
                  <Card className="overflow-hidden mx-4 p-4">
                    <p className="text-xs text-muted-foreground mb-2">CSV 欄位（統一格式）：</p>
                    <p className="font-mono text-[10px] text-muted-foreground break-all leading-relaxed">type · tradeDate · action · contractId · contractMonth · callPut · strikePrice · price · quantity · fee · symbol · name · principal · annualRate_pct · periods · startDate · notes</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">options_trade</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">stock_trade</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-medium">loan</span>
                    </div>
                  </Card>
                </div>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={closeSearch}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-md bg-card rounded-t-3xl z-50 pb-10"
            >
              <div className="w-10 h-1 bg-black/10 rounded-full mx-auto mt-4 mb-4" />
              <div className="px-4 flex items-center gap-3 mb-3">
                <div className="flex-1 flex items-center gap-2 bg-muted border border-border rounded-2xl px-3 h-11">
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="搜尋股票代號或名稱…"
                    className="flex-1 bg-transparent text-sm font-mono outline-none placeholder:text-muted-foreground uppercase"
                    autoFocus
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(""); setSuggestions([]); }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button onClick={closeSearch} className="text-muted-foreground hover:text-foreground p-1.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="min-h-[120px]">
                {searchQuery.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-10">輸入代號或公司名稱搜尋</p>
                ) : isSearching ? (
                  <p className="text-center text-xs text-muted-foreground py-10 flex items-center justify-center gap-2">
                    <RefreshCcw className="w-3 h-3 animate-spin" /> 搜尋中…
                  </p>
                ) : suggestions.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-10">找不到「{searchQuery}」</p>
                ) : (
                  suggestions.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => handleAddStock(s)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0 text-left"
                    >
                      <div>
                        <span className="font-mono font-semibold text-sm">{s.symbol}</span>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">{s.name}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-md shrink-0">
                        {s.exchange}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/90 backdrop-blur-xl border-t border-border/60 px-1 pt-2 pb-[env(safe-area-inset-bottom,8px)] z-40">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setShowMore(false); }}
                className="relative flex-1 flex flex-col items-center gap-0.5 py-1 transition-colors"
              >
                <span className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.icon}
                </span>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div layoutId="tab-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
          {/* More button */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowMore(v => !v)}
              className="w-full flex flex-col items-center gap-0.5 py-1 transition-colors"
            >
              {(() => {
                const moreActive = showMore || MORE_ITEMS.some(item => item.id === activeTab);
                return (
                  <>
                    <span className={`transition-colors ${moreActive ? "text-primary" : "text-muted-foreground"}`}>
                      <LayoutGrid className="w-5 h-5" />
                    </span>
                    <span className={`text-[10px] font-medium transition-colors ${moreActive ? "text-primary" : "text-muted-foreground"}`}>
                      更多
                    </span>
                    {moreActive && !showMore && (
                      <motion.div layoutId="tab-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />
                    )}
                  </>
                );
              })()}
            </button>
            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 right-0 w-44 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  {MORE_ITEMS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setShowMore(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {item.icon}
                      </div>
                      <span className="text-sm font-medium">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </div>
  );
}

function ApiStatsCard({ stats }: { stats: ApiUsage[] }) {
  const total = stats.length;
  const successCount = stats.filter(s => s.success).length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const withMs = stats.filter(s => s.responseTimeMs != null);
  const avgMs = withMs.length > 0
    ? Math.round(withMs.reduce((a, s) => a + (s.responseTimeMs ?? 0), 0) / withMs.length)
    : 0;

  // 24 小時、每小時一格
  // 使用 UTC+8 時間作為時段基準
  const chartData = Array.from({ length: 24 }, (_, i) => {
    const slotStart = new Date(Date.now() + 8 * 3600_000);
    slotStart.setUTCMinutes(0, 0, 0);
    slotStart.setUTCHours(slotStart.getUTCHours() - (23 - i));
    const slotEnd = new Date(slotStart.getTime() + 3600_000);
    const bucket = stats.filter(s => {
      if (!s.createdAt) return false;
      const t = new Date(new Date(s.createdAt).getTime() + 8 * 3600_000);
      return t >= slotStart && t < slotEnd;
    });
    return {
      date: `${slotStart.getUTCHours()}:00`,
      成功: bucket.filter(s => s.success).length,
      失敗: bucket.filter(s => !s.success).length,
    };
  });

  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-violet-400" /> API 使用統計
      </h3>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">尚無 API 呼叫記錄</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "總次數", value: String(total) },
              { label: "成功率", value: `${successRate}%` },
              { label: "平均回應", value: avgMs > 0 ? `${avgMs}ms` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted rounded-2xl p-3 text-center border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-sm font-mono font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">近 24 小時</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} barSize={14}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={18} />
                <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="成功" stackId="a" fill="#34d399" />
                <Bar dataKey="失敗" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">最近紀錄</p>
            {stats.slice(0, 6).map(r => (
              <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${r.success ? "bg-success" : "bg-destructive"}`} />
                  <span className="font-mono font-medium">{r.symbol}</span>
                  {r.source === "taifex_options" && <span className="text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">期交所</span>}
                </div>
                <div className="flex gap-2 text-muted-foreground">
                  {r.responseTimeMs != null && <span className="font-mono">{r.responseTimeMs}ms</span>}
                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Sync Tab Component ──

type SyncDiffStatus = "match" | "local_only" | "remote_only" | "conflict";

interface SyncDiffItem {
  id: number | string;
  label: string;
  status: SyncDiffStatus;
}

interface SyncTableDiff {
  table: string;
  label: string;
  localCount: number;
  remoteCount: number;
  items: SyncDiffItem[];
}

function SyncTab({ simId }: { simId: number }) {
  const [diffs, setDiffs] = React.useState<SyncTableDiff[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const handleCompare = async () => {
    setLoading(true);
    try {
      // Fetch all remote data
      const [sims, symMetas, strategies, optTrades, stkTrades] = await Promise.all([
        listSimulations(),
        getSymbolMetas(),
        getStrategies(simId),
        getOptionsTrades(simId),
        getStockTrades(simId),
      ]);

      // For Web, "local" = current in-memory state which is always from API
      // Show data counts and status as a connectivity/data overview
      const result: SyncTableDiff[] = [
        {
          table: "simulations", label: "模擬",
          localCount: sims.length, remoteCount: sims.length,
          items: sims.map(s => ({ id: s.id, label: `#${s.id}`, status: "match" as SyncDiffStatus })),
        },
        {
          table: "symbol_meta", label: "股票元資料",
          localCount: symMetas.length, remoteCount: symMetas.length,
          items: symMetas.map(m => ({ id: m.symbol, label: `${m.symbol} β${m.beta ?? 1} $${m.currentPrice ?? 0}`, status: "match" as SyncDiffStatus })),
        },
        {
          table: "strategies", label: "策略",
          localCount: strategies.length, remoteCount: strategies.length,
          items: strategies.map(s => ({ id: s.id, label: s.name, status: "match" as SyncDiffStatus })),
        },
        {
          table: "options_trades", label: "選擇權交易",
          localCount: optTrades.length, remoteCount: optTrades.length,
          items: optTrades.slice(0, 20).map(t => ({
            id: t.id,
            label: `${t.callPut}${t.strikePrice} ${t.action === "BUY" ? "買" : "賣"} ×${t.quantity}`,
            status: "match" as SyncDiffStatus,
          })),
        },
        {
          table: "stock_trades", label: "股票交易",
          localCount: stkTrades.length, remoteCount: stkTrades.length,
          items: stkTrades.slice(0, 20).map(t => ({
            id: t.id,
            label: `${t.symbol} ${t.action === "BUY" ? "買" : "賣"} ×${t.quantity}`,
            status: "match" as SyncDiffStatus,
          })),
        },
      ];
      setDiffs(result);
    } catch {
      toast.error("比對失敗");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (table: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table); else next.add(table);
      return next;
    });
  };

  const statusColorClass = (s: SyncDiffStatus) => {
    switch (s) {
      case "match": return "text-success bg-success/10";
      case "local_only": return "text-primary bg-primary/10";
      case "remote_only": return "text-warning bg-warning/10";
      case "conflict": return "text-destructive bg-destructive/10";
    }
  };

  const statusLabel = (s: SyncDiffStatus) => {
    switch (s) {
      case "match": return "一致";
      case "local_only": return "僅本地";
      case "remote_only": return "僅遠端";
      case "conflict": return "有差異";
    }
  };

  return (
    <div className="px-4 pt-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <GitBranch className="w-4 h-4" /> 同步狀態
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Web 版直連 API，顯示遠端資料狀態
          </p>
        </div>
        <button
          onClick={handleCompare}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/60 border border-border text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {loading ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          比對
        </button>
      </div>

      {!diffs && !loading && (
        <Card className="p-8 text-center">
          <GitBranch className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">點擊「比對」查看遠端資料狀態</p>
          <p className="text-xs text-muted-foreground mt-1">類似 git status，顯示各資料表狀態</p>
        </Card>
      )}

      {loading && !diffs && (
        <Card className="p-8 text-center">
          <RefreshCcw className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">正在比對...</p>
        </Card>
      )}

      {diffs?.map((diff) => {
        const isExpanded = expanded.has(diff.table);
        return (
          <Card key={diff.table} className="p-4">
            <button
              onClick={() => toggleExpand(diff.table)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{diff.label}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                  <Check className="w-3 h-3" /> 已同步
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">{diff.remoteCount} 筆</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 border-t border-border pt-3 space-y-1">
                {diff.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">無資料</p>
                ) : (
                  diff.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 py-1 text-xs">
                      <Check className="w-3 h-3 text-success shrink-0" />
                      <span className="font-mono flex-1 truncate">{item.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColorClass(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                  ))
                )}
                {diff.items.length < diff.remoteCount && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    顯示前 {diff.items.length} 筆，共 {diff.remoteCount} 筆
                  </p>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* Info card */}
      <Card className="p-4 border-primary/20">
        <div className="flex gap-3">
          <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold">Web 版與 Mobile 版同步說明</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Web 版直接連線 API，資料即時同步。Mobile 版使用 SQLite 本地快取，支援離線瀏覽。
              在 Mobile 的「同步」頁面可執行 Pull（遠端→本地）或 Force Push（本地→遠端）操作。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
