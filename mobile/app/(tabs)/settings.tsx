import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wifi, Check, Settings as SettingsIcon, RefreshCcw, Clock, Download } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import { useSimulation } from "@/hooks/useSimulation";
import { useHoldings } from "@/hooks/useHoldings";
import { Card } from "@/components/Card";
import { ApiStatsCard } from "@/components/ApiStatsCard";
import { colors } from "@/constants/theme";
import { PROVIDER_DEFS } from "@/constants/providers";
import * as api from "@/services/api";
import type { SourceConfig, ApiUsage } from "@/types";

const REFRESH_KEY = "price_refresh_interval";
const INTERVAL_OPTIONS = [
  { label: "關閉", value: 0 },
  { label: "1 分鐘", value: 60 },
  { label: "5 分鐘", value: 300 },
  { label: "15 分鐘", value: 900 },
  { label: "30 分鐘", value: 1800 },
  { label: "1 小時", value: 3600 },
];

export default function SettingsScreen() {
  const { sim, resetSim } = useSimulation();
  const { holdings, clear: clearHoldings, fetchPrice } = useHoldings(sim?.id);
  const [sourceConfigs, setSourceConfigs] = useState<SourceConfig[]>([]);
  const [apiStats, setApiStats] = useState<ApiUsage[]>([]);
  const [keyDraft, setKeyDraft] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingDelta, setIsFetchingDelta] = useState(false);
  const [dailyRefreshTime, setDailyRefreshTime] = useState("14:00");

  useEffect(() => {
    api.getSourceConfigs().then(setSourceConfigs).catch(() => {});
    api.getApiStats().then(setApiStats).catch(() => {});
    AsyncStorage.getItem(REFRESH_KEY).then((v) => {
      if (v) setRefreshInterval(Number(v));
    });
    api.getAppSettings().then(s => {
      if (s.dailyRefreshTime) setDailyRefreshTime(s.dailyRefreshTime);
    }).catch(() => {});
  }, []);

  const needsRefresh = (h: typeof holdings[0], intervalSec: number) => {
    if (!h.priceUpdatedAt) return true;
    const age = Date.now() - new Date(h.priceUpdatedAt).getTime();
    return age >= intervalSec * 1000;
  };

  // 自動定期刷新
  useEffect(() => {
    if (refreshInterval <= 0 || holdings.length === 0) return;
    const id = setInterval(async () => {
      for (const h of holdings) {
        if (!needsRefresh(h, refreshInterval)) continue;
        try { await fetchPrice(h); } catch {}
      }
    }, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [refreshInterval, holdings, fetchPrice]);

  const handleSetInterval = async (seconds: number) => {
    setRefreshInterval(seconds);
    await AsyncStorage.setItem(REFRESH_KEY, String(seconds));
    Toast.show({ type: "success", text1: seconds > 0 ? `已設定每 ${INTERVAL_OPTIONS.find(o => o.value === seconds)?.label} 刷新` : "已關閉自動刷新" });
  };

  const MANUAL_COOLDOWN = 5 * 60; // 5 分鐘內不重複拉

  const handleManualRefresh = async () => {
    if (holdings.length === 0) {
      Toast.show({ type: "info", text1: "尚無持股" });
      return;
    }
    const stale = holdings.filter((h) => needsRefresh(h, MANUAL_COOLDOWN));
    if (stale.length === 0) {
      Toast.show({ type: "info", text1: "所有股價皆為最新（5 分鐘內）" });
      return;
    }
    setIsRefreshing(true);
    let ok = 0;
    for (const h of stale) {
      try { await fetchPrice(h); ok++; } catch {}
    }
    setIsRefreshing(false);
    Toast.show({ type: "success", text1: `已更新 ${ok}/${stale.length} 檔股價` });
  };

  const handleFetchDelta = async () => {
    setIsFetchingDelta(true);
    try {
      const result = await api.fetchOptionsDelta("TXO");
      if ("error" in result) {
        Toast.show({ type: "error", text1: result.error });
      } else {
        Toast.show({ type: "success", text1: `已抓取 ${result.count} 筆 Delta (${result.date})` });
      }
    } catch {
      Toast.show({ type: "error", text1: "抓取 Delta 失敗" });
    } finally {
      setIsFetchingDelta(false);
    }
  };

  const defaultSourceId = sourceConfigs.find((c) => c.isDefault)?.sourceId ?? "twse";

  const handleSaveKey = async (sourceId: string) => {
    const key = keyDraft[sourceId]?.trim() ?? "";
    setSavingKey(sourceId);
    try {
      const updated = await api.upsertSourceConfig(sourceId, key || null);
      setSourceConfigs((prev) => {
        const exists = prev.find((c) => c.sourceId === sourceId);
        return exists ? prev.map((c) => (c.sourceId === sourceId ? updated : c)) : [...prev, updated];
      });
      Toast.show({ type: "success", text1: "已儲存" });
    } catch {
      Toast.show({ type: "error", text1: "儲存失敗" });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSetDefault = async (sourceId: string) => {
    const def = PROVIDER_DEFS.find((p) => p.id === sourceId)!;
    if (def.requiresKey) {
      const cfg = sourceConfigs.find((c) => c.sourceId === sourceId);
      if (!cfg?.apiKey) {
        Toast.show({ type: "error", text1: `請先設定 ${def.label} 的 API Key` });
        return;
      }
    }
    try {
      await api.setDefaultSource(sourceId);
      setSourceConfigs((prev) => prev.map((c) => ({ ...c, isDefault: c.sourceId === sourceId })));
      Toast.show({ type: "success", text1: `已切換為 ${def.label}` });
    } catch {
      Toast.show({ type: "error", text1: "切換失敗" });
    }
  };

  const handleReset = () => {
    Alert.alert("重設投資組合", "清除所有持股，無法復原", [
      { text: "取消", style: "cancel" },
      {
        text: "重設",
        style: "destructive",
        onPress: async () => {
          setIsResetting(true);
          try {
            await resetSim();
            clearHoldings();
            Toast.show({ type: "success", text1: "已重設投資組合" });
          } catch {
            Toast.show({ type: "error", text1: "重設失敗" });
          } finally {
            setIsResetting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QuantPilot</Text>
        <Text style={styles.headerSub}>設定</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Source Config */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Wifi size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>股價來源設定</Text>
          </View>
          <Text style={styles.sectionSub}>設定各來源 API Key，再選擇預設來源</Text>

          {PROVIDER_DEFS.map((p) => {
            const cfg = sourceConfigs.find((c) => c.sourceId === p.id);
            const isDefault = defaultSourceId === p.id;
            const hasKey = !p.requiresKey || !!cfg?.apiKey;
            return (
              <View
                key={p.id}
                style={[
                  styles.providerCard,
                  {
                    borderColor: isDefault ? colors.primary + "66" : colors.border,
                    backgroundColor: isDefault ? colors.primary + "0d" : colors.inputBg,
                  },
                ]}
              >
                <View style={styles.providerHeader}>
                  <View style={styles.providerName}>
                    <Text style={styles.providerLabel}>{p.label}</Text>
                    {isDefault && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>使用中</Text>
                      </View>
                    )}
                  </View>
                  {!isDefault && (
                    <Pressable
                      onPress={() => handleSetDefault(p.id)}
                      disabled={!hasKey}
                      style={[styles.setDefaultBtn, !hasKey && { opacity: 0.3 }]}
                    >
                      <Text style={styles.setDefaultText}>設為預設</Text>
                    </Pressable>
                  )}
                </View>

                {p.requiresKey && (
                  <View style={styles.keyRow}>
                    <TextInput
                      value={keyDraft[p.id] ?? cfg?.apiKey ?? ""}
                      onChangeText={(t) => setKeyDraft((prev) => ({ ...prev, [p.id]: t }))}
                      placeholder={p.keyPlaceholder}
                      placeholderTextColor={colors.mutedForeground}
                      secureTextEntry
                      style={styles.keyInput}
                    />
                    <Pressable style={styles.keySaveBtn} onPress={() => handleSaveKey(p.id)} disabled={savingKey === p.id}>
                      {savingKey === p.id ? (
                        <ActivityIndicator size="small" color={colors.foreground} />
                      ) : (
                        <Text style={styles.keySaveText}>儲存</Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {p.requiresKey && cfg?.apiKey && (
                  <View style={styles.keySetRow}>
                    <Check size={12} color={colors.success} />
                    <Text style={styles.keySetText}>已設定</Text>
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {/* Price Refresh */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>股價刷新</Text>
          </View>
          <Text style={styles.sectionSub}>定期自動刷新所有持股的最新價格</Text>

          <View style={styles.intervalRow}>
            {INTERVAL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleSetInterval(opt.value)}
                style={[
                  styles.intervalBtn,
                  refreshInterval === opt.value && styles.intervalBtnActive,
                ]}
              >
                <Text style={[
                  styles.intervalText,
                  refreshInterval === opt.value && styles.intervalTextActive,
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.manualRefreshBtn} onPress={handleManualRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <RefreshCcw size={14} color={colors.primary} />
                <Text style={styles.manualRefreshText}>立即刷新全部股價</Text>
              </>
            )}
          </Pressable>
        </Card>

        {/* Daily Refresh Time */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>每日自動拉取</Text>
          </View>
          <Text style={styles.sectionSub}>設定每天自動拉取股價與 Delta 的時間</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
            <TextInput
              value={dailyRefreshTime}
              onChangeText={setDailyRefreshTime}
              placeholder="14:00"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.keyInput, { width: 80, textAlign: "center" }]}
            />
            <Pressable
              style={styles.manualRefreshBtn}
              onPress={async () => {
                if (!dailyRefreshTime) return;
                try {
                  await api.upsertAppSetting("dailyRefreshTime", dailyRefreshTime);
                  Toast.show({ type: "success", text1: `已設定每日 ${dailyRefreshTime} 自動拉取` });
                } catch {
                  Toast.show({ type: "error", text1: "儲存失敗" });
                }
              }}
            >
              <Text style={styles.manualRefreshText}>儲存</Text>
            </Pressable>
          </View>
        </Card>

        {/* Delta Fetch */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Download size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>選擇權 Delta</Text>
          </View>
          <Text style={styles.sectionSub}>從 TAIFEX 抓取最新選擇權 Delta 資料</Text>
          <Pressable style={styles.manualRefreshBtn} onPress={handleFetchDelta} disabled={isFetchingDelta}>
            {isFetchingDelta ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Download size={14} color={colors.primary} />
                <Text style={styles.manualRefreshText}>抓取最新 Delta</Text>
              </>
            )}
          </Pressable>
        </Card>

        {/* API Stats */}
        <ApiStatsCard stats={apiStats} />

        {/* Reset */}
        <Card style={styles.section} variant="destructive">
          <View style={styles.sectionHeader}>
            <SettingsIcon size={16} color={colors.destructive} />
            <Text style={styles.sectionTitle}>重設投資組合</Text>
          </View>
          <Text style={styles.sectionSub}>清除所有持股，無法復原</Text>
          <Pressable style={styles.resetBtn} onPress={handleReset} disabled={isResetting}>
            {isResetting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.resetBtnText}>重設</Text>
            )}
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },
  section: { padding: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  sectionSub: { fontSize: 12, color: colors.mutedForeground, marginBottom: 16 },
  providerCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
  providerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  providerName: { flexDirection: "row", alignItems: "center", gap: 8 },
  providerLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  activeBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  activeBadgeText: { fontSize: 10, color: colors.primary },
  setDefaultBtn: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + "33", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  setDefaultText: { fontSize: 12, color: colors.primary },
  keyRow: { flexDirection: "row", gap: 8 },
  keyInput: {
    flex: 1,
    fontFamily: "monospace",
    fontSize: 13,
    color: colors.foreground,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 36,
  },
  keySaveBtn: { backgroundColor: colors.secondary, paddingHorizontal: 12, height: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  keySaveText: { fontSize: 12, fontWeight: "500", color: colors.foreground },
  keySetRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  keySetText: { fontSize: 10, color: colors.success },
  intervalRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  intervalBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.inputBg,
  },
  intervalBtnActive: {
    borderColor: colors.primary + "66", backgroundColor: colors.primaryLight,
  },
  intervalText: { fontSize: 12, color: colors.mutedForeground },
  intervalTextActive: { color: colors.primary, fontWeight: "600" },
  manualRefreshBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + "33",
    backgroundColor: colors.primaryLight,
  },
  manualRefreshText: { fontSize: 13, fontWeight: "500", color: colors.primary },
  resetBtn: {
    backgroundColor: colors.destructive + "cc",
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resetBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
