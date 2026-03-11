import React from "react";
import { View, type ViewProps, StyleSheet } from "react-native";
import { colors } from "@/constants/theme";

interface CardProps extends ViewProps {
  variant?: "default" | "destructive" | "success" | "warning" | "blue" | "orange";
}

export function Card({ children, style, variant = "default", ...props }: CardProps) {
  const borderColor =
    variant === "destructive" ? colors.destructive + "33" :
    variant === "success" ? colors.success + "33" :
    variant === "warning" ? colors.warning + "33" :
    variant === "blue" ? colors.blue + "33" :
    variant === "orange" ? colors.orange + "33" :
    colors.cardBorder;

  return (
    <View style={[styles.card, { borderColor }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
});
