import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { NavigationButtons } from "./NavigationButtons";
import { Pagination } from "./Pagination";
import { PrimaryButton } from "./PrimaryButton";
import { useResponsive } from "../../../utils/responsive";

type OnboardingBottomBarProps = {
  pageCount: number;
  activeIndex: number;
  isLastPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onDotPress: (index: number) => void;
};

export function OnboardingBottomBar({
  pageCount,
  activeIndex,
  isLastPage,
  onPrevious,
  onNext,
  onDotPress,
}: OnboardingBottomBarProps) {
  const { horizontalPadding, isDesktop, isTablet } = useResponsive();

  return (
    <View
      style={[
        styles.bottomBar,
        {
          paddingHorizontal: horizontalPadding,
          maxWidth: isDesktop || isTablet ? 720 : undefined,
          width: isDesktop || isTablet ? "100%" : undefined,
          alignSelf: isDesktop || isTablet ? "center" : undefined,
        },
      ]}
    >
      {!isLastPage ? (
        <NavigationButtons
          pageCount={pageCount}
          activeIndex={activeIndex}
          isLastPage={isLastPage}
          onPrevious={onPrevious}
          onNext={onNext}
          onDotPress={onDotPress}
        />
      ) : (
        <View style={styles.lastPageDotsRow}>
          <Pagination count={pageCount} activeIndex={activeIndex} onDotPress={onDotPress} />
        </View>
      )}
    </View>
  );
}

type OnboardingCtaProps = {
  onGetStarted: () => void;
  onSignIn: () => void;
};

export function OnboardingCta({ onGetStarted, onSignIn }: OnboardingCtaProps) {
  return (
    <View style={styles.ctaGroup}>
      <PrimaryButton label="Get Started" onPress={onGetStarted} />
      <View style={styles.signInRow}>
        <Text style={styles.signInPrompt}>Already have an account? </Text>
        <Text style={styles.signInLink} onPress={onSignIn}>
          Sign In
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    minHeight: 64,
    justifyContent: "center",
  },
  lastPageDotsRow: { alignItems: "center" },
  ctaGroup: { width: "100%", alignItems: "center" },
  signInRow: { flexDirection: "row", marginTop: Spacing.md, alignItems: "center" },
  signInPrompt: { color: Colors.textSecondary, fontSize: 14 },
  signInLink: { color: Colors.primary, fontWeight: "700", fontSize: 14 },
});