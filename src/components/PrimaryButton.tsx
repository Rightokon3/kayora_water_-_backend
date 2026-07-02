/**
 * PrimaryButton
 *
 * Large rounded button used for the main action on every screen
 * (Login, Create Account, etc). Includes a subtle press-down scale
 * animation and a loading state that swaps the label for a spinner
 * without changing the button's size (avoids layout jump).
 */
import React, { useCallback } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Colors } from "@/constants/colors";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "filled" | "outline";
  style?: ViewStyle;
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "filled",
  style,
}: PrimaryButtonProps) {
  const scale = useSharedValue(1);
  const isInactive = disabled || loading;

  const handlePressIn = useCallback(() => {
    if (isInactive) return;
    scale.value = withTiming(0.97, { duration: 120 });
  }, [isInactive, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 160 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isInactive}
        style={[
          styles.button,
          variant === "outline" && styles.outlineButton,
          isInactive && styles.disabledButton,
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isInactive }}
      >
        {loading ? (
          <ActivityIndicator color={variant === "outline" ? Colors.primaryBlue : Colors.white} />
        ) : (
          <Text style={[styles.label, variant === "outline" ? styles.outlineLabel : styles.filledLabel]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.primaryBlue,
  },
  disabledButton: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
  filledLabel: {
    color: Colors.white,
  },
  outlineLabel: {
    color: Colors.primaryBlue,
  },
});
