import React, { useState } from "react";
import {
  View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator,
  TextInput, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshCcw, Plus, Trash2 } from "lucide-react-native";
import Toast from "react-native-toast-message";
import Svg, { Polyline, Line as SvgLine, Text as SvgText } from "react-native-svg";
import { useOptionsDelta } from "@/hooks/useOptionsDelta";
import { useOptionsTrades } from "@/hooks/useOptionsTrades";
import { Card } from "@/components/Card";
import { colors } from "@/constants/theme";
import { filterOptionsRows, extractContractMonths, classifyContractMonth } from "@shared/optionsFilter";
import type { OptionsDeltaRow } from "@/types";
import type { OptionsFilter } from "@/types";

type SubTab = "trades" | "delta";

export default function OptionsScreen() {
  const [subTab, setSubTab] = useState<SubTab>("trades");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>選擇權</Text>
      </View>

      {/* Sub-tab switcher */}
      <View style={styles.segmentContainer}>
        {(["trades", "delta"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.segment, subTab === t && styles.segmentActive]}
            onPress={() => setSubTab(t)}
          >
            <Text style={[styles.segmentText, subTab === t && styles.segmentTextActive]}>
              {t === "trades" ? "交易紀錄" : "Delta 資料"}
            </Text>
          </Pressable>
        ))}
      </View>

      {subTab === "trades" ? <TradesView /> : <DeltaView />}
    </SafeAreaView>
  );
}

/* ── TRADES VIEW ── */
function TradesView() {
  const { trades, holdings, pnlSummary, pnlHistory, loading, refresh, add, remove } = useOptionsTrades({ loadPriceMap: true });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
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

  const handleAdd = async () => {
    if (!form.contractMonth || !form.strikePrice || !form.price) {
      Toast.show({ type: "error", text1: "請填寫必要欄位" });
      return;
    }
    try {
      await add({
        tradeDate: form.tradeDate,
        action: form.action,
        contractMonth: form.contractMonth,
        callPut: form.callPut,
        strikePrice: Number(form.strikePrice),
        price: Number(form.price),
        quantity: Number(form.quantity),
        fee: Number(form.fee),
        notes: form.notes || null,
      });
      Toast.show({ type: "success", text1: "交易已新增" });
      setShowForm(false);
      setForm(f => ({ ...f, strikePrice: "", price: "", quantity: "1", fee: "0", notes: "" }));
    } catch {
      Toast.show({ type: "error", text1: "新增失敗" });
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("確認刪除", "確定要刪除此交易紀錄？", [
      { text: "取消", style: "cancel" },
      { text: "刪除", style: "destructive", onPress: () => remove(id) },
    ]);
  };

  // Chart dimensions
  const chartW = 320;
  const chartH = 120;
  const chartPadL = 40;
  const chartPadR = 10;
  const chartPadT = 10;
  const chartPadB = 20;
  const innerW = chartW - chartPadL - chartPadR;
  const innerH = chartH - chartPadT - chartPadB;

  const pnl = pnlSummary;

  const renderHeader = () => (
    <View style={{ gap: 12 }}>
      {/* P&L Summary */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>損益概覽</Text>
        <View style={styles.pnlGrid}>
          <View style={styles.pnlBox}>
            <Text style={styles.pnlLabel}>已實現</Text>
            <Text style={[styles.pnlValue, { color: pnl.realizedPnl >= 0 ? colors.success : colors.destructive }]}>
              {pnl.realizedPnl >= 0 ? "+" : ""}{pnl.realizedPnl.toLocaleString()}
            </Text>
          </View>
          <View style={styles.pnlBox}>
            <Text style={styles.pnlLabel}>未實現</Text>
            <Text style={[styles.pnlValue, { color: pnl.unrealizedPnl >= 0 ? colors.success : colors.destructive }]}>
              {pnl.unrealizedPnl >= 0 ? "+" : ""}{pnl.unrealizedPnl.toLocaleString()}
            </Text>
          </View>
          <View style={styles.pnlBox}>
            <Text style={styles.pnlLabel}>手續費</Text>
            <Text style={[styles.pnlValue, { color: colors.warning }]}>{pnl.totalFees.toLocaleString()}</Text>
          </View>
          <View style={styles.pnlBox}>
            <Text style={styles.pnlLabel}>淨損益</Text>
            <Text style={[styles.pnlValue, { color: pnl.totalPnl >= 0 ? colors.success : colors.destructive }]}>
              {pnl.totalPnl >= 0 ? "+" : ""}{pnl.totalPnl.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>

      {/* P&L Chart */}
      {pnlHistory.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>近 45 天損益</Text>
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Svg width={chartW} height={chartH}>
              {(() => {
                const vals = pnlHistory.map(p => p.totalPnl);
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
                    {/* X-axis labels */}
                    {[0, Math.floor(pnlHistory.length / 2), pnlHistory.length - 1].map(idx => (
                      <SvgText key={idx} x={toX(idx)} y={chartH - 2} fill={colors.mutedForeground} fontSize={8} textAnchor="middle">
                        {pnlHistory[idx].date}
                      </SvgText>
                    ))}
                  </>
                );
              })()}
            </Svg>
          </View>
        </Card>
      )}

      {/* Holdings */}
      {holdings.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>持倉部位</Text>
          {(() => {
            const holdingMonths = holdings.map(x => x.contractMonth).filter(Boolean) as string[];
            return holdings.map((h, i) => {
              const holdingTag = classifyContractMonth(h.contractMonth, holdingMonths);
              return (
                <View key={i} style={styles.holdingRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, width: 80 }}>
                    <Text style={styles.holdingMonth}>{h.contractMonth}</Text>
                    {holdingTag && (
                      <Text style={[styles.monthTag, holdingTag === "近月" ? styles.tagNear : styles.tagNext]}>{holdingTag}</Text>
                    )}
                  </View>
                  <Text style={[styles.holdingCp, { color: h.callPut === "C" ? colors.success : colors.destructive }]}>
                    {h.callPut}
                  </Text>
                  <Text style={styles.holdingStrike}>{h.strikePrice.toLocaleString()}</Text>
                  <Text style={[styles.holdingQty, { color: h.netQuantity > 0 ? colors.success : colors.destructive }]}>
                    {h.netQuantity > 0 ? "+" : ""}{h.netQuantity}
                  </Text>
                  <Text style={styles.holdingCost}>{h.avgCost.toFixed(1)}</Text>
                </View>
              );
            });
          })()}
        </Card>
      )}

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
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.tradeDate}
                onChangeText={(v) => setForm(f => ({ ...f, tradeDate: v }))}
                placeholder="YYYYMMDD"
                placeholderTextColor={colors.mutedForeground}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.contractMonth}
                onChangeText={(v) => setForm(f => ({ ...f, contractMonth: v }))}
                placeholder="合約月份"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["BUY", "SELL"] as const).map(a => (
                <Pressable
                  key={a}
                  style={[styles.chip, form.action === a && (a === "BUY" ? styles.chipBuy : styles.chipSell)]}
                  onPress={() => setForm(f => ({ ...f, action: a }))}
                >
                  <Text style={[styles.chipText, form.action === a && styles.chipTextActive]}>
                    {a === "BUY" ? "買進" : "賣出"}
                  </Text>
                </Pressable>
              ))}
              {(["C", "P"] as const).map(cp => (
                <Pressable
                  key={cp}
                  style={[styles.chip, form.callPut === cp && styles.chipActive]}
                  onPress={() => setForm(f => ({ ...f, callPut: cp }))}
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
                onChangeText={(v) => setForm(f => ({ ...f, strikePrice: v }))}
                placeholder="履約價"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.price}
                onChangeText={(v) => setForm(f => ({ ...f, price: v }))}
                placeholder="成交價"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.quantity}
                onChangeText={(v) => setForm(f => ({ ...f, quantity: v }))}
                placeholder="口數"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={form.fee}
                onChangeText={(v) => setForm(f => ({ ...f, fee: v }))}
                placeholder="手續費"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <TextInput
              style={styles.input}
              value={form.notes}
              onChangeText={(v) => setForm(f => ({ ...f, notes: v }))}
              placeholder="備註（選填）"
              placeholderTextColor={colors.mutedForeground}
            />
            <Pressable style={styles.submitBtn} onPress={handleAdd}>
              <Text style={styles.submitBtnText}>新增交易</Text>
            </Pressable>
          </View>
        )}
      </Card>

      {/* Trade list header */}
      {trades.length > 0 && (
        <View style={styles.tableHeader}>
          <Text style={[styles.thCell, { width: 50 }]}>日期</Text>
          <Text style={[styles.thCell, { width: 30, textAlign: "center" }]}>B/S</Text>
          <Text style={[styles.thCell, { width: 25, textAlign: "center" }]}>C/P</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>履約價</Text>
          <Text style={[styles.thCell, { flex: 1, textAlign: "right" }]}>價格</Text>
          <Text style={[styles.thCell, { width: 30, textAlign: "right" }]}>口</Text>
          <Text style={[styles.thCell, { width: 30 }]}></Text>
        </View>
      )}
    </View>
  );

  const renderTrade = ({ item: t }: { item: typeof trades[0] }) => (
    <View style={styles.tradeRow}>
      <Text style={[styles.tradeCell, { width: 50, fontFamily: "monospace" }]}>
        {t.tradeDate.slice(4, 6)}/{t.tradeDate.slice(6, 8)}
      </Text>
      <View style={{ width: 30, alignItems: "center" }}>
        <Text style={[styles.tradeBadge, { color: t.action === "BUY" ? colors.success : colors.destructive }]}>
          {t.action === "BUY" ? "買" : "賣"}
        </Text>
      </View>
      <Text style={[styles.tradeCell, { width: 25, textAlign: "center", color: t.callPut === "C" ? colors.success : colors.destructive }]}>
        {t.callPut}
      </Text>
      <Text style={[styles.tradeCell, { flex: 1, textAlign: "right", fontFamily: "monospace" }]}>
        {t.strikePrice.toLocaleString()}
      </Text>
      <Text style={[styles.tradeCell, { flex: 1, textAlign: "right", fontFamily: "monospace" }]}>
        {t.price}
      </Text>
      <Text style={[styles.tradeCell, { width: 30, textAlign: "right", fontFamily: "monospace" }]}>
        {t.quantity}
      </Text>
      <Pressable style={{ width: 30, alignItems: "center" }} onPress={() => handleDelete(t.id)}>
        <Trash2 size={14} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );

  return (
    <FlatList
      data={trades}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderTrade}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={{ padding: 16, gap: 4 }}
      refreshing={loading}
      onRefresh={refresh}
      ListEmptyComponent={
        !loading ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>尚無交易紀錄</Text>
            <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>點擊「新增交易」開始記錄</Text>
          </View>
        ) : null
      }
    />
  );
}

/* ── DELTA VIEW ── */
function DeltaView() {
  const {
    rows, dates, selectedDate, fetching, filter, setFilter,
    stats, cooldownRemain, fetchDelta, changeDate,
  } = useOptionsDelta();

  const contractMonths = extractContractMonths(rows);
  const filtered = filterOptionsRows(rows, filter);

  const todayCalls = stats.calls.filter(
    (c) => c.createdAt && new Date(c.createdAt).toDateString() === new Date().toDateString()
  );
  const successCount = todayCalls.filter((c) => c.success).length;
  const failCount = todayCalls.filter((c) => !c.success).length;

  const handleFetch = async () => {
    const result = await fetchDelta();
    if (result && "error" in result) {
      Toast.show({ type: "error", text1: result.error });
    } else if (result) {
      Toast.show({ type: "success", text1: `已抓取 ${result.count} 筆 (${result.date})` });
    }
  };

  const FilterChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const setFilterField = <K extends keyof OptionsFilter>(key: K, val: OptionsFilter[K]) =>
    setFilter((prev) => ({ ...prev, [key]: val }));

  const renderRow = ({ item }: { item: OptionsDeltaRow }) => (
    <View style={styles.deltaRow}>
      <Text style={[styles.deltaCell, styles.cellSmall, { color: item.callPut === "C" ? colors.success : colors.destructive }]}>
        {item.callPut}
      </Text>
      <View style={[styles.cellMed, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
        <Text style={styles.deltaCell}>{item.contractMonth ?? "-"}</Text>
        {item.contractMonth && (() => {
          const tag = classifyContractMonth(item.contractMonth, contractMonths);
          if (!tag) return null;
          return <Text style={[styles.monthTag, tag === "近月" ? styles.tagNear : styles.tagNext]}>{tag}</Text>;
        })()}
      </View>
      <Text style={[styles.deltaCell, styles.cellMed, styles.mono]}>{item.strikePrice}</Text>
      <Text style={[styles.deltaCell, styles.cellMed, styles.mono]}>
        {item.delta != null ? item.delta.toFixed(4) : "-"}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.controlBox}>
        <View style={styles.fetchRow}>
          <Pressable
            style={[styles.fetchBtn, (fetching || cooldownRemain > 0) && styles.fetchBtnDisabled]}
            onPress={handleFetch}
            disabled={fetching || cooldownRemain > 0}
          >
            {fetching ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <>
                <RefreshCcw size={14} color={cooldownRemain > 0 ? colors.mutedForeground : colors.foreground} />
                <Text style={[styles.fetchBtnText, cooldownRemain > 0 && { color: colors.mutedForeground }]}>
                  {cooldownRemain > 0 ? `冷卻 ${cooldownRemain} 分鐘` : "抓取資料"}
                </Text>
              </>
            )}
          </Pressable>
          <View style={styles.statsRow}>
            <Text style={[styles.statBadge, { color: colors.success }]}>{successCount} 成功</Text>
            {failCount > 0 && <Text style={[styles.statBadge, { color: colors.destructive }]}>{failCount} 失敗</Text>}
          </View>
        </View>

        {dates.length > 0 && (
          <View style={styles.dateRow}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={dates}
              keyExtractor={(d) => d}
              renderItem={({ item: d }) => (
                <FilterChip label={d} active={d === selectedDate} onPress={() => changeDate(d)} />
              )}
              contentContainerStyle={{ gap: 6 }}
            />
          </View>
        )}

        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            {(["ALL", "C", "P"] as const).map((v) => (
              <FilterChip key={v} label={v === "ALL" ? "全部" : v === "C" ? "Call" : "Put"} active={filter.callPut === v} onPress={() => setFilterField("callPut", v)} />
            ))}
          </View>
          {contractMonths.length > 0 && (
            <View style={styles.filterRow}>
              <FilterChip label="全部月份" active={filter.contractMonth === "ALL"} onPress={() => setFilterField("contractMonth", "ALL")} />
              {contractMonths.map((m) => {
                const tag = classifyContractMonth(m, contractMonths);
                const monthNum = parseInt(m.slice(4, 6), 10);
                const label = tag ? `${tag} (${monthNum}月)` : m;
                return <FilterChip key={m} label={label} active={filter.contractMonth === m} onPress={() => setFilterField("contractMonth", m)} />;
              })}
            </View>
          )}
        </View>
        <Text style={styles.filterCount}>{filtered.length} / {rows.length} 筆</Text>
      </View>

      <View style={styles.deltaTableHeader}>
        <Text style={[styles.thCell, styles.cellSmall]}>C/P</Text>
        <Text style={[styles.thCell, styles.cellMed]}>合約月</Text>
        <Text style={[styles.thCell, styles.cellMed]}>履約價</Text>
        <Text style={[styles.thCell, styles.cellMed]}>Delta</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {rows.length === 0 ? "尚無資料，請點擊抓取" : "篩選後無結果"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },

  segmentContainer: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 8,
    backgroundColor: colors.inputBg, borderRadius: 10, padding: 3,
  },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segmentActive: { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  segmentText: { fontSize: 13, fontWeight: "500", color: colors.mutedForeground },
  segmentTextActive: { color: colors.foreground, fontWeight: "600" },

  card: { padding: 14 },
  cardTitle: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 8 },

  pnlGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pnlBox: {
    flex: 1, minWidth: "45%", backgroundColor: colors.inputBg,
    borderRadius: 12, padding: 10,
  },
  pnlLabel: { fontSize: 10, color: colors.mutedForeground, textTransform: "uppercase", marginBottom: 2 },
  pnlValue: { fontSize: 18, fontWeight: "700", fontFamily: "monospace" },

  holdingRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  holdingMonth: { fontSize: 12, color: colors.foreground, fontFamily: "monospace" },
  monthTag: { fontSize: 9, fontWeight: "700", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  tagNear: { backgroundColor: "rgba(245,158,11,0.2)", color: "#F59E0B" },
  tagNext: { backgroundColor: "rgba(14,165,233,0.2)", color: "#0EA5E9" },
  holdingCp: { fontSize: 11, fontWeight: "700", width: 20, textAlign: "center" },
  holdingStrike: { fontSize: 12, fontFamily: "monospace", color: colors.foreground, flex: 1, textAlign: "right" },
  holdingQty: { fontSize: 12, fontFamily: "monospace", fontWeight: "700", width: 40, textAlign: "right" },
  holdingCost: { fontSize: 12, fontFamily: "monospace", color: colors.mutedForeground, width: 50, textAlign: "right" },

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
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tradeCell: { fontSize: 12, color: colors.foreground },
  tradeBadge: { fontSize: 10, fontWeight: "700" },

  // Delta view styles
  controlBox: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  fetchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fetchBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.secondary,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  fetchBtnDisabled: { opacity: 0.5 },
  fetchBtnText: { fontSize: 12, fontWeight: "500", color: colors.foreground },
  statsRow: { flexDirection: "row", gap: 8 },
  statBadge: { fontSize: 11, fontWeight: "500" },
  dateRow: { marginTop: 4 },
  filterSection: { gap: 6, paddingBottom: 4 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  filterCount: { fontSize: 11, color: colors.mutedForeground },
  deltaTableHeader: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
  },
  cellSmall: { width: 40 },
  cellMed: { flex: 1 },
  deltaRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  deltaCell: { fontSize: 12, color: colors.foreground },
  mono: { fontFamily: "monospace" },
  listContent: { paddingBottom: 32 },
  emptyBox: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});
