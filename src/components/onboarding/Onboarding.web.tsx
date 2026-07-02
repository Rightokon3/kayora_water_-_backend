/**
 * Onboarding (web)
 * Uses a ScrollView instead of react-native-pager-view, since
 * pager-view has no web support and crashes Metro's web bundle.
 */
import React, { useCallback, useEffect, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OnboardingItem } from "./OnboardingItem";
import { OnboardingBottomBar, OnboardingCta } from "./OnboardingChrome";
import { useOnboardingController } from "./useOnboardingController";
import { Colors } from "@/constants/theme";

export function Onboarding() {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const isProgrammaticScroll = useRef(false);

  const {
    pages,
    pageCount,
    activeIndex,
    isLastPage,
    goToPage,
    handleNext,
    handlePrevious,
    handlePageSettled,
    handleGetStarted,
    handleSignIn,
  } = useOnboardingController();

  useEffect(() => {
    isProgrammaticScroll.current = true;
    scrollRef.current?.scrollTo({ x: activeIndex * width, animated: true });
    const release = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 400);
    return () => clearTimeout(release);
  }, [activeIndex, width]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammaticScroll.current) return;
      const settledIndex = Math.round(e.nativeEvent.contentOffset.x / width);
      handlePageSettled(settledIndex);
    },
    [handlePageSettled, width]
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.pager}
        contentContainerStyle={styles.scrollContent}
      >
        {pages.map((page, index) => (
          <View key={page.id} style={[styles.pageContainer, { width }]}>
            <OnboardingItem
              page={page}
              index={index}
              active={activeIndex === index}
              renderCta={
                page.type === "cta"
                  ? () => <OnboardingCta onGetStarted={handleGetStarted} onSignIn={handleSignIn} />
                  : undefined
              }
            />
          </View>
        ))}
      </ScrollView>

      <OnboardingBottomBar
        pageCount={pageCount}
        activeIndex={activeIndex}
        isLastPage={isLastPage}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onDotPress={goToPage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  pager: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  pageContainer: { flex: 1 },
});