/**
 * AnimatedToast
 *
 * Floating toast shown via an imperative ref API:
 *   const toastRef = useRef<AnimatedToastRef>(null);
 *   toastRef.current?.show({ message: "...", type: "error" });
 *   <AnimatedToast ref={toastRef} />
 *
 * Slides down + fades in from above the safe area, holds, then slides
 * back up + fades out. Used instead of Alert() everywhere in the app
 * per the project's "no blocking alerts" requirement.
 */
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

export type ToastType = "success" | "error";

export type ToastOptions = {
  message: string;
  type?: ToastType;
  /** How long the toast stays visible before auto-dismissing, in ms. */
  duration?: number;
};

export type AnimatedToastRef = {
  show: (options: ToastOptions) => void;
  hide: () => void;
};

const DEFAULT_DURATION = 3000;
const ANIMATION_DURATION = 280;
const EXIT_ANIMATION_DURATION = 220;

export const AnimatedToast = forwardRef<AnimatedToastRef>(function AnimatedToast(_props, ref) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("error");
  const [isMounted, setIsMounted] = useState(false);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-30);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    const easing = ReanimatedEasing.in(ReanimatedEasing.cubic);
    opacity.value = withTiming(0, { duration: EXIT_ANIMATION_DURATION, easing });
    translateY.value = withTiming(-30, { duration: EXIT_ANIMATION_DURATION, easing });

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (unmountTimeoutRef.current) {
      clearTimeout(unmountTimeoutRef.current);
    }
    unmountTimeoutRef.current = setTimeout(() => setIsMounted(false), EXIT_ANIMATION_DURATION);
  }, [opacity, translateY]);

  const show = useCallback(
    (options: ToastOptions) => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (unmountTimeoutRef.current) {
        clearTimeout(unmountTimeoutRef.current);
      }

      setMessage(options.message);
      setType(options.type ?? "error");
      setIsMounted(true);

      const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
      opacity.value = withTiming(1, { duration: ANIMATION_DURATION, easing });
      translateY.value = withTiming(0, { duration: ANIMATION_DURATION, easing });

      hideTimeoutRef.current = setTimeout(() => {
        hide();
      }, options.duration ?? DEFAULT_DURATION);
    },
    [opacity, translateY, hide]
  );

  useImperativeHandle(ref, () => ({ show, hide }), [show, hide]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!isMounted) {
    return null;
  }

  const isError = type === "error";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { top: insets.top + 12 },
        { backgroundColor: isError ? "#FEF2F2" : "#F0FDF4" },
        { borderColor: isError ? Colors.error : Colors.success },
        animatedStyle,
      ]}
    >
      <Ionicons
        name={isError ? "alert-circle" : "checkmark-circle"}
        size={20}
        color={isError ? Colors.error : Colors.success}
        style={styles.icon}
      />
      <Text style={[styles.message, { color: isError ? Colors.error : Colors.success }]}>
        {message}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 999,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
});
