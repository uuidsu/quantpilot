import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#151926" } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <Toast />
    </>
  );
}
