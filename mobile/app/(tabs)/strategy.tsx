import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, Check } from "lucide-react-native";
import Toast from "react-native-toast-message";
import { useSimulation } from "@/hooks/useSimulation";
import { useStrategies } from "@/hooks/useStrategies";
import { colors } from "@/constants/theme";

type ParamKey = "leverageLimit" | "exposureTarget" | "deltaMin" | "deltaMax" | "leverageCap";

const PARAMS: { key: ParamKey; label: string; placeholder: string; suffix?: string; format: (v: any) => string }[] = [
  { key: "leverageLimit", label: "槓桿上限", placeholder: "1.5", suffix: "x", format: (v) => v != null ? `${v}x` : "未設定" },
  { key: "exposureTarget", label: "目標曝險", placeholder: "1.0", suffix: "%", format: (v) => v != null ? `${(v * 100).toFixed(0)}%` : "未設定" },
  { key: "deltaMin", label: "Delta 下限", placeholder: "-0.15", format: (v) => v != null ? String(v) : "未設定" },
  { key: "deltaMax", label: "Delta 上限", placeholder: "0.15", format: (v) => v != null ? String(v) : "未設定" },
  { key: "leverageCap", label: "金額上限", placeholder: "無限制", format: (v) => v != null ? `$${Number(v).toLocaleString()}` : "無限制" },
];

export default function StrategyScreen() {
  const { sim } = useSimulation();
  const { strategies, loading, add, update } = useStrategies(sim?.id);

  const strategy = strategies[0] ?? null;
  const [activeKey, setActiveKey] = useState<ParamKey | null>(null);
  const [inputValue, setInputValue] = useState("");

  // 自動建立策略
  useEffect(() => {
    if (!loading && strategies.length === 0 && sim?.id) {
      add({ name: "預設策略" }).catch(() => {});
    }
  }, [loading, strategies.length, sim?.id]);

  const handleTap = (key: ParamKey) => {
    if (activeKey === key) {
      // 收起
      setActiveKey(null);
      return;
    }
    setActiveKey(key);
    if (!strategy) return;
    const raw = strategy[key];
    setInputValue(raw != null ? String(raw) : "");
  };

  const handleConfirm = async () => {
    if (!strategy || !activeKey) return;
    const val = inputValue.trim() === "" ? null : parseFloat(inputValue);
    if (inputValue.trim() !== "" && (val === null || isNaN(val))) {
      Toast.show({ type: "error", text1: "請輸入有效數字" });
      return;
    }
    try {
      await update(strategy.id, { [activeKey]: val });
      Toast.show({ type: "success", text1: "已更新" });
    } catch {
      Toast.show({ type: "error", text1: "儲存失敗" });
    }
    setActiveKey(null);
  };

  if (loading || !strategy) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>策略條件</Text>
        <Text style={styles.headerSub}>點擊項目來修改數值</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.list}>
          {PARAMS.map((p, i) => {
            const isActive = activeKey === p.key;
            const currentVal = strategy[p.key];
            const isLast = i === PARAMS.length - 1;

            return (
              <View key={p.key}>
                <Pressable
                  onPress={() => handleTap(p.key)}
                  style={[styles.row, !isLast && !isActive && styles.rowBorder]}
                >
                  <Text style={styles.rowLabel}>{p.label}</Text>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, isActive && { color: colors.primary }]}>
                      {p.format(currentVal)}
                    </Text>
                    <ChevronRight
                      size={14}
                      color={isActive ? colors.primary : colors.mutedForeground}
                      style={isActive ? { transform: [{ rotate: "90deg" }] } : undefined}
                    />
                  </View>
                </Pressable>

                {isActive && (
                  <View style={styles.inputPanel}>
                    <TextInput
                      style={styles.input}
                      value={inputValue}
                      onChangeText={setInputValue}
                      placeholder={p.placeholder}
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="numeric"
                      autoFocus
                      onSubmitEditing={handleConfirm}
                    />
                    <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
                      <Check size={18} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  headerSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  list: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.foreground,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValue: {
    fontSize: 15,
    fontFamily: "monospace",
    color: colors.mutedForeground,
  },

  inputPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.primary + "66",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 40,
    color: colors.foreground,
    fontSize: 16,
    fontFamily: "monospace",
  },
  confirmBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
