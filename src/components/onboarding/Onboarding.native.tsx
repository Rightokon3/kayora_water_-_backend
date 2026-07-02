/**
 * Onboarding
 * Orchestrates the full swipeable onboarding flow:
 *  - react-native-pager-view for native horizontal paging (smooth,
 *    snap-scrolling, no lag — same engine class as most premium apps)
 *  - Keeps Previous/Next buttons, dot indicator and the pager itself
 *    perfectly in sync via a single `activeIndex` source of truth
 *  - Renders the final-page CTA (Get Started / Sign In) and persists
 *    onboarding completion via useOnboarding before navigating away
 */
import React, { useCallback, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import PagerView from "react-native-pager-view";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ONBOARDING_PAGES } from "../../constants/onboarding";
import { OnboardingItem } from "./OnboardingItem";
import { NavigationButtons } from "./NavigationButtons";
import { Pagination } from "./Pagination";
import { PrimaryButton } from "./PrimaryButton";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Colors, Spacing } from "../../constants/theme";
import { useResponsive } from "../../../utils/responsive";

export function Onboarding() {
  const pagerRef = useRef<PagerView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const { horizontalPadding, isDesktop, isTablet } = useResponsive();

  const pageCount = ONBOARDING_PAGES.length;
  const isLastPage = activeIndex === pageCount - 1;

  const goToPage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, pageCount - 1));
      pagerRef.current?.setPage(clamped);
      setActiveIndex(clamped);
    },
    [pageCount]
  );

  const handleGetStarted = useCallback(async () => {
    await completeOnboarding();
    router.replace("/(sign)/signup");
  }, [completeOnboarding]);

  const handleSignIn = useCallback(async () => {
    await completeOnboarding();
    router.replace("/(sign)/login");
  }, [completeOnboarding]);

  const handleNext = useCallback(() => {
    if (isLastPage) {
      handleGetStarted();
      return;
    }
    goToPage(activeIndex + 1);
  }, [activeIndex, isLastPage, goToPage, handleGetStarted]);

  const handlePrevious = useCallback(() => {
    goToPage(activeIndex - 1);
  }, [activeIndex, goToPage]);

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    setActiveIndex(e.nativeEvent.position);
  }, []);

  // On web/desktop, react-native-pager-view falls back to a scroll-based
  // implementation via react-native-web; horizontal swipe + button/dot
  // navigation all stay functional through the same `goToPage` path.

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={handlePageSelected}
        overdrag={false}
      >
        {ONBOARDING_PAGES.map((page, index) => (
          <View key={page.id} style={styles.pageContainer}>
            <OnboardingItem
              page={page}
              index={index}
              active={activeIndex === index}
              renderCta={
                page.type === "cta"
                  ? () => (
                      <View style={styles.ctaGroup}>
                        <PrimaryButton label="Get Started" onPress={handleGetStarted} />
                        <View style={styles.signInRow}>
                          <Text style={styles.signInPrompt}>Already have an account? </Text>
                          <Text style={styles.signInLink} onPress={handleSignIn}>
                            Sign In
                          </Text>
                        </View>
                      </View>
                    )
                  : undefined
              }
            />
          </View>
        ))}
      </PagerView>

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
            onPrevious={handlePrevious}
            onNext={handleNext}
            onDotPress={goToPage}
          />
        ) : (
          <View style={styles.lastPageDotsRow}>
            <Pagination count={pageCount} activeIndex={activeIndex} onDotPress={goToPage} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  pager: {
    flex: 1,
  },
  pageContainer: {
    flex: 1,
  },
  bottomBar: {
    paddingTop: Spacing.sm,
    paddingBottom: Platform.select({ ios: Spacing.sm, default: Spacing.md }),
    minHeight: 64,
    justifyContent: "center",
  },
  lastPageDotsRow: {
    alignItems: "center",
  },
  ctaGroup: {
    width: "100%",
    alignItems: "center",
  },
  signInRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
    alignItems: "center",
  },
  signInPrompt: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  signInLink: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
});
