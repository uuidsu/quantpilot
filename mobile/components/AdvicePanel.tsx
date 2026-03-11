import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react-native";
import { Card } from "./Card";
import { colors } from "@/constants/theme";

interface Props {
  currentLeverage: number;
  limit: number;
}

export function AdvicePanel({ currentLeverage, limit }: Props) {
  let status: "safe" | "warning" | "danger" = "safe";
  let IconComponent = CheckCircle2;
  let iconColor = colors.success;
  let title = "Comfortable Exposure";
  let message = "You have room to increase exposure by buying more shares.";
  let bgColor = colors.successLight;
  let titleColor = colors.success;

  if (currentLeverage > limit) {
    status = "danger";
    IconComponent = AlertCircle;
    iconColor = colors.destructive;
    title = "Margin Call Risk!";
    message = "Your leverage exceeds your limit. Consider selling shares immediately to reduce risk.";
    bgColor = colors.destructiveLight;
    titleColor = colors.destructive;
  } else if (currentLeverage > limit * 0.8) {
    status = "warning";
    IconComponent = ShieldAlert;
    iconColor = colors.warning;
    title = "Approaching Limit";
    message = "Your leverage is getting high. Be cautious with new purchases.";
    bgColor = colors.warningLight;
    titleColor = colors.warning;
  }

  return (
    <Card style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.row}>
        <IconComponent size={24} color={iconColor} style={styles.icon} />
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: { flexDirection: "row", gap: 12 },
  icon: { marginTop: 2 },
  textWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  message: { fontSize: 13, color: colors.mutedForeground, lineHeight: 20 },
});
