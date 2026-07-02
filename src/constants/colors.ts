/**
 * Kayora brand colors. Single source of truth — every component
 * imports from here, nothing hardcodes a hex value.
 */
export const Colors = {
  primaryBlue: "#0D4A8C",
  secondaryBlue: "#1E5FAF",
  goldAccent: "#D4A64A",
  white: "#FFFFFF",
  lightBlue: "#EAF6FF",
  cardBackground: "#F8FAFC",
  success: "#22C55E",
  error: "#EF4444",
  darkText: "#1F2937",
  grayText: "#6B7280",

  // Derived/utility tones used across inputs, borders, overlays.
  // Kept here (not invented ad-hoc in components) so every shade is
  // traceable back to the brand colors above.
  inputBackground: "#F3F4F6",
  inputBackgroundFocused: "#EAF6FF",
  border: "#E5E7EB",
  borderFocused: "#0D4A8C",
  borderError: "#EF4444",
  borderSuccess: "#22C55E",
  placeholder: "#9CA3AF",
  overlay: "rgba(15, 23, 42, 0.45)",
  shadow: "rgba(13, 74, 140, 0.15)",
} as const;

export type ColorKey = keyof typeof Colors;

/**
 * Dark-mode counterparts for the subset of tokens that actually need
 * to invert (surfaces, text, borders). Brand colors (primaryBlue,
 * secondaryBlue, goldAccent, success, error) stay identical in both
 * modes — only neutrals flip, which is what keeps the Kayora brand
 * recognizable regardless of theme.
 */
export const DarkColors = {
  ...Colors,
  white: "#0B1220",
  cardBackground: "#111827",
  inputBackground: "#1F2937",
  inputBackgroundFocused: "#1E293B",
  darkText: "#F1F5F9",
  grayText: "#94A3B8",
  border: "#1F2937",
  placeholder: "#64748B",
  overlay: "rgba(0, 0, 0, 0.6)",
  shadow: "rgba(0, 0, 0, 0.4)",
} as const;