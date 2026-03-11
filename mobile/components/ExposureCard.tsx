import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import Slider from "@react-native-community/slider";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Card } from "./Card";
import { colors } from "@/constants/theme";
import type { Holding } from "@/types";

interface Props {
  betaWeightedExposure: number;
  exposureTarget: number;
  betaGapValue: number;
  buyAmount: number;
  sellAmount: number;
  swapAmount: number;
  isMixedMode: boolean;
  isLeverageCapped: boolean;
  isOnTarget: boolean;
  leverageLimit: number;
  projectedBetaExposure: number;
  holdingRecommendations: Array<Holding & { holdingTradeAmount: number; suggestedSharesDelta: number }>;
  onSaveTarget: (val: number) => Promise<void>;
}

export function ExposureCard({
  betaWeightedExposure,
  exposureTarget,
  betaGapValue,
  buyAmount,
  sellAmount,
  swapAmount,
  isMixedMode,
  isLeverageCapped,
  isOnTarget,
  leverageLimit,
  projectedBetaExposure,
  holdingRecommendations,
  onSaveTarget,
}: Props) {
  const [input, setInput] = useState(exposureTarget);
  const [saving, setSaving] = useState(false);

  const currentBarWidth = useAnimatedStyle(() => ({
    width: withTiming(
      `${Math.min((betaWeightedExposure / Math.max(exposureTarget * 2, 0.01)) * 100, 100)}%`,
      { duration: 500 }
    ),
  }));

  const handleSave = async () => {
    setSaving(true);
    try { await onSaveTarget(input); } finally { setSaving(false); }
  };

  const isIncrease = betaGapValue > 0;

  return (
    <Card style={styles.container}>
      <Text style={styles.title}>曝險目標設定</Text>
      <Text style={styles.subtitle}>設定 Beta 加權目標曝險率，系統自動給出調整建議</Text>

      {/* 雙軌進度 */}
      <View style={styles.bars}>
        <View>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel}>目前 Beta 曝險率</Text>
            <Text style={[styles.barValue, { color: colors.blue }]}>
              {betaWeightedExposure === Infinity ? "∞" : `${(betaWeightedExposure * 100).toFixed(1)}%`}
            </Text>
          </View>
          <View style={styles.barBg}>
            <Animated.View style={[styles.barFill, { backgroundColor: colors.blue }, currentBarWidth]} />
          </View>
        </View>
        <View>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel}>目標曝險率</Text>
            <Text style={[styles.barValue, { color: colors.primary }]}>
              {(exposureTarget * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFillStatic, { width: "50%", backgroundColor: colors.primary + "99" }]} />
          </View>
        </View>
      </View>

      {/* 滑桿 */}
      <Text style={styles.sectionLabel}>調整目標曝險率</Text>
      <View style={styles.sliderRow}>
        <Slider
          style={{ flex: 1 }}
          minimumValue={0}
          maximumValue={3.0}
          step={0.05}
          value={input}
          onValueChange={setInput}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.secondary}
          thumbTintColor={colors.primary}
        />
        <Text style={[styles.sliderValue, { color: colors.primary }]}>
          {(input * 100).toFixed(0)}%
        </Text>
        <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={colors.foreground} />
          ) : (
            <Text style={styles.saveBtnText}>儲存</Text>
          )}
        </Pressable>
      </View>

      {/* 建議 */}
      <View
        style={[
          styles.advice,
          {
            backgroundColor: isOnTarget
              ? colors.successLight
              : isIncrease
              ? colors.blueLight
              : colors.orangeLight,
          },
        ]}
      >
        <Text
          style={[
            styles.adviceTitle,
            { color: isOnTarget ? colors.success : isIncrease ? colors.blue : colors.orange },
          ]}
        >
          {isOnTarget
            ? "✓ 已達目標，無需調整"
            : isIncrease
            ? isMixedMode
              ? `▲ 加碼 $${buyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} + 換倉 $${swapAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : `▲ 建議加碼 $${buyAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : `▼ 建議減碼 $${sellAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        </Text>

        {isMixedMode && (
          <Text style={styles.leverageWarn}>
            ⚠ 槓桿已達上限 {leverageLimit.toFixed(1)}x，改以賣低β買高β換倉補足缺口
          </Text>
        )}

        {isLeverageCapped && !isMixedMode && (
          <Text style={styles.leverageWarn}>
            ⚠ 受槓桿上限 {leverageLimit.toFixed(1)}x 限制，加碼金額已縮減
          </Text>
        )}

        {/* 前後對比 */}
        {!isOnTarget && (
          <View style={styles.projRow}>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>目前</Text>
              <Text style={[styles.projValue, { color: colors.mutedForeground }]}>
                {betaWeightedExposure === Infinity ? "∞" : `${(betaWeightedExposure * 100).toFixed(1)}%`}
              </Text>
            </View>
            <Text style={[styles.projArrow, { color: isIncrease ? colors.blue : colors.orange }]}>→</Text>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>執行後</Text>
              <Text style={[styles.projValue, { color: isIncrease ? colors.blue : colors.orange }]}>
                {`${(projectedBetaExposure * 100).toFixed(1)}%`}
              </Text>
            </View>
            <Text style={[styles.projArrow, { color: colors.mutedForeground + "50" }]}>→</Text>
            <View style={styles.projItem}>
              <Text style={styles.projLabel}>目標</Text>
              <Text style={[styles.projValue, { color: colors.primary }]}>
                {`${(exposureTarget * 100).toFixed(1)}%`}
              </Text>
            </View>
          </View>
        )}

        {!isOnTarget &&
          holdingRecommendations.map((r) => {
            if (Math.abs(r.suggestedSharesDelta) < 0.01) return null;
            return (
              <View key={r.id} style={styles.recRow}>
                <Text style={styles.recSymbol}>{r.name}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      styles.recDelta,
                      { color: r.suggestedSharesDelta > 0 ? colors.blue : colors.orange },
                    ]}
                  >
                    {r.suggestedSharesDelta > 0 ? "+" : ""}
                    {r.suggestedSharesDelta.toFixed(2)} 股
                  </Text>
                  <Text style={styles.recAmount}>
                    ({r.holdingTradeAmount > 0 ? "+" : ""}$
                    {r.holdingTradeAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })})
                  </Text>
                </View>
              </View>
            );
          })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  subtitle: { fontSize: 10, color: colors.mutedForeground, marginTop: 2, marginBottom: 12 },
  bars: { gap: 8, marginBottom: 16 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  barLabel: { fontSize: 10, color: colors.mutedForeground },
  barValue: { fontSize: 10, fontWeight: "600", fontFamily: "monospace" },
  barBg: { height: 8, backgroundColor: colors.secondary, borderRadius: 4, overflow: "hidden" },
  barFill: { position: "absolute", left: 0, top: 0, height: 8, borderRadius: 4 },
  barFillStatic: { height: 8, borderRadius: 4 },
  sectionLabel: { fontSize: 10, color: colors.mutedForeground, marginBottom: 6 },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sliderValue: { fontSize: 14, fontWeight: "700", fontFamily: "monospace", width: 50, textAlign: "right" },
  saveBtn: { backgroundColor: colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  saveBtnText: { fontSize: 12, fontWeight: "500", color: colors.foreground },
  advice: { borderRadius: 16, padding: 12 },
  adviceTitle: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  leverageWarn: { fontSize: 10, color: colors.warning, marginBottom: 8 },
  projRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.inputBg, borderRadius: 12, padding: 8, marginBottom: 8 },
  projItem: { flex: 1, alignItems: "center" },
  projLabel: { fontSize: 9, color: colors.mutedForeground },
  projValue: { fontSize: 14, fontWeight: "700", fontFamily: "monospace", marginTop: 2 },
  projArrow: { fontSize: 16 },
  recRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4, borderTopWidth: 1, borderTopColor: colors.border },
  recSymbol: { fontSize: 12, fontWeight: "600", fontFamily: "monospace", color: colors.foreground },
  recDelta: { fontSize: 12, fontWeight: "700", fontFamily: "monospace" },
  recAmount: { fontSize: 10, color: colors.mutedForeground },
});
