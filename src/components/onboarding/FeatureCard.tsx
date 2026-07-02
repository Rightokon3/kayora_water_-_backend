
import React, { useEffect } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import { Colors, Radii, Spacing } from "../../constants/theme";
import { FeatureIcon } from "./FeatureIcon";
import { useResponsive } from "../../../utils/responsive";

type FeatureCardProps = {
  icon: string;
  label: string;
  index: number;
  /** whether the parent page is currently active/focused */
  active: boolean;
  /** render at half-width for 2-column tablet/desktop grids */
  halfWidth?: boolean;
};

export function FeatureCard({ icon, label, index, active, halfWidth = false }: FeatureCardProps) {
  const { rs } = useResponsive();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    if (active) {
      const delay = 120 + index * 90;
      opacity.value = withDelay(delay, withTiming(1, { duration: 420 }));
      translateY.value = withDelay(
        delay,
        withTiming(0, { duration: 420, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) })
      );
    } else {
      opacity.value = 0;
      translateY.value = 16;
    }
  }, [active, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const cardFontSize = rs({ smallPhone: 14, phone: 15, tablet: 17, desktop: 18 });

  return (
    <Animated.View
      style={[
        styles.card,
        halfWidth && styles.halfWidth,
        { padding: rs({ smallPhone: 14, phone: 16, tablet: 18, desktop: 20 }) },
        animatedStyle,
      ]}
    >
      <View style={styles.iconBadge}>
        <FeatureIcon name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={[styles.label, { fontSize: cardFontSize }]} numberOfLines={2}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm + 4,
    width: "100%",
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 14,
      },
      android: {
        elevation: 3,
      },
      web: {
        // @ts-ignore - web-only boxShadow
        boxShadow: `0 6px 18px ${Colors.shadow}`,
      },
    }),
  },
  halfWidth: {
    width: "48%",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm - 2,
    backgroundColor: Colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm + 4,
  },
  label: {
    flex: 1,
    color: Colors.textDark,
    fontWeight: "600",
  },
});