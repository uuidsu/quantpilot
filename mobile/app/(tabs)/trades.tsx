import React, { useState, useMemo } from "react";
import {
  View, Text, Pressable, FlatList, StyleSheet, TextInput, Alert, ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Trash2, List, CalendarDays, ChevronLeft, ChevronRight, RefreshCcw, Check } from "lucide-react-native";
import Svg, { Polyline, Line as SvgLine, Text as SvgText } from "react-native-svg";
import Toast from "react-native-toast-message";
import { useTradeHistory } from "@/hooks/useTradeHistory";
import { useOptionsTrades } from "@/hooks/useOptionsTrades";
import { Card } from "@/components/Card";
import { colors } from "@/constants/theme";
import { formatTradeDate } from "@shared/tradeHistory";
import type { UnifiedTrade } from "@/types";

import { useSimulation } from "@/hooks/useSimulation";
import { generateLoanSchedule } from "@shared/loan";
import type { Loan } from "@/types";

type ViewMode = "list" | "calendar";
type FilterTab = "all" | "stock" | "options" | "loan" | "feedback";
type AddType = "options" | "stock" | "loan";

export default function TradesScreen() {
  const { sim } = useSimulation();
  const {
    trades, tradeDates, tradesByDate, loans, loading, refresh,
    addOptionsTrade, addStockTrade, removeOptionsTrade, removeStockTrade,
    addLoan, removeLoan,
  } = useTradeHistory(sim?.id);
  const { pnlSummary, pnlHistory, holdings: optionsHoldings } = useOptionsTrades({ loadPriceMap: true });

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showForm, setShowForm] = useState(false);
  const [addType, setAddType] = useState<AddType>("stock");
  const [showFutureLoanTrades, setShowFutureLoanTrades] = useState(false);

  const filteredTrades = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    let list = trades;
    if (!showFutureLoanTrades) {
      list = list.filter((t) => t.type !== "loan" || t.tradeDate <= todayStr);
    }
    if (filterTab === "all") return list;
    if (filterTab === "feedback") return list;
    return list.filter((t) => t.type === filterTab);
  }, [trades, filterTab, showFutureLoanTrades]);

  const filteredTradeDates = useMemo(() => {
    return new Set(filteredTrades.map((t) => t.tradeDate));
  }, [filteredTrades]);

  const filteredTradesByDate = useMemo(() => {
    const map = new Map<string, UnifiedTrade[]>();
    for (const t of filteredTrades) {
      const list = map.get(t.tradeDate) ?? [];
      list.push(t);
      map.set(t.tradeDate, list);
    }
    return map;
  }, [filteredTrades]);

  // Calendar state
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Stock form
  const [stkForm, setStkForm] = useState({
    tradeDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    action: "BUY" as "BUY" | "SELL",
    symbol: "",
    price: "",
    quantity: "",
    fee: "0",
    notes: "",
  });

  // Loan form
  const [loanForm, setLoanForm] = useState({
    name: "",
    principal: "",
    annualRate: "",
    periods: "",
    startDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    notes: "",
  });

  // Options form
  const [optForm, setOptForm] = useState({
    tradeDate: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    action: "BUY" as "BUY" | "SELL",
    contractMonth: "",
    callPut: "C" as "C" | "P",
    strikePrice: "",
    price: "",
    quantity: "1",
    fee: "0",
    notes: "",
  });

  const handleAddStock = async () => {
    if (!stkForm.symbol || !stkForm.price || !stkForm.quantity) {
      Toast.show({ type: "error", text1: "請填寫必要欄位" });
      return;
    }
    try {
      await addStockTrade({
        tradeDate: stkForm.tradeDate,
        action: stkForm.action,
        symbol: stkForm.symbol.toUpperCase(),
        price: Number(stkForm.price),
        quantity: Number(stkForm.quantity),
        fee: Number(stkForm.fee),
        notes: stkForm.notes || null,
      });
      Toast.show({ type: "success", text1: "股票交易已新增" });
      setShowForm(false);
      setStkForm((f) => ({ ...f, symbol: "", price: "", quantity: "", fee: "0", notes: "" }));
    } catch {
      Toast.show({ type: "error", text1: "新增失敗" });
    }
  };

  const handleAddOptions = async () => {
    if (!optForm.contractMonth || !optForm.strikePrice || !optForm.price) {
      Toast.show({ type: "error", text1: "請填寫必要欄位" });
      return;
    }
    try {
      await addOptionsTrade({
        tradeDate: optForm.tradeDate,
        action: optForm.action,
        contractMonth: optForm.contractMonth,
        callPut: optForm.callPut,
        strikePrice: Number(optForm.strikePrice),
        price: Number(optForm.price),
        quantity: Number(optForm.quantity),
        fee: Number(optForm.fee),
        notes: optForm.notes || null,
      });
      Toast.show({ type: "success", text1: "選擇權交易已新增" });
      setShowForm(false);
      setOptForm((f) => ({ ...f, strikePrice: "", price: "", quantity: "1", fee: "0", notes: "" }));
    } catch {
      Toast.show({ type: "error", text1: "新增失敗" });
    }
  };

  const handleAddLoan = async () => {
    if (!sim || !loanForm.name || !loanForm.principal || !loanForm.annualRate || !loanForm.periods) {
      Toast.show({ type: "error", text1: "請填寫必要欄位" });
      return;
    }
    try {
      await addLoan({
        simulationId: sim.id,
        name: loanForm.name,
        principal: Number(loanForm.principal),
        annualRate: Number(loanForm.annualRate) / 100, // 用戶輸入百分比，轉為小數
        periods: Number(loanForm.periods),
        startDate: loanForm.startDate,
        notes: loanForm.notes || null,
      });
      Toast.show({ type: "success", text1: "貸款已新增" });
      setShowForm(false);
      setLoanForm(f => ({ ...f, name: "", principal: "", annualRate: "", periods: "", notes: "" }));
    } catch {
      Toast.show({ type: "error", text1: "新增失敗" });
    }
  };

  const handleDelete = (t: UnifiedTrade) => {
    if (t.type === "loan") return; // 貸款交易事件不能單獨刪除
    const label = t.type === "options" ? "選擇權" : "股票";
    Alert.alert("確認刪除", `確定要刪除此${label}交易紀錄？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: () => {
          const rawId = (t.raw as any).id;
          if (t.type === "options") removeOptionsTrade(rawId);
          else removeStockTrade(rawId);
        },
      },
    ]);
  };

  // Calendar helpers
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [calYear, calMonth]);

  const dayToDateStr = (day: number) => {
    const m = String(calMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${calYear}${m}${d}`;
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const selectedDayTrades = selectedDate ? (filteredTradesByDate.get(selectedDate) ?? []) : [];

  const renderTradeRow = (t: UnifiedTrade, showDate = true) => (
    <View key={t.id} style={styles.tradeRow}>
      {showDate && (
        <Text style={[styles.tradeCell, { width: 45, fontFamily: "monospace" }]}>
          {t.tradeDate.slice(4, 6)}/{t.tradeDate.slice(6, 8)}
        </Text>
      )}
      <View style={[styles.typeBadge, { backgroundColor: t.type === "options" ? colors.blueLight : t.type === "loan" ? colors.primaryLight : colors.orangeLight }]}>
        <Text style={[styles.typeBadgeText, { color: t.type === "options" ? colors.blue : t.type === "loan" ? colors.primary : colors.orange }]}>
          {t.type === "options" ? "期" : t.type === "loan" ? "貸" : "股"}
        </Text>
      </View>
      <View style={{ width: 24, alignItems: "center" }}>
        <Text style={{ fontSize: 10, fontWeight: "700", color: t.action === "BUY" || t.action === "LOAN_IN" ? colors.success : colors.destructive }}>
          {t.action === "BUY" ? "買" : t.action === "SELL" ? "賣" : t.action === "LOAN_IN" ? "入" : "還"}
        </Text>
      </View>
      <Text style={[styles.tradeCell, { flex: 1 }]} numberOfLines={1}>
        {t.description}
      </Text>
      <Text style={[styles.tradeCell, { width: 50, textAlign: "right", fontFamily: "monospace" }]}>
        {t.price}
      </Text>
      <Text style={[styles.tradeCell, { width: 30, textAlign: "right", fontFamily: "monospace" }]}>
        {t.quantity}
      </Text>
      {t.type !== "loan" ? (
        <Pressable style={{ width: 28, alignItems: "center" }} onPress={() => handleDelete(t)}>
          <Trash2 size={13} color={colors.mutedForeground} />
        </Pressable>
      ) : (
        <View style={{ width: 28 }} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>交易歷史</Text>
        {filterTab !== "feedback" && (
          <View style={styles.headerRight}>
            <Pressable
              style={[styles.modeBtn, viewMode === "list" && styles.modeBtnActive]}
              onPress={() => setViewMode("list")}
            >
              <List size={16} color={viewMode === "list" ? colors.primary : colors.mutedForeground} />
            </Pressable>
            <Pressable
              style={[styles.modeBtn, viewMode === "calendar" && styles.modeBtnActive]}
              onPress={() => setViewMode("calendar")}
            >
              <CalendarDays size={16} color={viewMode === "calendar" ? colors.primary : colors.mutedForeground} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.segmentContainer}>
        {([
          { key: "all" as FilterTab, label: "全部" },
          { key: "stock" as FilterTab, label: "股票" },
          { key: "options" as FilterTab, label: "選擇權" },
          { key: "loan" as FilterTab, label: "貸款" },
          { key: "feedback" as FilterTab, label: "回饋" },
        ]).map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.segment, filterTab === tab.key && styles.segmentActive]}
            onPress={() => setFilterTab(tab.key)}
          >
            <Text style={[styles.segmentText, filterTab === tab.key && styles.segmentTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Future loan toggle */}
      {loans.length > 0 && filterTab !== "feedback" && (
        <Pressable
          style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 6 }}
          onPress={() => setShowFutureLoanTrades(v => !v)}
        >
          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: showFutureLoanTrades ? colors.primary : colors.border, backgroundColor: showFutureLoanTrades ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
            {showFutureLoanTrades && <Check size={12} color="#fff" />}
          </View>
          <Text style={{ fontSize: 12, color: colors.mutedForeground }}>顯示未來貸款事件</Text>
        </Pressable>
      )}

      {filterTab === "feedback" ? (
        <FeedbackView pnlSummary={pnlSummary} pnlHistory={pnlHistory} optionsHoldings={optionsHoldings} trades={trades} />
      ) : viewMode === "list" ? (
        <FlatList
          data={filteredTrades}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderTradeRow(item)}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              {/* Add trade */}
              <Card style={styles.card}>
                <Pressable onPress={() => setShowForm(!showForm)} style={styles.addHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Plus size={14} color={colors.primary} />
                    <Text style={styles.cardTitle}>新增交易</Text>
                  </View>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>{showForm ? "收合" : "展開"}</Text>
                </Pressable>
                {showForm && (
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {/* Type toggle */}
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {(["stock", "options", "loan"] as const).map((t) => (
                        <Pressable
                          key={t}
                          style={[styles.chip, addType === t && styles.chipActive]}
                          onPress={() => setAddType(t)}
                        >
                          <Text style={[styles.chipText, addType === t && styles.chipTextActive]}>
                            {t === "stock" ? "股票" : t === "options" ? "選擇權" : "貸款"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {addType === "stock" ? renderStockForm(stkForm, setStkForm, handleAddStock) : addType === "options" ? renderOptionsForm(optForm, setOptForm, handleAddOptions) : renderLoanForm(loanForm, setLoanForm, handleAddLoan)}
                  </View>
                )}
              </Card>

              {/* Table header */}
              {filteredTrades.length > 0 && (
                <View style={styles.tableHeader}>
                  <Text style={[styles.thCell, { width: 45 }]}>日期</Text>
                  <Text style={[styles.thCell, { width: 24 }]}>類</Text>
                  <Text style={[styles.thCell, { width: 24 }]}>B/S</Text>
                  <Text style={[styles.thCell, { flex: 1 }]}>標的</Text>
                  <Text style={[styles.thCell, { width: 50, textAlign: "right" }]}>價格</Text>
                  <Text style={[styles.thCell, { width: 30, textAlign: "right" }]}>量</Text>
                  <Text style={[styles.thCell, { width: 28 }]}></Text>
                </View>
              )}
            </View>
          }
          contentContainerStyle={{ padding: 16, gap: 0 }}
          refreshing={loading}
          onRefresh={refresh}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>尚無交易紀錄</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          {/* Calendar */}
          <Card style={styles.card}>
            {/* Month navigator */}
            <View style={styles.calNav}>
              <Pressable onPress={prevMonth} hitSlop={8}>
                <ChevronLeft size={20} color={colors.foreground} />
              </Pressable>
              <Text style={styles.calNavTitle}>
                {calYear} 年 {calMonth + 1} 月
              </Text>
              <Pressable onPress={nextMonth} hitSlop={8}>
                <ChevronRight size={20} color={colors.foreground} />
              </Pressable>
            </View>

            {/* Weekday headers */}
            <View style={styles.calWeekRow}>
              {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                <Text key={d} style={styles.calWeekText}>{d}</Text>
              ))}
            </View>

            {/* Day grid */}
            <View style={styles.calGrid}>
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <View key={`empty-${i}`} style={styles.calDayCell} />;
                }
                const dateStr = dayToDateStr(day);
                const hasTrades = filteredTradeDates.has(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === new Date().toISOString().slice(0, 10).replace(/-/g, "");

                return (
                  <Pressable
                    key={dateStr}
                    style={[
                      styles.calDayCell,
                      isSelected && styles.calDayCellSelected,
                      isToday && !isSelected && styles.calDayCellToday,
                    ]}
                    onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                  >
                    <Text
                      style={[
                        styles.calDayText,
                        isSelected && styles.calDayTextSelected,
                        isToday && !isSelected && { color: colors.primary },
                      ]}
                    >
                      {day}
                    </Text>
                    {hasTrades && (
                      <View style={[styles.calDot, isSelected && { backgroundColor: "#fff" }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* Selected date trades */}
          {selectedDate && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>
                {formatTradeDate(selectedDate)} 交易紀錄
              </Text>
              {selectedDayTrades.length > 0 ? (
                <View style={{ gap: 0 }}>
                  {selectedDayTrades.map((t) => renderTradeRow(t, false))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { paddingVertical: 16 }]}>
                  當天無交易紀錄
                </Text>
              )}
            </Card>
          )}

          {/* Add trade in calendar mode */}
          <Card style={styles.card}>
            <Pressable onPress={() => setShowForm(!showForm)} style={styles.addHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Plus size={14} color={colors.primary} />
                <Text style={styles.cardTitle}>新增交易</Text>
              </View>
              <Text style={{ color: colors.primary, fontSize: 12 }}>{showForm ? "收合" : "展開"}</Text>
            </Pressable>
            {showForm && (
              <View style={{ gap: 8, marginTop: 8 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {(["stock", "options", "loan"] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.chip, addType === t && styles.chipActive]}
                      onPress={() => setAddType(t)}
                    >
                      <Text style={[styles.chipText, addType === t && styles.chipTextActive]}>
                        {t === "stock" ? "股票" : t === "options" ? "選擇權" : "貸款"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {addType === "stock" ? renderStockForm(stkForm, setStkForm, handleAddStock) : addType === "options" ? renderOptionsForm(optForm, setOptForm, handleAddOptions) : renderLoanForm(loanForm, setLoanForm, handleAddLoan)}
              </View>
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ── Delta View ── */
/* ── Feedback View ── */
function FeedbackView({
  pnlSummary, pnlHistory, optionsHoldings, trades,
}: {
  pnlSummary: { realizedPnl: number; unrealizedPnl: number; totalPnl: number; totalFees: number };
  pnlHistory: { date: string; totalPnl: number }[];
  optionsHoldings: { contractMonth: string; callPut: string; strikePrice: number; netQuantity: number; avgCost: number }[];
  trades: UnifiedTrade[];
}) {
  const [fbFields, setFbFields] = useState({
    marketValue: true,
    unrealized: true,
    realized: true,
    dividend: true,
    fees: true,
    netPnl: true,
  });
  const toggleFb = (key: keyof typeof fbFields) =>
    setFbFields(prev => ({ ...prev, [key]: !prev[key] }));

  const totalStockTrades = trades.filter((t) => t.type === "stock").length;
  const totalOptionsTrades = trades.filter((t) => t.type === "options").length;
  const totalBuys = trades.filter((t) => t.action === "BUY").length;
  const totalSells = trades.filter((t) => t.action === "SELL").length;
  const totalFees = trades.reduce((s, t) => s + t.fee, 0);

  // Stock P&L (simple: sum of sell - buy per symbol)
  const stockTrades = trades.filter((t) => t.type === "stock");
  const stockCost = stockTrades
    .filter((t) => t.action === "BUY")
    .reduce((s, t) => s + t.price * t.quantity, 0);
  const stockRevenue = stockTrades
    .filter((t) => t.action === "SELL")
    .reduce((s, t) => s + t.price * t.quantity, 0);
  const stockRealized = stockRevenue - stockCost;

  const pnl = pnlSummary;

  // Chart
  const chartW = 320;
  const chartH = 120;
  const chartPadL = 45;
  const chartPadR = 10;
  const chartPadT = 10;
  const chartPadB = 20;
  const innerW = chartW - chartPadL - chartPadR;
  const innerH = chartH - chartPadT - chartPadB;

  const fbToggleItems: [keyof typeof fbFields, string][] = [
    ["marketValue", "市值"],
    ["unrealized", "未實現"],
    ["realized", "已實現"],
    ["dividend", "配息"],
    ["fees", "手續費"],
    ["netPnl", "淨損益"],
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
      {/* P&L Summary with inline toggles */}
      <Card style={fbStyles.card}>
        <Text style={fbStyles.cardTitle}>損益概覽</Text>
        <View style={[fbStyles.toggleRow, { marginBottom: 8 }]}>
          {fbToggleItems.map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => toggleFb(key)}
              style={[fbStyles.toggleChip, fbFields[key] && fbStyles.toggleChipActive]}
            >
              {fbFields[key] && <Check size={10} color={colors.primary} />}
              <Text style={[fbStyles.toggleText, fbFields[key] && fbStyles.toggleTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={fbStyles.pnlGrid}>
          {fbFields.marketValue && (
            <View style={fbStyles.pnlBox}>
              <Text style={fbStyles.pnlLabel}>股票市值</Text>
              <Text style={[fbStyles.pnlValue, { color: colors.primary }]}>
                ${stockCost > 0 ? stockCost.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
              </Text>
            </View>
          )}
          {fbFields.unrealized && (
            <>
              <View style={fbStyles.pnlBox}>
                <Text style={fbStyles.pnlLabel}>未實現（選擇權）</Text>
                <Text style={[fbStyles.pnlValue, { color: pnl.unrealizedPnl >= 0 ? colors.success : colors.destructive }]}>
                  {pnl.unrealizedPnl >= 0 ? "+" : ""}{pnl.unrealizedPnl.toLocaleString()}
                </Text>
              </View>
            </>
          )}
          {fbFields.realized && (
            <>
              {stockRevenue > 0 && (
                <View style={fbStyles.pnlBox}>
                  <Text style={fbStyles.pnlLabel}>已實現（股票）</Text>
                  <Text style={[fbStyles.pnlValue, { color: stockRealized >= 0 ? colors.success : colors.destructive }]}>
                    {stockRealized >= 0 ? "+" : ""}{stockRealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                </View>
              )}
              <View style={fbStyles.pnlBox}>
                <Text style={fbStyles.pnlLabel}>已實現（選擇權）</Text>
                <Text style={[fbStyles.pnlValue, { color: pnl.realizedPnl >= 0 ? colors.success : colors.destructive }]}>
                  {pnl.realizedPnl >= 0 ? "+" : ""}{pnl.realizedPnl.toLocaleString()}
                </Text>
              </View>
            </>
          )}
          {fbFields.dividend && (
            <View style={fbStyles.pnlBox}>
              <Text style={fbStyles.pnlLabel}>配息收入</Text>
              <Text style={[fbStyles.pnlValue, { color: colors.mutedForeground }]}>—</Text>
            </View>
          )}
          {fbFields.fees && (
            <View style={fbStyles.pnlBox}>
              <Text style={fbStyles.pnlLabel}>手續費</Text>
              <Text style={[fbStyles.pnlValue, { color: colors.warning }]}>{pnl.totalFees.toLocaleString()}</Text>
            </View>
          )}
          {fbFields.netPnl && (
            <View style={fbStyles.pnlBox}>
              <Text style={fbStyles.pnlLabel}>淨損益</Text>
              <Text style={[fbStyles.pnlValue, { color: pnl.totalPnl >= 0 ? colors.success : colors.destructive }]}>
                {pnl.totalPnl >= 0 ? "+" : ""}{pnl.totalPnl.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* P&L Chart — always show */}
      <Card style={fbStyles.card}>
        <Text style={fbStyles.cardTitle}>損益總覽</Text>
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <Svg width={chartW} height={chartH}>
            {(() => {
              if (pnlHistory.length > 1) {
                // Line chart — only when real time-series data exists
                const vals = pnlHistory.map((p) => p.totalPnl);
                const minV = Math.min(...vals, 0);
                const maxV = Math.max(...vals, 0);
                const range = maxV - minV || 1;
                const toX = (i: number) => chartPadL + (i / (pnlHistory.length - 1 || 1)) * innerW;
                const toY = (v: number) => chartPadT + innerH - ((v - minV) / range) * innerH;
                const points = pnlHistory.map((p, i) => `${toX(i)},${toY(p.totalPnl)}`).join(" ");
                const zeroY = toY(0);
                return (
                  <>
                    <SvgLine x1={chartPadL} y1={zeroY} x2={chartW - chartPadR} y2={zeroY} stroke={colors.border} strokeWidth={1} />
                    <SvgText x={2} y={chartPadT + 4} fill={colors.mutedForeground} fontSize={8}>{maxV.toLocaleString()}</SvgText>
                    <SvgText x={2} y={chartPadT + innerH + 4} fill={colors.mutedForeground} fontSize={8}>{minV.toLocaleString()}</SvgText>
                    <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2} />
                    {[0, Math.floor(pnlHistory.length / 2), pnlHistory.length - 1].map((idx) => (
                      <SvgText key={idx} x={toX(idx)} y={chartH - 2} fill={colors.mutedForeground} fontSize={8} textAnchor="middle">
                        {pnlHistory[idx].date}
                      </SvgText>
                    ))}
                  </>
                );
              }

              // Bar chart — current P&L snapshot
              const bars = [
                { label: "股票未實現", value: stockRevenue - stockCost, color: (stockRevenue - stockCost) >= 0 ? colors.success : colors.destructive },
                { label: "選擇權已實現", value: pnl.realizedPnl, color: pnl.realizedPnl >= 0 ? colors.success : colors.destructive },
                { label: "選擇權未實現", value: pnl.unrealizedPnl, color: pnl.unrealizedPnl >= 0 ? colors.primary : colors.destructive },
              ].filter(b => b.value !== 0);

              if (bars.length === 0) {
                return (
                  <SvgText x={chartW / 2} y={chartH / 2} fill={colors.mutedForeground} fontSize={12} textAnchor="middle">
                    尚無損益數據
                  </SvgText>
                );
              }

              const maxAbsVal = Math.max(...bars.map(b => Math.abs(b.value)), 1);
              const gap = 12;
              const barW = Math.min((innerW - gap * (bars.length - 1)) / bars.length, 60);
              const totalBarsW = bars.length * barW + (bars.length - 1) * gap;
              const startX = chartPadL + (innerW - totalBarsW) / 2;
              const zeroY = chartPadT + innerH * 0.55;
              const maxBarH = innerH * 0.45;

              return (
                <>
                  <SvgLine x1={chartPadL} y1={zeroY} x2={chartW - chartPadR} y2={zeroY} stroke={colors.border} strokeWidth={1} />
                  {bars.map((b, i) => {
                    const cx = startX + i * (barW + gap) + barW / 2;
                    const barH = (Math.abs(b.value) / maxAbsVal) * maxBarH;
                    const y = b.value >= 0 ? zeroY - barH : zeroY;
                    return (
                      <React.Fragment key={i}>
                        <SvgLine x1={cx} y1={y} x2={cx} y2={y + barH} stroke={b.color} strokeWidth={barW} strokeLinecap="round" />
                        <SvgText x={cx} y={zeroY + 14} fill={colors.mutedForeground} fontSize={8} textAnchor="middle">{b.label}</SvgText>
                        <SvgText x={cx} y={b.value >= 0 ? y - 4 : y + barH + 12} fill={b.color} fontSize={9} fontWeight="600" textAnchor="middle">
                          {b.value >= 0 ? "+" : ""}{b.value.toLocaleString()}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                </>
              );
            })()}
          </Svg>
        </View>
      </Card>

      {/* Options Holdings */}
      {optionsHoldings.length > 0 && (
        <Card style={fbStyles.card}>
          <Text style={fbStyles.cardTitle}>選擇權持倉</Text>
          {optionsHoldings.map((h, i) => (
            <View key={i} style={fbStyles.holdRow}>
              <Text style={fbStyles.holdMonth}>{h.contractMonth}</Text>
              <Text style={[fbStyles.holdCp, { color: h.callPut === "C" ? colors.success : colors.destructive }]}>{h.callPut}</Text>
              <Text style={fbStyles.holdStrike}>{h.strikePrice.toLocaleString()}</Text>
              <Text style={[fbStyles.holdQty, { color: h.netQuantity > 0 ? colors.success : colors.destructive }]}>
                {h.netQuantity > 0 ? "+" : ""}{h.netQuantity}
              </Text>
              <Text style={fbStyles.holdCost}>{h.avgCost.toFixed(1)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Trading Stats */}
      <Card style={fbStyles.card}>
        <Text style={fbStyles.cardTitle}>交易統計</Text>
        <View style={fbStyles.statGrid}>
          <StatItem label="總交易次數" value={String(trades.length)} />
          <StatItem label="股票交易" value={String(totalStockTrades)} />
          <StatItem label="選擇權交易" value={String(totalOptionsTrades)} />
          <StatItem label="買進" value={String(totalBuys)} color={colors.success} />
          <StatItem label="賣出" value={String(totalSells)} color={colors.destructive} />
          <StatItem label="總手續費" value={`$${totalFees.toLocaleString()}`} color={colors.warning} />
          {stockRevenue > 0 && (
            <StatItem label="股票賣出金額" value={`$${stockRevenue.toLocaleString()}`} />
          )}
          {stockCost > 0 && (
            <StatItem label="股票買入金額" value={`$${stockCost.toLocaleString()}`} />
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={fbStyles.statItem}>
      <Text style={fbStyles.statLabel}>{label}</Text>
      <Text style={[fbStyles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const fbStyles = StyleSheet.create({
  card: { padding: 14 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 8 },
  toggleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  toggleChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary,
  },
  toggleChipActive: {
    borderColor: colors.primary + "4d", backgroundColor: colors.primaryLight,
  },
  toggleText: { fontSize: 11, color: colors.mutedForeground },
  toggleTextActive: { color: colors.primary, fontWeight: "500" },
  pnlGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pnlBox: {
    flex: 1, minWidth: "45%", backgroundColor: colors.inputBg,
    borderRadius: 12, padding: 10,
  },
  pnlLabel: { fontSize: 10, color: colors.mutedForeground, textTransform: "uppercase", marginBottom: 2 },
  pnlValue: { fontSize: 18, fontWeight: "700", fontFamily: "monospace" },
  holdRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  holdMonth: { fontSize: 12, color: colors.foreground, fontFamily: "monospace", width: 60 },
  holdCp: { fontSize: 11, fontWeight: "700", width: 20, textAlign: "center" },
  holdStrike: { fontSize: 12, fontFamily: "monospace", color: colors.foreground, flex: 1, textAlign: "right" },
  holdQty: { fontSize: 12, fontFamily: "monospace", fontWeight: "700", width: 40, textAlign: "right" },
  holdCost: { fontSize: 12, fontFamily: "monospace", color: colors.mutedForeground, width: 50, textAlign: "right" },
  statGrid: { gap: 6 },
  statItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statLabel: { fontSize: 13, color: colors.mutedForeground },
  statValue: { fontSize: 14, fontWeight: "600", color: colors.foreground, fontFamily: "monospace" },
});

/* ── Form Renderers ── */

function renderStockForm(
  form: { tradeDate: string; action: "BUY" | "SELL"; symbol: string; price: string; quantity: string; fee: string; notes: string },
  setForm: React.Dispatch<React.SetStateAction<typeof form>>,
  onSubmit: () => void
) {
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.tradeDate}
          onChangeText={(v) => setForm((f) => ({ ...f, tradeDate: v }))}
          placeholder="YYYYMMDD"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.symbol}
          onChangeText={(v) => setForm((f) => ({ ...f, symbol: v }))}
          placeholder="股票代號"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="characters"
        />
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {(["BUY", "SELL"] as const).map((a) => (
          <Pressable
            key={a}
            style={[styles.chip, form.action === a && (a === "BUY" ? styles.chipBuy : styles.chipSell)]}
            onPress={() => setForm((f) => ({ ...f, action: a }))}
          >
            <Text style={[styles.chipText, form.action === a && styles.chipTextActive]}>
              {a === "BUY" ? "買進" : "賣出"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.price}
          onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
          placeholder="成交價"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.quantity}
          onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
          placeholder="股數"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.fee}
          onChangeText={(v) => setForm((f) => ({ ...f, fee: v }))}
          placeholder="手續費"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.notes}
          onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
          placeholder="備註（選填）"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <Pressable style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitBtnText}>新增股票交易</Text>
      </Pressable>
    </>
  );
}

function renderOptionsForm(
  form: { tradeDate: string; action: "BUY" | "SELL"; contractMonth: string; callPut: "C" | "P"; strikePrice: string; price: string; quantity: string; fee: string; notes: string },
  setForm: React.Dispatch<React.SetStateAction<typeof form>>,
  onSubmit: () => void
) {
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.tradeDate}
          onChangeText={(v) => setForm((f) => ({ ...f, tradeDate: v }))}
          placeholder="YYYYMMDD"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.contractMonth}
          onChangeText={(v) => setForm((f) => ({ ...f, contractMonth: v }))}
          placeholder="合約月份"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {(["BUY", "SELL"] as const).map((a) => (
          <Pressable
            key={a}
            style={[styles.chip, form.action === a && (a === "BUY" ? styles.chipBuy : styles.chipSell)]}
            onPress={() => setForm((f) => ({ ...f, action: a }))}
          >
            <Text style={[styles.chipText, form.action === a && styles.chipTextActive]}>
              {a === "BUY" ? "買進" : "賣出"}
            </Text>
          </Pressable>
        ))}
        {(["C", "P"] as const).map((cp) => (
          <Pressable
            key={cp}
            style={[styles.chip, form.callPut === cp && styles.chipActive]}
            onPress={() => setForm((f) => ({ ...f, callPut: cp }))}
          >
            <Text style={[styles.chipText, form.callPut === cp && styles.chipTextActive]}>
              {cp === "C" ? "Call" : "Put"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.strikePrice}
          onChangeText={(v) => setForm((f) => ({ ...f, strikePrice: v }))}
          placeholder="履約價"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.price}
          onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
          placeholder="成交價"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.quantity}
          onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
          placeholder="口數"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.fee}
          onChangeText={(v) => setForm((f) => ({ ...f, fee: v }))}
          placeholder="手續費"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <TextInput
        style={styles.input}
        value={form.notes}
        onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
        placeholder="備註（選填）"
        placeholderTextColor={colors.mutedForeground}
      />
      <Pressable style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitBtnText}>新增選擇權交易</Text>
      </Pressable>
    </>
  );
}

function renderLoanForm(
  form: { name: string; principal: string; annualRate: string; periods: string; startDate: string; notes: string },
  setForm: React.Dispatch<React.SetStateAction<typeof form>>,
  onSubmit: () => void
) {
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.startDate}
          onChangeText={(v) => setForm((f) => ({ ...f, startDate: v }))}
          placeholder="起始日 YYYYMMDD"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="貸款名稱"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.principal}
          onChangeText={(v) => setForm((f) => ({ ...f, principal: v }))}
          placeholder="本金"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.annualRate}
          onChangeText={(v) => setForm((f) => ({ ...f, annualRate: v }))}
          placeholder="年利率 %"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.periods}
          onChangeText={(v) => setForm((f) => ({ ...f, periods: v }))}
          placeholder="期數（月）"
          keyboardType="numeric"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={form.notes}
          onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
          placeholder="備註（選填）"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>
      <Pressable style={styles.submitBtn} onPress={onSubmit}>
        <Text style={styles.submitBtnText}>新增貸款</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  headerRight: { flexDirection: "row", gap: 4 },
  modeBtn: {
    padding: 8, borderRadius: 8, backgroundColor: colors.inputBg,
  },
  modeBtnActive: { backgroundColor: colors.primaryLight },

  segmentContainer: {
    flexDirection: "row", marginHorizontal: 16, marginVertical: 8,
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 3,
  },
  segment: {
    flex: 1, flexDirection: "row", paddingVertical: 7, borderRadius: 8,
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: "500", color: colors.mutedForeground },
  segmentTextActive: { color: colors.foreground, fontWeight: "600" },
  segmentCount: {
    fontSize: 11, fontWeight: "600", color: colors.mutedForeground,
    backgroundColor: colors.inputBg, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, overflow: "hidden",
  },
  segmentCountActive: { color: colors.primary, backgroundColor: colors.primaryLight },

  card: { padding: 14 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 8 },
  addHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  input: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 13, color: colors.foreground,
  },
  chip: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4,
  },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary + "66" },
  chipBuy: { backgroundColor: colors.successLight, borderColor: colors.success + "66" },
  chipSell: { backgroundColor: colors.destructiveLight, borderColor: colors.destructive + "66" },
  chipText: { fontSize: 11, color: colors.mutedForeground },
  chipTextActive: { color: colors.primary, fontWeight: "600" },

  submitBtn: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  tableHeader: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card, alignItems: "center",
  },
  thCell: { fontSize: 10, fontWeight: "600", color: colors.mutedForeground, textTransform: "uppercase" },

  tradeRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 4, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card, gap: 4,
  },
  tradeCell: { fontSize: 12, color: colors.foreground },
  typeBadge: {
    width: 22, height: 18, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  typeBadgeText: { fontSize: 9, fontWeight: "700" },

  // Calendar styles
  calNav: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12,
  },
  calNavTitle: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  calWeekRow: { flexDirection: "row", marginBottom: 4 },
  calWeekText: {
    flex: 1, textAlign: "center", fontSize: 11, fontWeight: "500",
    color: colors.mutedForeground,
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calDayCell: {
    width: "14.285%" as any, aspectRatio: 1,
    alignItems: "center", justifyContent: "center",
    borderRadius: 20,
  },
  calDayCellSelected: { backgroundColor: colors.primary },
  calDayCellToday: {
    borderWidth: 1, borderColor: colors.primary,
  },
  calDayText: { fontSize: 14, color: colors.foreground },
  calDayTextSelected: { color: "#fff", fontWeight: "700" },
  calDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.primary, marginTop: 2,
  },

  emptyBox: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
});
