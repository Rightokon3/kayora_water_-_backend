/**
 * BottomTabBar
 *
 * The four-tab bar (Our Products / My Orders / Settings / My Cart)
 * shared across every main app screen. Extracted out of dashboard.tsx
 * so screens like my-cart.tsx can render the exact same bar - same
 * icons, same animation, same colors - without copy-pasting JSX that
 * would silently drift the moment either screen is edited later.
 *
 * Each screen passes its own activeTab (since the active tab is
 * "which screen am I on", not shared state) and gets navigation for
 * free via each tab's configured route.
 */
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

export type TabKey = "products" | "orders" | "settings" | "cart";

type TabConfig = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

export const BOTTOM_TABS: TabConfig[] = [
  { key: "products", label: "Our Products", icon: "home", route: "/dashboard" },
  { key: "orders", label: "My Orders", icon: "cube", route: "/my-orders" },
  { key: "settings", label: "Settings", icon: "settings", route: "/settings" },
  { key: "cart", label: "My Cart", icon: "cart", route: "/my-cart" },
];

/**
 * Colors needed by the tab bar. Typed as plain strings (not literal
 * hex unions from `typeof Colors`) so both the light palette and
 * DarkColors — which share these key names but different literal
 * values — are valid without a cast at every call site.
 */
export type TabBarColors = {
  white: string;
  border: string;
  primaryBlue: string;
  grayText: string;
};

type BottomTabBarProps = {
  activeTab: TabKey;
  colors: TabBarColors;
  onTabPress?: (tab: TabKey) => void;
};

export function BottomTabBar({ activeTab, colors, onTabPress }: BottomTabBarProps) {
  const handlePress = (tab: TabConfig) => {
    onTabPress?.(tab.key);
    if (tab.key !== activeTab) {
      router.push(tab.route as never);
    }
  };

  return (
    <View style={[styles.tabBar, { backgroundColor: colors.white, borderTopColor: colors.border }]}>
      {BOTTOM_TABS.map((tab) => (
        <TabBarItem
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          colors={colors}
          onPress={() => handlePress(tab)}
        />
      ))}
    </View>
  );
}

type TabBarItemProps = {
  tab: TabConfig;
  isActive: boolean;
  colors: TabBarColors;
  onPress: () => void;
};

const TabBarItem = React.memo(function TabBarItem({ tab, isActive, colors, onPress }: TabBarItemProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.12 : 1, { damping: 14, stiffness: 200 });
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeColor = colors.primaryBlue;
  const inactiveColor = colors.grayText;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={tab.icon} size={22} color={isActive ? activeColor : inactiveColor} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color: isActive ? activeColor : inactiveColor }]}>{tab.label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
