import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RefreshCcw, Download, Upload, AlertTriangle, Check, X, Minus, ArrowDown, ArrowUp,
} from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useSimulation } from "@/hooks/useSimulation";
import { Card } from "@/components/Card";
import { colors } from "@/constants/theme";
import {
  computeFullDiff, pullAll, pullTable, forcePushTable, isOnline,
  type TableDiff, type DiffItem, type DiffStatus,
} from "@/services/db/sync";

export default function SyncScreen() {
  const { sim } = useSimulation();
  const [diffs, setDiffs] = useState<TableDiff[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const simId = sim?.id;

  const handleRefreshDiff = useCallback(async () => {
    if (!simId) return;
    setLoading(true);
    try {
      const online = await isOnline();
      if (!online) {
        Toast.show({ type: "error", text1: "無網路連線", text2: "無法比對遠端資料" });
        setLoading(false);
        return;
      }
      const result = await computeFullDiff(simId);
      setDiffs(result);
    } catch (e: any) {
      Toast.show({ type: "error", text1: "比對失敗", text2: e?.message ?? "" });
    } finally {
      setLoading(false);
    }
  }, [simId]);

  const handlePullAll = useCallback(async () => {
    if (!simId) return;
    setSyncing("pull_all");
    try {
      await pullAll(simId);
      Toast.show({ type: "success", text1: "Pull 完成", text2: "已將遠端資料同步到本地" });
      await handleRefreshDiff();
    } catch (e: any) {
      Toast.show({ type: "error", text1: "Pull 失敗", text2: e?.message ?? "" });
    } finally {
      setSyncing(null);
    }
  }, [simId, handleRefreshDiff]);

  const handlePullTable = useCallback(async (table: string, label: string) => {
    if (!simId) return;
    setSyncing(`pull_${table}`);
    try {
      await pullTable(simId, table);
      Toast.show({ type: "success", text1: `Pull ${label}`, text2: "完成" });
      await handleRefreshDiff();
    } catch (e: any) {
      Toast.show({ type: "error", text1: `Pull ${label} 失敗`, text2: e?.message ?? "" });
    } finally {
      setSyncing(null);
    }
  }, [simId, handleRefreshDiff]);

  const handleForcePush = useCallback(async (table: string, label: string) => {
    if (!simId) return;
    Alert.alert(
      "Force Push",
      `確定要用本地的「${label}」覆蓋遠端？此操作不可復原。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "Force Push", style: "destructive",
          onPress: async () => {
            setSyncing(`push_${table}`);
            try {
              await forcePushTable(simId, table);
              Toast.show({ type: "success", text1: `Force Push ${label}`, text2: "完成" });
              await handleRefreshDiff();
            } catch (e: any) {
              Toast.show({ type: "error", text1: `Push ${label} 失敗`, text2: e?.message ?? "" });
            } finally {
              setSyncing(null);
            }
          },
        },
      ]
    );
  }, [simId, handleRefreshDiff]);

  const toggleExpand = (table: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(table)) next.delete(table); else next.add(table);
      return next;
    });
  };

  const statusIcon = (status: DiffStatus) => {
    switch (status) {
      case "match": return <Check size={12} color={colors.success} />;
      case "local_only": return <ArrowUp size={12} color={colors.primary} />;
      case "remote_only": return <ArrowDown size={12} color={colors.warning} />;
      case "conflict": return <AlertTriangle size={12} color={colors.destructive} />;
    }
  };

  const statusLabel = (status: DiffStatus) => {
    switch (status) {
      case "match": return "一致";
      case "local_only": return "僅本地";
      case "remote_only": return "僅遠端";
      case "conflict": return "有差異";
    }
  };

  const statusColor = (status: DiffStatus) => {
    switch (status) {
      case "match": return colors.success;
      case "local_only": return colors.primary;
      case "remote_only": return colors.warning;
      case "conflict": return colors.destructive;
    }
  };

  const tableSummary = (diff: TableDiff) => {
    const conflicts = diff.items.filter(i => i.status === "conflict").length;
    const localOnly = diff.items.filter(i => i.status === "local_only").length;
    const remoteOnly = diff.items.filter(i => i.status === "remote_only").length;
    const matches = diff.items.filter(i => i.status === "match").length;
    if (conflicts === 0 && localOnly === 0 && remoteOnly === 0) return "synced";
    return { conflicts, localOnly, remoteOnly, matches };
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>同步</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {diffs && (
            <Pressable
              style={[styles.headerBtn, { backgroundColor: colors.primaryLight }]}
              onPress={handlePullAll}
              disabled={!!syncing}
            >
              {syncing === "pull_all" ? (
                <ActivityIndicator size={14} color={colors.primary} />
              ) : (
                <Download size={14} color={colors.primary} />
              )}
              <Text style={[styles.headerBtnText, { color: colors.primary }]}>Pull All</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.headerBtn}
            onPress={handleRefreshDiff}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size={14} color={colors.foreground} />
            ) : (
              <RefreshCcw size={14} color={colors.foreground} />
            )}
            <Text style={styles.headerBtnText}>比對</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {!diffs && !loading && (
          <Card style={styles.card}>
            <View style={{ alignItems: "center", padding: 24, gap: 12 }}>
              <RefreshCcw size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyText}>點擊「比對」查看本地與遠端差異</Text>
              <Text style={[styles.emptyText, { fontSize: 11 }]}>
                類似 git status，顯示哪些資料需要同步
              </Text>
            </View>
          </Card>
        )}

        {loading && !diffs && (
          <View style={{ alignItems: "center", padding: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>正在比對本地與遠端...</Text>
          </View>
        )}

        {diffs?.map((diff) => {
          const summary = tableSummary(diff);
          const isSynced = summary === "synced";
          const isExpanded = expanded.has(diff.table);
          const isSyncingThis = syncing === `pull_${diff.table}` || syncing === `push_${diff.table}`;

          return (
            <Card key={diff.table} style={styles.card}>
              {/* Table header */}
              <Pressable
                style={styles.tableHeader}
                onPress={() => toggleExpand(diff.table)}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.tableTitle}>{diff.label}</Text>
                    {isSynced ? (
                      <View style={[styles.badge, { backgroundColor: colors.success + "1a" }]}>
                        <Check size={10} color={colors.success} />
                        <Text style={[styles.badgeText, { color: colors.success }]}>已同步</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: colors.destructive + "1a" }]}>
                        <AlertTriangle size={10} color={colors.destructive} />
                        <Text style={[styles.badgeText, { color: colors.destructive }]}>有差異</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tableSubtitle}>
                    本地 {diff.localCount} 筆 · 遠端 {diff.remoteCount} 筆
                    {diff.lastSynced ? ` · 上次同步 ${formatTime(diff.lastSynced)}` : ""}
                  </Text>
                </View>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                  {isExpanded ? "▲" : "▼"}
                </Text>
              </Pressable>

              {/* Summary badges */}
              {!isSynced && typeof summary === "object" && (
                <View style={styles.summaryRow}>
                  {summary.matches > 0 && (
                    <View style={[styles.miniTag, { backgroundColor: colors.success + "15" }]}>
                      <Text style={[styles.miniTagText, { color: colors.success }]}>✓{summary.matches}</Text>
                    </View>
                  )}
                  {summary.conflicts > 0 && (
                    <View style={[styles.miniTag, { backgroundColor: colors.destructive + "15" }]}>
                      <Text style={[styles.miniTagText, { color: colors.destructive }]}>≠{summary.conflicts}</Text>
                    </View>
                  )}
                  {summary.localOnly > 0 && (
                    <View style={[styles.miniTag, { backgroundColor: colors.primary + "15" }]}>
                      <Text style={[styles.miniTagText, { color: colors.primary }]}>↑{summary.localOnly}</Text>
                    </View>
                  )}
                  {summary.remoteOnly > 0 && (
                    <View style={[styles.miniTag, { backgroundColor: colors.warning + "15" }]}>
                      <Text style={[styles.miniTagText, { color: colors.warning }]}>↓{summary.remoteOnly}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => handlePullTable(diff.table, diff.label)}
                  disabled={!!syncing}
                >
                  {syncing === `pull_${diff.table}` ? (
                    <ActivityIndicator size={12} color={colors.primary} />
                  ) : (
                    <Download size={12} color={colors.primary} />
                  )}
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Pull</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: colors.destructive + "15" }]}
                  onPress={() => handleForcePush(diff.table, diff.label)}
                  disabled={!!syncing}
                >
                  {syncing === `push_${diff.table}` ? (
                    <ActivityIndicator size={12} color={colors.destructive} />
                  ) : (
                    <Upload size={12} color={colors.destructive} />
                  )}
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Force Push</Text>
                </Pressable>
              </View>

              {/* Expanded diff items */}
              {isExpanded && (
                <View style={styles.diffList}>
                  {diff.items.length === 0 ? (
                    <Text style={styles.emptyText}>兩端皆無資料</Text>
                  ) : (
                    diff.items.map((item) => (
                      <View key={item.id} style={styles.diffRow}>
                        <View style={styles.diffIcon}>{statusIcon(item.status)}</View>
                        <Text style={styles.diffLabel} numberOfLines={1}>{item.label}</Text>
                        <View style={[styles.diffStatus, { backgroundColor: statusColor(item.status) + "15" }]}>
                          <Text style={[styles.diffStatusText, { color: statusColor(item.status) }]}>
                            {statusLabel(item.status)}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "剛剛";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  headerBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.inputBg,
  },
  headerBtnText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { padding: 14 },
  emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center" },

  tableHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  tableTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  tableSubtitle: { fontSize: 10, color: colors.mutedForeground },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: "600" },

  summaryRow: {
    flexDirection: "row", gap: 6, marginTop: 8,
  },
  miniTag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  miniTagText: { fontSize: 11, fontWeight: "700", fontFamily: "monospace" },

  actionRow: {
    flexDirection: "row", gap: 8, marginTop: 10,
  },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  actionBtnText: { fontSize: 11, fontWeight: "600" },

  diffList: {
    marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8,
  },
  diffRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  diffIcon: { width: 18, alignItems: "center" },
  diffLabel: { flex: 1, fontSize: 12, color: colors.foreground, fontFamily: "monospace" },
  diffStatus: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  diffStatusText: { fontSize: 10, fontWeight: "600" },
});
