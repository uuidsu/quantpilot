import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { colors } from "@/constants/theme";

type Variant = "primary" | "secondary" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children: string;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const bgMap: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.secondary,
  danger: colors.destructive,
  outline: "transparent",
};

const textColorMap: Record<Variant, string> = {
  primary: "#fff",
  secondary: colors.foreground,
  danger: "#fff",
  outline: colors.foreground,
};

const paddingMap: Record<Size, [number, number]> = {
  sm: [6, 12],
  md: [10, 20],
  lg: [16, 32],
};

const fontSizeMap: Record<Size, number> = {
  sm: 13,
  md: 15,
  lg: 17,
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading,
  disabled,
  onPress,
  style,
}: ButtonProps) {
  const [pv, ph] = paddingMap[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bgMap[variant],
          paddingVertical: pv,
          paddingHorizontal: ph,
          opacity: disabled || isLoading ? 0.5 : pressed ? 0.8 : 1,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColorMap[variant]} />
      ) : (
        <Text style={[styles.text, { color: textColorMap[variant], fontSize: fontSizeMap[size] }]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  text: {
    fontWeight: "600",
  },
});
