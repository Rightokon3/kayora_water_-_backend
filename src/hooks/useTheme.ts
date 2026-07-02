/**
 * useTheme
 *
 * Minimal theme controller backing the Light/Dark/System selector in
 * the dashboard header. "System" mode listens to the OS appearance
 * via Expo/React Native's Appearance API and updates live if the
 * user changes their OS theme while the app is open — it isn't just
 * read once at launch.
 *
 * Not persisted across app restarts in this demo (no AsyncStorage
 * write here) — wiring that up later is a one-line addition inside
 * setMode, it doesn't change this hook's public shape.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { Colors, DarkColors } from "@/constants/colors";

export type ThemeMode = "light" | "dark" | "system";

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const resolvedScheme: "light" | "dark" =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const colors = useMemo(
    () => (resolvedScheme === "dark" ? DarkColors : Colors),
    [resolvedScheme]
  );

  const cycleMode = useCallback(() => {
    setMode((current) => {
      if (current === "light") return "dark";
      if (current === "dark") return "system";
      return "light";
    });
  }, []);

  return {
    mode,
    setMode,
    cycleMode,
    resolvedScheme,
    isDark: resolvedScheme === "dark",
    colors,
  };
}