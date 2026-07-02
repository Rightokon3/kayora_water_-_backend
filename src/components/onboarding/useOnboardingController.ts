import { useCallback, useState } from "react";
import { router } from "expo-router";
import { ONBOARDING_PAGES } from "@/constants/onboarding";
import { useOnboarding } from "@/hooks/useOnboarding";

export function useOnboardingController() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { completeOnboarding } = useOnboarding();

  const pageCount = ONBOARDING_PAGES.length;
  const isLastPage = activeIndex === pageCount - 1;

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, pageCount - 1)),
    [pageCount]
  );

  const handleGetStarted = useCallback(async () => {
    await completeOnboarding();
    router.replace("/(sign)/login");
  }, [completeOnboarding]);

  const handleSignIn = useCallback(async () => {
    await completeOnboarding();
    router.dismissAll?.();
   router.replace("/(sign)/login");
  }, [completeOnboarding]);

  const handleNext = useCallback(() => {
    if (isLastPage) {
      handleGetStarted();
      return;
    }
    setActiveIndex((current) => clampIndex(current + 1));
  }, [isLastPage, handleGetStarted, clampIndex]);

  const handlePrevious = useCallback(() => {
    setActiveIndex((current) => clampIndex(current - 1));
  }, [clampIndex]);

  const handlePageSettled = useCallback((index: number) => {
    setActiveIndex(clampIndex(index));
  }, [clampIndex]);

  const goToPage = useCallback(
    (index: number) => {
      setActiveIndex(clampIndex(index));
    },
    [clampIndex]
  );

  return {
    pages: ONBOARDING_PAGES,
    pageCount,
    activeIndex,
    isLastPage,
    goToPage,
    handleNext,
    handlePrevious,
    handlePageSettled,
    handleGetStarted,
    handleSignIn,
  };
}