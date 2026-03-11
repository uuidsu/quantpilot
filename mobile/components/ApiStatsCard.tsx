import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BarChart2 } from "lucide-react-native";
import { Card } from "./Card";
import { colors } from "@/constants/theme";
import type { ApiUsage } from "@/types";

interface Props {
  stats: ApiUsage[];
}

export function ApiStatsCard({ stats }: Props) {
  const total = stats.length;
  const successCount = stats.filter((s) => s.success).length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const withMs = stats.filter((s) => s.responseTimeMs != null);
  const avgMs =
    withMs.length > 0
      ? Math.round(withMs.reduce((a, s) => a + (s.responseTimeMs ?? 0), 0) / withMs.length)
      : 0;

  const summaryItems = [
    { label: "總次數", value: String(total) },
    { label: "成功率", value: `${successRate}%` },
    { label: "平均回應", value: avgMs > 0 ? `${avgMs}ms` : "—" },
  ];

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <BarChart2 size={16} color="#a78bfa" />
        <Text style={styles.title}>API 使用統計</Text>
      </View>

      {total === 0 ? (
        <Text style={styles.empty}>尚無 API 呼叫記錄</Text>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summaryRow}>
            {summaryItems.map(({ label, value }) => (
              <View key={label} style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Recent logs */}
          <Text style={styles.sectionLabel}>最近紀錄</Text>
          {stats.slice(0, 6).map((r) => (
            <View key={r.id} style={styles.logRow}>
              <View style={styles.logLeft}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: r.success ? colors.success : colors.destructive },
                  ]}
                />
                <Text style={styles.logSymbol}>{r.symbol}</Text>
              </View>
              <View style={styles.logRight}>
                {r.responseTimeMs != null && (
                  <Text style={styles.logMs}>{r.responseTimeMs}ms</Text>
                )}
                <Text style={styles.logTime}>
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleTimeString("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  empty: { textAlign: "center", fontSize: 12, color: colors.mutedForeground, paddingVertical: 16 },
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { fontSize: 10, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1 },
  summaryValue: { fontSize: 14, fontWeight: "700", fontFamily: "monospace", color: colors.foreground, marginTop: 2 },
  sectionLabel: { fontSize: 12, color: colors.mutedForeground, marginBottom: 8 },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  logSymbol: { fontSize: 12, fontWeight: "500", fontFamily: "monospace", color: colors.foreground },
  logRight: { flexDirection: "row", gap: 8 },
  logMs: { fontSize: 12, fontFamily: "monospace", color: colors.mutedForeground },
  logTime: { fontSize: 12, color: colors.mutedForeground },
});
