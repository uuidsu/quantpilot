import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshCcw } from "lucide-react-native";
import { Card } from "@/components/Card";
import { colors } from "@/constants/theme";
import * as api from "@/services/api";
import type { OptionsDeltaRow, ApiUsage } from "@/types";

type SubTab = "price" | "delta" | "usage";

export default function DatabaseScreen() {
  const [subTab, setSubTab] = useState<SubTab>("price");
  const [loading, setLoading] = useState(false);
  const [priceCache, setPriceCache] = useState<any[]>([]);
  const [deltaCache, setDeltaCache] = useState<OptionsDeltaRow[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsage[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, d, u] = await Promise.all([
        api.getDbPriceCache(),
        api.getDbDeltaCache(),
        api.getDbApiUsage(),
      ]);
      setPriceCache(p);
      setDeltaCache(d);
      setApiUsage(u);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>資料庫</Text>
          <Text style={styles.headerSub}>快取與 API 紀錄</Text>
        </View>
        <Pressable onPress={loadData} disabled={loading} style={styles.refreshBtn}>
          <RefreshCcw size={14} color={colors.primary} style={loading ? undefined : undefined} />
          <Text style={styles.refreshText}>重新整理</Text>
        </Pressable>
      </View>

      {/* Sub-tab switcher */}
      <View style={styles.tabBar}>
        {([
          { id: "price" as SubTab, label: "股價快取" },
          { id: "delta" as SubTab, label: "選擇權 Delta" },
          { id: "usage" as SubTab, label: "API 紀錄" },
        ]).map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setSubTab(t.id)}
            style={[styles.tab, subTab === t.id && styles.tabActive]}
          >
            <Text style={[styles.tabText, subTab === t.id && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* 股價快取 */}
          {subTab === "price" && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>股價快取（{priceCache.length} 筆）</Text>
              {priceCache.length === 0 ? (
                <Text style={styles.emptyText}>尚無快取資料</Text>
              ) : (
                <>
                  {/* Header row */}
                  <View style={styles.tableRow}>
                    <Text style={[styles.th, { width: 70 }]}>代號</Text>
                    <Text style={[styles.th, { width: 60 }]}>來源</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>價格</Text>
                    <Text style={[styles.th, { width: 80, textAlign: "right" }]}>時間</Text>
                  </View>
                  {priceCache.map((r: any) => (
                    <View key={r.id} style={styles.tableRow}>
                      <Text style={[styles.td, styles.mono, styles.bold, { width: 70 }]}>{r.symbol}</Text>
                      <Text style={[styles.td, styles.muted, { width: 60 }]}>{r.source}</Text>
                      <Text style={[styles.td, styles.mono, { flex: 1, textAlign: "right" }]}>${r.price?.toFixed(2)}</Text>
                      <Text style={[styles.td, styles.muted, { width: 80, textAlign: "right" }]}>
                        {r.fetchedAt ? new Date(r.fetchedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </Card>
          )}

          {/* 選擇權 Delta */}
          {subTab === "delta" && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>選擇權 Delta 快取（{deltaCache.length} 筆）</Text>
              {deltaCache.length === 0 ? (
                <Text style={styles.emptyText}>尚無 Delta 資料</Text>
              ) : (
                <>
                  <View style={styles.tableRow}>
                    <Text style={[styles.th, { width: 55 }]}>日期</Text>
                    <Text style={[styles.th, { width: 45 }]}>月份</Text>
                    <Text style={[styles.th, { width: 20, textAlign: "center" }]}>C/P</Text>
                    <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>履約</Text>
                    <Text style={[styles.th, { width: 45, textAlign: "right" }]}>收盤</Text>
                    <Text style={[styles.th, { width: 50, textAlign: "right" }]}>Delta</Text>
                    <Text style={[styles.th, { width: 35, textAlign: "right" }]}>量</Text>
                  </View>
                  {deltaCache.map((r) => (
                    <View key={r.id} style={styles.tableRow}>
                      <Text style={[styles.td, styles.mono, { width: 55, fontSize: 10 }]}>{r.tradeDate}</Text>
                      <Text style={[styles.td, styles.mono, { width: 45, fontSize: 10 }]}>{r.contractMonth ?? "—"}</Text>
                      <Text style={[styles.td, { width: 20, textAlign: "center", fontWeight: "700", color: r.callPut === "C" ? colors.success : colors.destructive }]}>{r.callPut}</Text>
                      <Text style={[styles.td, styles.mono, { flex: 1, textAlign: "right" }]}>{r.strikePrice.toLocaleString()}</Text>
                      <Text style={[styles.td, styles.mono, { width: 45, textAlign: "right" }]}>{r.closePrice ?? "—"}</Text>
                      <Text style={[styles.td, styles.mono, { width: 50, textAlign: "right" }]}>{r.delta != null ? r.delta.toFixed(4) : "—"}</Text>
                      <Text style={[styles.td, styles.mono, styles.muted, { width: 35, textAlign: "right" }]}>{r.volume ?? "—"}</Text>
                    </View>
                  ))}
                </>
              )}
            </Card>
          )}

          {/* API 使用紀錄 */}
          {subTab === "usage" && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>API 呼叫紀錄（{apiUsage.length} 筆）</Text>
              {apiUsage.length === 0 ? (
                <Text style={styles.emptyText}>尚無呼叫紀錄</Text>
              ) : (
                <>
                  <View style={styles.tableRow}>
                    <Text style={[styles.th, { width: 16 }]}></Text>
                    <Text style={[styles.th, { width: 60 }]}>來源</Text>
                    <Text style={[styles.th, { flex: 1 }]}>代號</Text>
                    <Text style={[styles.th, { width: 50, textAlign: "right" }]}>耗時</Text>
                    <Text style={[styles.th, { width: 70, textAlign: "right" }]}>時間</Text>
                  </View>
                  {apiUsage.map((r) => (
                    <View key={r.id} style={styles.tableRow}>
                      <View style={[styles.dot, { backgroundColor: r.success ? colors.success : colors.destructive, width: 8, height: 8, borderRadius: 4 }]} />
                      <Text style={[styles.td, styles.muted, { width: 60 }]}>{r.source}</Text>
                      <Text style={[styles.td, styles.mono, styles.bold, { flex: 1 }]}>{r.symbol}</Text>
                      <Text style={[styles.td, styles.mono, styles.muted, { width: 50, textAlign: "right" }]}>
                        {r.responseTimeMs != null ? `${r.responseTimeMs}ms` : "—"}
                      </Text>
                      <Text style={[styles.td, styles.muted, { width: 70, textAlign: "right" }]}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  refreshBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + "4d",
    borderRadius: 20, paddingHorizontal: 14, height: 34,
  },
  refreshText: { fontSize: 12, fontWeight: "500", color: colors.primary },
  tabBar: {
    flexDirection: "row", gap: 4, margin: 16, marginBottom: 0,
    backgroundColor: colors.secondary, borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 11, fontWeight: "600", color: colors.mutedForeground },
  tabTextActive: { color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { padding: 0, overflow: "hidden" },
  cardTitle: {
    fontSize: 11, fontWeight: "600", color: colors.mutedForeground,
    textTransform: "uppercase", letterSpacing: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", paddingVertical: 32 },
  tableRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  th: { fontSize: 10, fontWeight: "500", color: colors.mutedForeground },
  td: { fontSize: 11, color: colors.foreground },
  mono: { fontFamily: "monospace" },
  bold: { fontWeight: "700" },
  muted: { color: colors.mutedForeground },
  dot: { marginRight: 2 },
});
