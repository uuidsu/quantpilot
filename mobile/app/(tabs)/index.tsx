import React, { useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshCcw } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useSimulation } from "@/hooks/useSimulation";
import { useHoldings } from "@/hooks/useHoldings";
import { useOptionsTrades } from "@/hooks/useOptionsTrades";
import { HoldingCard } from "@/components/HoldingCard";
import { Card } from "@/components/Card";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { colors } from "@/constants/theme";

export default function OverviewScreen() {
  const { sim, loading } = useSimulation();
  const { holdings } = useHoldings(sim?.id);
  const { holdings: optHoldings } = useOptionsTrades();

  // 大盤模擬
  const [baseIndex, setBaseIndex] = useState(22000);
  const [simIndex, setSimIndex] = useState(22000);
  const marketAdjust = baseIndex > 0 ? ((simIndex - baseIndex) / baseIndex) * 100 : 0;
  const indexDelta = simIndex - baseIndex;

  if (loading || !sim) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>載入中...</Text>
      </SafeAreaView>
    );
  }

  const cash = 0;
  const totalAdjustedStockValue = holdings.reduce(
    (s, h) => s + h.shares * h.currentPrice * (1 + (marketAdjust / 100) * (h.beta ?? 1.0)), 0
  );

  // 選擇權模擬損益
  const optionsSimDelta = (() => {
    if (indexDelta === 0) return 0;
    const TXO_MULT = 50;
    return optHoldings.reduce((s, oh) => {
      const intrinsicNow = oh.callPut === "P"
        ? Math.max(oh.strikePrice - baseIndex, 0)
        : Math.max(baseIndex - oh.strikePrice, 0);
      const intrinsicSim = oh.callPut === "P"
        ? Math.max(oh.strikePrice - simIndex, 0)
        : Math.max(simIndex - oh.strikePrice, 0);
      return s + (intrinsicSim - intrinsicNow) * oh.netQuantity * TXO_MULT;
    }, 0);
  })();

  const totalValue = totalAdjustedStockValue + cash + optionsSimDelta;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>QuantPilot</Text>
          <Text style={styles.headerSub}>
            {holdings.length} 檔持股 · {optHoldings.length} 選擇權持倉
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Hero — total value */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>
            {indexDelta !== 0
              ? `模擬後淨資產（${indexDelta > 0 ? "+" : ""}${indexDelta.toFixed(0)} 點 / ${marketAdjust > 0 ? "+" : ""}${marketAdjust.toFixed(2)}%）`
              : "總淨資產"}
          </Text>
          <AnimatedNumber value={totalValue} prefix="$" style={styles.heroValue} />
        </View>

        {/* 大盤指數模擬 */}
        <Card style={styles.sectionCard}>
          <View style={styles.simRow}>
            <Text style={styles.simLabel}>大盤指數</Text>
            <TextInput
              value={String(baseIndex)}
              onChangeText={(v) => { const n = Number(v); setBaseIndex(n); setSimIndex(n + indexDelta); }}
              keyboardType="numeric"
              style={styles.simInput}
            />
          </View>
          <View style={styles.simRow}>
            <Text style={styles.simLabel}>漲跌模擬</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", fontFamily: "monospace", color: colors.foreground }}>
                {simIndex.toLocaleString()}
              </Text>
              <Text style={[styles.simBadge, {
                color: indexDelta > 0 ? colors.success : indexDelta < 0 ? colors.destructive : colors.mutedForeground,
                backgroundColor: indexDelta > 0 ? colors.success + "1a" : indexDelta < 0 ? colors.destructive + "1a" : colors.secondary,
              }]}>
                {indexDelta > 0 ? "+" : ""}{indexDelta.toFixed(0)} 點
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "monospace", color: colors.mutedForeground }}>
                {marketAdjust > 0 ? "+" : ""}{marketAdjust.toFixed(2)}%
              </Text>
            </View>
          </View>
          {/* @ts-ignore -- Slider not typed in some RN versions */}
          <TextInput
            value={String(simIndex)}
            onChangeText={(v) => setSimIndex(Number(v) || baseIndex)}
            keyboardType="numeric"
            placeholder="模擬指數"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.simInput, { marginTop: 4 }]}
          />
          <View style={styles.simRow}>
            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{Math.round(baseIndex * 0.5).toLocaleString()}</Text>
            {indexDelta !== 0 ? (
              <Pressable onPress={() => setSimIndex(baseIndex)}>
                <Text style={{ fontSize: 10, color: colors.primary }}>重置</Text>
              </Pressable>
            ) : (
              <Text style={{ fontSize: 10, color: colors.mutedForeground }}>輸入模擬指數</Text>
            )}
            <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{Math.round(baseIndex * 1.5).toLocaleString()}</Text>
          </View>
        </Card>

        {/* Stock Holdings */}
        {holdings.length > 0 && (() => {
          const totalStockSimDelta = holdings.reduce((s, h) => {
            return s + h.shares * h.currentPrice * (marketAdjust / 100) * (h.beta ?? 1.0);
          }, 0);

          return (
            <Card style={styles.sectionCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>股票持倉</Text>
                {indexDelta !== 0 && (
                  <Text style={[styles.optSimBadge, {
                    color: totalStockSimDelta >= 0 ? colors.success : colors.destructive,
                    backgroundColor: totalStockSimDelta >= 0 ? colors.success + "1a" : colors.destructive + "1a",
                  }]}>
                    模擬 {totalStockSimDelta >= 0 ? "+" : ""}{totalStockSimDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                )}
              </View>
              {holdings.map((h) => {
                const hSimDelta = h.shares * h.currentPrice * (marketAdjust / 100) * (h.beta ?? 1.0);
                return (
                  <HoldingCard
                    key={h.id}
                    holding={h}
                    totalAdjustedValue={totalValue}
                    simDelta={indexDelta !== 0 ? hSimDelta : undefined}
                  />
                );
              })}
            </Card>
          );
        })()}

        {/* Options Holdings */}
        {optHoldings.length > 0 && (() => {
          const TXO_MULT = 50;
          const computeOptSimDelta = (oh: typeof optHoldings[0]) => {
            if (indexDelta === 0) return 0;
            const intrinsicNow = oh.callPut === "P"
              ? Math.max(oh.strikePrice - baseIndex, 0)
              : Math.max(baseIndex - oh.strikePrice, 0);
            const intrinsicSim = oh.callPut === "P"
              ? Math.max(oh.strikePrice - simIndex, 0)
              : Math.max(simIndex - oh.strikePrice, 0);
            return (intrinsicSim - intrinsicNow) * oh.netQuantity * TXO_MULT;
          };
          const totalOptSimDelta = optHoldings.reduce((s, h) => s + computeOptSimDelta(h), 0);

          return (
            <Card style={styles.sectionCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>選擇權持倉</Text>
                {indexDelta !== 0 && (
                  <Text style={[styles.optSimBadge, {
                    color: totalOptSimDelta >= 0 ? colors.success : colors.destructive,
                    backgroundColor: totalOptSimDelta >= 0 ? colors.success + "1a" : colors.destructive + "1a",
                  }]}>
                    模擬 {totalOptSimDelta >= 0 ? "+" : ""}{totalOptSimDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </Text>
                )}
              </View>
              {optHoldings.map((h, i) => {
                const optSD = computeOptSimDelta(h);
                return (
                  <View key={i} style={styles.optRow}>
                    <Text style={styles.optMonth}>{h.contractMonth}</Text>
                    <Text style={[styles.optCp, { color: h.callPut === "C" ? colors.success : colors.destructive }]}>
                      {h.callPut}
                    </Text>
                    <Text style={styles.optStrike}>{h.strikePrice.toLocaleString()}</Text>
                    <Text style={[styles.optQty, { color: h.netQuantity > 0 ? colors.success : colors.destructive }]}>
                      {h.netQuantity > 0 ? "+" : ""}{h.netQuantity}
                    </Text>
                    <Text style={styles.optCost}>均 {h.avgCost.toFixed(1)}</Text>
                    {indexDelta !== 0 && (
                      <Text style={[styles.optSimVal, { color: optSD >= 0 ? colors.success : colors.destructive }]}>
                        {optSD >= 0 ? "+" : ""}{optSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Text>
                    )}
                  </View>
                );
              })}
            </Card>
          );
        })()}

        {/* Cash */}
        <Card style={styles.sectionCard}>
          <View style={styles.cashHeader}>
            <View>
              <Text style={styles.sectionTitle}>現金／負債</Text>
              <Text style={styles.cashSub}>負數代表負債，計入總淨資產</Text>
            </View>
            <Text style={[styles.cashValueLg, { color: cash >= 0 ? colors.success : colors.destructive }]}>
              {cash >= 0 ? "" : "-"}${Math.abs(cash).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </Card>

        {/* Empty state */}
        {holdings.length === 0 && optHoldings.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>尚無持倉，點擊右上角新增持股</Text>
            <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4 }]}>
              或在「交易」tab 新增選擇權交易
            </Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  loadingText: { fontSize: 14, color: colors.mutedForeground, marginTop: 12 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  headerSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },

  // Hero
  hero: { alignItems: "center", paddingVertical: 12 },
  heroLabel: { fontSize: 10, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 },
  heroValue: { fontSize: 34, fontWeight: "700", color: colors.foreground },

  // Sections
  sectionCard: { padding: 14 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginBottom: 8 },

  // Simulation
  simRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  simLabel: { fontSize: 12, color: colors.mutedForeground },
  simInput: {
    backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 12, height: 36,
    color: colors.foreground, fontFamily: "monospace", fontSize: 13, textAlign: "right",
  },
  simBadge: { fontSize: 13, fontWeight: "700", fontFamily: "monospace", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },

  // Options holdings
  optRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  optMonth: { fontSize: 12, color: colors.foreground, fontFamily: "monospace", width: 60 },
  optCp: { fontSize: 11, fontWeight: "700", width: 18, textAlign: "center" },
  optStrike: { fontSize: 12, fontFamily: "monospace", color: colors.foreground, flex: 1, textAlign: "right" },
  optQty: { fontSize: 12, fontFamily: "monospace", fontWeight: "700", width: 36, textAlign: "right" },
  optCost: { fontSize: 11, fontFamily: "monospace", color: colors.mutedForeground, width: 60, textAlign: "right" },
  optSimVal: { fontSize: 11, fontFamily: "monospace", fontWeight: "600", width: 70, textAlign: "right" },
  optSimBadge: { fontSize: 11, fontFamily: "monospace", fontWeight: "600", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, overflow: "hidden" },

  // Cash
  cashHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cashSub: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
  cashValueLg: { fontSize: 18, fontWeight: "700", fontFamily: "monospace" },

  emptyBox: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 14, color: colors.mutedForeground },
});
