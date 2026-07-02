
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withSequence, runOnJS, Easing as ReanimatedEasing } from "react-native-reanimated";
import { Colors } from "../constants/theme";
import { KayoraLogo } from "@/components/onboarding/KayoraLogo";
import { useResponsive } from "../../utils/responsive";

const FADE_IN_MS = 500;
const HOLD_MS = 1200;
const FADE_OUT_MS = 400;

type SplashScreenProps = {
  onFinish: () => void;
};

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);
  const { rs } = useResponsive();
  const logoSize = rs({ smallPhone: 140, phone: 180, tablet: 220, desktop: 240 });

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: FADE_IN_MS, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) }),
      withTiming(1, { duration: HOLD_MS }),
      withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      })
    );
    scale.value = withTiming(1, { duration: FADE_IN_MS, easing: ReanimatedEasing.out(ReanimatedEasing.cubic) });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.center, containerStyle]}>
        <Animated.View style={logoStyle}>
          <KayoraLogo size={logoSize} variant="white" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
