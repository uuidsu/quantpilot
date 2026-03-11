import React, { useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import {
  Home, History, Wallet, Crosshair, Database, Activity,
  LayoutGrid, Settings, GitBranch, X, ChevronRight,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

const MORE_ITEMS: { label: string; icon: typeof Settings; route: string }[] = [
  { label: "同步", icon: GitBranch, route: "/(tabs)/sync" },
  { label: "設定", icon: Settings, route: "/(tabs)/settings" },
];

export default function TabLayout() {
  const [showMore, setShowMore] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleMoreNav = (route: string) => {
    setShowMore(false);
    router.push(route as any);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
            elevation: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -0.5 },
            shadowOpacity: 0.05,
            shadowRadius: 0,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarLabelStyle: { fontSize: 9, fontWeight: "500" },
        }}
      >
        <Tabs.Screen
          name="account"
          options={{
            title: "帳戶",
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="trades"
          options={{
            title: "交易",
            tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="strategy"
          options={{
            title: "策略",
            tabBarIcon: ({ color, size }) => <Crosshair size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="options"
          options={{
            title: "選擇權",
            tabBarIcon: ({ color, size }) => <Activity size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="database"
          options={{
            title: "資料庫",
            tabBarIcon: ({ color, size }) => <Database size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "模擬器",
            tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "更多",
            tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowMore(true);
            },
          }}
        />
        {/* Hidden — accessible via "more" menu */}
        <Tabs.Screen name="sync" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>

      {/* More menu bottom sheet */}
      <Modal visible={showMore} transparent animationType="fade" onRequestClose={() => setShowMore(false)}>
        <Pressable style={s.overlay} onPress={() => setShowMore(false)}>
          <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>更多功能</Text>
              <Pressable onPress={() => setShowMore(false)} hitSlop={12}>
                <X size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {MORE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.route}
                  style={s.menuItem}
                  onPress={() => handleMoreNav(item.route)}
                >
                  <View style={s.menuIcon}>
                    <Icon size={20} color={colors.primary} />
                  </View>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.foreground,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.foreground,
    fontWeight: "500",
  },
});
