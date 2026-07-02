import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import { Colors, Spacing } from "../../constants/theme";
import { OnboardingPage } from "../../constants/onboarding";
import { KayoraLogo } from "./KayoraLogo";
import { FeatureCard } from "./FeatureCard";
import { useResponsive, MAX_CONTENT_WIDTH } from "../../../utils/responsive";

type OnboardingItemProps = {
  page: OnboardingPage;
  active: boolean;
  index: number;
  
  renderCta?: () => React.ReactNode;
};

export function OnboardingItem({ page, active, renderCta }: OnboardingItemProps) {
  const { rs, isTablet, isDesktop, width } = useResponsive();

  // Shared values for staggered entrance animation
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const logoTranslateY = useSharedValue(12);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(18);
  const descOpacity = useSharedValue(0);
  const descTranslateY = useSharedValue(18);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslateY = useSharedValue(18);

  useEffect(() => {
    if (active) {
      const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);

      logoOpacity.value = withTiming(1, { duration: 480 });
      logoScale.value = withTiming(1, { duration: 480, easing });
      logoTranslateY.value = withTiming(0, { duration: 480, easing });

      titleOpacity.value = withDelay(140, withTiming(1, { duration: 420 }));
      titleTranslateY.value = withDelay(140, withTiming(0, { duration: 420, easing }));

      descOpacity.value = withDelay(230, withTiming(1, { duration: 420 }));
      descTranslateY.value = withDelay(230, withTiming(0, { duration: 420, easing }));

      ctaOpacity.value = withDelay(360, withTiming(1, { duration: 420 }));
      ctaTranslateY.value = withDelay(360, withTiming(0, { duration: 420, easing }));
    } else {
      // Reset so re-entering plays the animation again
      logoOpacity.value = 0;
      logoScale.value = 0.9;
      logoTranslateY.value = 12;
      titleOpacity.value = 0;
      titleTranslateY.value = 18;
      descOpacity.value = 0;
      descTranslateY.value = 18;
      ctaOpacity.value = 0;
      ctaTranslateY.value = 18;
    }
  }, [active]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: logoTranslateY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));
  const descStyle = useAnimatedStyle(() => ({
    opacity: descOpacity.value,
    transform: [{ translateY: descTranslateY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslateY.value }],
  }));

  const logoSize = rs({ smallPhone: 160, phone: 220, tablet: 280, desktop: 320 });
  const titleFontSize = rs({ smallPhone: 26, phone: 30, tablet: 36, desktop: 42 });
  const bodyFontSize = rs({ smallPhone: 14, phone: 16, tablet: 18, desktop: 20 });
  const leadFontSize = rs({ smallPhone: 18, phone: 20, tablet: 24, desktop: 28 });
  const containerWidth = isDesktop || isTablet ? Math.min(width, MAX_CONTENT_WIDTH) : "100%";
  const useTwoColumnGrid = (isTablet || isDesktop) && (page.type === "features" || page.type === "features-alt");

  return (
    <View style={[styles.page, { backgroundColor: page.backgroundColor }]}>
      <View style={[styles.content, { width: containerWidth as any }]}>
        {/* Logo / hero visual — smaller on feature pages to leave room for cards */}
        <Animated.View style={[styles.logoWrapper, logoStyle]}>
          <KayoraLogo
            size={page.type === "hero" || page.type === "cta" ? logoSize : logoSize * 0.55}
            showWordmark={page.type === "hero" || page.type === "cta"}
          />
        </Animated.View>

        <Animated.Text
          style={[styles.title, { fontSize: titleFontSize }, titleStyle]}
          accessibilityRole="header"
        >
          {page.title}
        </Animated.Text>

        {page.subtitleLead ? (
          <Animated.Text style={[styles.subtitleLead, { fontSize: leadFontSize }, descStyle]}>
            {page.subtitleLead}
          </Animated.Text>
        ) : null}

        <Animated.Text style={[styles.subtitle, { fontSize: bodyFontSize }, descStyle]}>
          {page.subtitle}
        </Animated.Text>

        {page.features && page.features.length > 0 && (
          <Animated.View
            style={[
              styles.featuresWrapper,
              useTwoColumnGrid && styles.featuresGrid,
              ctaStyle,
            ]}
          >
            {page.features.map((feature, idx) => (
              <FeatureCard
                key={feature.id}
                icon={feature.icon}
                label={feature.label}
                index={idx}
                active={active}
                halfWidth={useTwoColumnGrid}
              />
            ))}
          </Animated.View>
        )}

        {renderCta && <Animated.View style={[styles.ctaWrapper, ctaStyle]}>{renderCta()}</Animated.View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  logoWrapper: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  title: {
    color: Colors.textDark,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
    letterSpacing: -0.4,
  },
  subtitleLead: {
    color: Colors.primary,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: undefined,
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
    maxWidth: 520,
  },
  featuresWrapper: {
    width: "100%",
    marginTop: Spacing.sm,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  ctaWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: Spacing.md,
  },
});
