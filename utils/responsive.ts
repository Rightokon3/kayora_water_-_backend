
import { useWindowDimensions, Platform } from "react-native";

export type Breakpoint = "smallPhone" | "phone" | "tablet" | "desktop";

export const BREAKPOINTS = {
  smallPhone: 0, // 320px - 374px
  phone: 375, // 375px - 767px
  tablet: 768, // 768px - 1023px
  desktop: 1024, // 1024px+
} as const;

export const MAX_CONTENT_WIDTH = 720;

/**
 * Determine the active breakpoint from a raw width value.
 */
export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  if (width >= BREAKPOINTS.phone) return "phone";
  return "smallPhone";
}

/**
 * Core responsive hook. Re-evaluates on dimension changes (rotation,
 * window resize on web) so layout always matches current viewport.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const breakpoint = getBreakpoint(width);

  const isSmallPhone = breakpoint === "smallPhone";
  const isPhone = breakpoint === "phone";
  const isTablet = breakpoint === "tablet";
  const isDesktop = breakpoint === "desktop";
  const isWeb = Platform.OS === "web";
  const isLandscape = width > height;

  /**
   * Pick a value depending on breakpoint, falling back gracefully.
   * Usage: rs({ smallPhone: 16, phone: 20, tablet: 28, desktop: 32 })
   */
  function rs<T>(values: Partial<Record<Breakpoint, T>> & { phone: T }): T {
    if (breakpoint === "desktop") {
      return values.desktop ?? values.tablet ?? values.phone;
    }
    if (breakpoint === "tablet") {
      return values.tablet ?? values.phone;
    }
    if (breakpoint === "smallPhone") {
      return values.smallPhone ?? values.phone;
    }
    return values.phone;
  }

  /** Content container width — capped on large screens, full on mobile. */
  const containerWidth = isDesktop || isTablet ? Math.min(width, MAX_CONTENT_WIDTH) : width;

  /** Horizontal padding, scales with breakpoint. */
  const horizontalPadding = rs({
    smallPhone: 20,
    phone: 24,
    tablet: 40,
    desktop: 48,
  });

  return {
    width,
    height,
    breakpoint,
    isSmallPhone,
    isPhone,
    isTablet,
    isDesktop,
    isWeb,
    isLandscape,
    rs,
    containerWidth,
    horizontalPadding,
  };
}

/**
 * Non-hook variant for use in places where hooks aren't available
 * (e.g. style sheets created once outside components). Prefer
 * useResponsive() inside components whenever possible.
 */
export function scaleFont(
  width: number,
  values: { smallPhone?: number; phone: number; tablet?: number; desktop?: number }
): number {
  const bp = getBreakpoint(width);
  if (bp === "desktop") return values.desktop ?? values.tablet ?? values.phone;
  if (bp === "tablet") return values.tablet ?? values.phone;
  if (bp === "smallPhone") return values.smallPhone ?? values.phone;
  return values.phone;
}
