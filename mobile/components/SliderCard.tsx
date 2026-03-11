import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { Card } from "./Card";
import { colors } from "@/constants/theme";

interface Props {
  marketAdjust: number;
  onValueChange: (v: number) => void;
  totalCurrentValue: number;
  totalCost: number;
  totalAdjustedValue: number;
  hasHoldings: boolean;
}

export function SliderCard({
  marketAdjust,
  onValueChange,
  totalCurrentValue,
  totalCost,
  totalAdjustedValue,
  hasHoldings,
}: Props) {
  const badgeColor =
    marketAdjust > 0 ? colors.success :
    marketAdjust < 0 ? colors.destructive :
    colors.mutedForeground;

  const badgeBg =
    marketAdjust > 0 ? colors.successLight :
    marketAdjust < 0 ? colors.destructiveLight :
    colors.secondary;

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>漲跌模擬</Text>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>
            {marketAdjust > 0 ? "+" : ""}{marketAdjust}%
          </Text>
        </View>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={-50}
        maximumValue={50}
        step={1}
        value={marketAdjust}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.secondary}
        thumbTintColor={colors.primary}
      />

      <View style={styles.sliderLabels}>
        <Text style={styles.labelSmall}>-50%</Text>
        <Text
          style={[styles.labelSmall, { color: colors.primary }]}
          onPress={() => onValueChange(0)}
        >
          重置
        </Text>
        <Text style={styles.labelSmall}>+50%</Text>
      </View>

      {hasHoldings && (
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>現在市值</Text>
            <Text style={styles.statValue}>
              ${totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>總成本</Text>
            <Text style={styles.statValue}>
              ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </Text>
          </View>
          {marketAdjust !== 0 && (
            <View style={styles.statItemFull}>
              <Text style={styles.statLabel}>模擬漲跌金額</Text>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      totalAdjustedValue - totalCurrentValue >= 0
                        ? colors.success
                        : colors.destructive,
                  },
                ]}
              >
                {totalAdjustedValue - totalCurrentValue >= 0 ? "+" : ""}$
                {(totalAdjustedValue - totalCurrentValue).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </Text>
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: { fontSize: 12, color: colors.mutedForeground },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: "700", fontFamily: "monospace" },
  slider: { width: "100%", height: 30 },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  labelSmall: { fontSize: 10, color: colors.mutedForeground },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: { flex: 1 },
  statItemFull: { width: "100%" },
  statLabel: { fontSize: 10, color: colors.mutedForeground },
  statValue: { fontSize: 14, fontWeight: "600", fontFamily: "monospace", color: colors.foreground, marginTop: 2 },
});
