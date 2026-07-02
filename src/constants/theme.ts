/**
 * Kayora Water design tokens.
 * Single source of truth for color, type and spacing so no component
 * hardcodes a raw hex value or magic number.
 */

export const Colors = {
  primary: "#0D4A8C",
  primaryDark: "#0A3868",
  primaryLight: "#1A5DA8",
  white: "#FFFFFF",
  background: "#F8FAFC",
  textDark: "#0F172A",
  textSecondary: "#64748B",
  border: "rgba(15, 23, 42, 0.08)",
  shadow: "rgba(13, 74, 140, 0.18)",
  overlay: "rgba(13, 74, 140, 0.06)",
} as const;

export const FontSizes = {
  title: { smallPhone: 26, phone: 30, tablet: 36, desktop: 42 },
  subtitleLead: { smallPhone: 18, phone: 20, tablet: 24, desktop: 28 },
  body: { smallPhone: 14, phone: 16, tablet: 18, desktop: 20 },
  card: { smallPhone: 14, phone: 15, tablet: 17, desktop: 18 },
  button: { smallPhone: 15, phone: 16, tablet: 17, desktop: 18 },
  caption: { smallPhone: 12, phone: 13, tablet: 14, desktop: 14 },
} as const;

export const LogoSizes = {
  smallPhone: 160,
  phone: 220,
  tablet: 280,
  desktop: 320,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radii = {
  sm: 12,
  md: 16,
  lg: 20,
  button: 28,
  pill: 100,
} as const;

export const Easing = {
  // Approximate Bolt-like premium easing curve
  standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
};
