
import React, { useCallback } from "react";
import { DimensionValue, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Colors, Radii } from "../../constants/theme";
import { useResponsive } from "../../../utils/responsive";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "filled" | "outline";
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, variant = "filled", style }: PrimaryButtonProps) {
  const { rs } = useResponsive();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 120 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 160 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const buttonWidth = rs<DimensionValue>({
    smallPhone: "90%",
    phone: "88%",
    tablet: "70%",
    desktop: 420,
  });
  const fontSize = rs({ smallPhone: 15, phone: 16, tablet: 17, desktop: 18 });

  return (
    <Animated.View style={[{ width: buttonWidth }, animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, variant === "outline" && styles.outlineButton]}
        accessibilityRole="button"
      >
        <Text
          style={[
            styles.label,
            { fontSize },
            variant === "outline" ? styles.outlineLabel : styles.filledLabel,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  label: {
    fontWeight: "700",
  },
  filledLabel: {
    color: Colors.white,
  },
  outlineLabel: {
    color: Colors.primary,
  },
});
