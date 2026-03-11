import React, { useEffect } from "react";
import { Text, type TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: TextStyle;
}

export function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 2, style }: Props) {
  const opacity = useSharedValue(0.8);
  const translateY = useSharedValue(5);

  useEffect(() => {
    opacity.value = 0.8;
    translateY.value = 5;
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[{ fontVariant: ["tabular-nums"], fontFamily: "monospace" }, style]}>
        {prefix}{formatted}{suffix}
      </Text>
    </Animated.View>
  );
}
