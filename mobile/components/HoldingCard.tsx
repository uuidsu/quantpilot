import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";
import type { Holding } from "@/types";

interface Props {
  holding: Holding;
  totalAdjustedValue: number;
  simDelta?: number;
}

export function HoldingCard({
  holding: h,
  totalAdjustedValue,
  simDelta,
}: Props) {
  const marketValue = h.shares * h.currentPrice;

  return (
    <View style={styles.row}>
      <Text style={styles.symbol} numberOfLines={1}>{h.name}</Text>
      <Text style={styles.shares} numberOfLines={1}>{h.shares}股</Text>
      <Text style={styles.value} numberOfLines={1}>${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
      {simDelta != null && simDelta !== 0 && (
        <Text style={[styles.sim, { color: simDelta >= 0 ? colors.success : colors.destructive }]} numberOfLines={1}>
          {simDelta >= 0 ? "+" : ""}{simDelta.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  symbol: { fontSize: 12, fontWeight: "700", fontFamily: "monospace", color: colors.foreground, width: 60 },
  shares: { fontSize: 11, fontFamily: "monospace", color: colors.mutedForeground, width: 40, textAlign: "right" },
  value: { fontSize: 12, fontFamily: "monospace", color: colors.foreground, flex: 1, textAlign: "right" },
  pnl: { fontSize: 12, fontFamily: "monospace", fontWeight: "600", width: 60, textAlign: "right" },
  sim: { fontSize: 11, fontFamily: "monospace", fontWeight: "600", width: 70, textAlign: "right" },
});
