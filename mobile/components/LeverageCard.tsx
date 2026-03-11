import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Card } from "./Card";
import { colors } from "@/constants/theme";

interface Props {
  portfolioLeverage: number;
  betaWeightedExposure: number;
  leverageLimit: number;
  isOverLeverage: boolean;
  isBetaOverLimit: boolean;
  isInfiniteOrNegative: boolean;
  leveragePercent: number;
  totalCurrentValue: number;
  cash: number;
  onSaveLeverage: (val: number) => Promise<void>;
}

export function LeverageCard({
  portfolioLeverage,
  betaWeightedExposure,
  leverageLimit,
  isOverLeverage,
  isBetaOverLimit,
  isInfiniteOrNegative,
  leveragePercent,
  totalCurrentValue,
  cash,
  onSaveLeverage,
}: Props) {
  const [input, setInput] = useState(leverageLimit);
  const [saving, setSaving] = useState(false);

  const barWidth = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(leveragePercent, 100)}%`, { duration: 500 }),
  }));

  const barColor =
    isInfiniteOrNegative ? colors.destructive :
    isOverLeverage ? colors.orange :
    leveragePercent > 80 ? colors.warning :
    colors.success;

  const leverageColor =
    isInfiniteOrNegative ? colors.destructive :
    isOverLeverage ? colors.orange :
    colors.success;

  const betaColor =
    isInfiniteOrNegative ? colors.destructive :
    isBetaOverLimit ? colors.orange :
    colors.blue;

  const handleSave = async () => {
    setSaving(true);
    try { await onSaveLeverage(input); } finally { setSaving(false); }
  };

  return (
    <Card style={styles.container}>
      {/* 雙指標 */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricBox, { backgroundColor: leverageColor + "18" }]}>
          <Text style={styles.metricLabel}>整戶槓桿率</Text>
          <Text style={[styles.metricValue, { color: leverageColor }]}>
            {isInfiniteOrNegative ? "∞" : `${portfolioLeverage.toFixed(2)}x`}
          </Text>
          <Text style={styles.metricSub}>股票市值 ÷ 淨資產</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: betaColor + "18" }]}>
          <Text style={styles.metricLabel}>Beta 加權曝險率</Text>
          <Text style={[styles.metricValue, { color: betaColor }]}>
            {isInfiniteOrNegative || betaWeightedExposure === Infinity
              ? "∞"
              : `${(betaWeightedExposure * 100).toFixed(0)}%`}
          </Text>
          <Text style={styles.metricSub}>Σ(市值×β) ÷ 淨資產</Text>
        </View>
      </View>

      {/* 進度條 */}
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { backgroundColor: barColor }, barWidth]} />
      </View>

      <View style={styles.barLabels}>
        <Text style={styles.barLabel}>0x</Text>
        <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
          上限 {leverageLimit.toFixed(1)}x
        </Text>
        <Text style={styles.barLabel}>{leverageLimit.toFixed(1)}x+</Text>
      </View>

      {/* 提示 */}
      <View
        style={[
          styles.hint,
          {
            backgroundColor: isInfiniteOrNegative
              ? colors.destructiveLight
              : isOverLeverage
              ? colors.orangeLight
              : colors.successLight,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 12,
            color: isInfiniteOrNegative
              ? colors.destructive
              : isOverLeverage
              ? colors.orange
              : colors.success,
          }}
        >
          {isInfiniteOrNegative
            ? "⚠ 淨資產為負，槓桿無限大，風險極高"
            : isOverLeverage
            ? `⚠ 槓桿 ${portfolioLeverage.toFixed(2)}x 已超過上限 ${leverageLimit.toFixed(1)}x，建議減碼`
            : `✓ 槓桿健康，距上限還有 ${(leverageLimit - portfolioLeverage).toFixed(2)}x 空間`}
        </Text>
      </View>

      {/* 槓桿上限滑桿 */}
      <Text style={styles.sectionLabel}>調整槓桿上限</Text>
      <View style={styles.sliderRow}>
        <Slider
          style={{ flex: 1 }}
          minimumValue={1.0}
          maximumValue={5.0}
          step={0.1}
          value={input}
          onValueChange={setInput}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.secondary}
          thumbTintColor={colors.primary}
        />
        <Text style={styles.sliderValue}>{input.toFixed(1)}x</Text>
        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Text style={styles.saveBtnText}>儲存</Text>
          )}
        </Pressable>
      </View>

      {/* 分項 */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>股票市值</Text>
          <Text style={styles.detailValue}>
            ${totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>現金／負債</Text>
          <Text
            style={[
              styles.detailValue,
              { color: cash >= 0 ? colors.success : colors.destructive },
            ]}
          >
            {cash >= 0 ? "+" : ""}${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  metricsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  metricBox: { flex: 1, borderRadius: 16, padding: 12 },
  metricLabel: { fontSize: 10, color: colors.mutedForeground, marginBottom: 4 },
  metricValue: { fontSize: 22, fontWeight: "700", fontFamily: "monospace" },
  metricSub: { fontSize: 10, color: colors.mutedForeground, marginTop: 4 },
  barBg: { height: 8, backgroundColor: colors.secondary, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  barFill: { position: "absolute", left: 0, top: 0, height: 8, borderRadius: 4 },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  barLabel: { fontSize: 10, color: colors.mutedForeground },
  hint: { borderRadius: 12, padding: 10, marginBottom: 12 },
  sectionLabel: { fontSize: 10, color: colors.mutedForeground, marginBottom: 6 },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sliderValue: { fontSize: 14, fontWeight: "700", fontFamily: "monospace", color: colors.foreground, width: 40, textAlign: "right" },
  saveBtn: { backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  saveBtnText: { fontSize: 12, fontWeight: "500", color: colors.foreground },
  details: { flexDirection: "row", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 10, color: colors.mutedForeground },
  detailValue: { fontSize: 14, fontWeight: "600", fontFamily: "monospace", color: colors.foreground, marginTop: 2 },
});
