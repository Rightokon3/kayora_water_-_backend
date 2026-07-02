import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ONBOARDING_STORAGE_KEY } from "@/constants/onboarding";

type OnboardingState = {
  /** true once the storage read has completed */
  isReady: boolean;
  /** true if the user has already completed onboarding */
  hasSeenOnboarding: boolean;
  /** call when the user finishes onboarding (taps Get Started) */
  completeOnboarding: () => Promise<void>;
  /** dev/test helper to reset the flag */
  resetOnboarding: () => Promise<void>;
};

const isWeb = Platform.OS === "web";

/**
 * Thin platform-split storage helpers. Kept inside this file (rather
 * than a separate storage service) since onboarding-flag persistence
 * is the only thing in this app that currently needs SecureStore at
 * all - if more secure values are added later, extracting these into
 * src/services/secureStorage.ts would be the natural next step.
 */
async function readFlag(): Promise<string | null> {
  if (isWeb) {
    try {
      return window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // localStorage can throw in some restricted/private-browsing
      // contexts - fail safe by treating it as "not set".
      return null;
    }
  }
  return SecureStore.getItemAsync(ONBOARDING_STORAGE_KEY);
}

async function writeFlag(value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(ONBOARDING_STORAGE_KEY, value);
}

async function deleteFlag(): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ONBOARDING_STORAGE_KEY);
}

export function useOnboarding(): OnboardingState {
  const [isReady, setIsReady] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadFlag() {
      try {
        const value = await readFlag();
        if (isMounted) {
          setHasSeenOnboarding(value === "true");
        }
      } catch (error) {
        // If storage fails for any reason, fail safe by showing
        // onboarding rather than crashing the app.
        console.warn("useOnboarding: failed to read flag", error);
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    loadFlag();
    return () => {
      isMounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await writeFlag("true");
      setHasSeenOnboarding(true);
    } catch (error) {
      console.warn("useOnboarding: failed to persist flag", error);
    }
  }, []);

  const resetOnboarding = useCallback(async () => {
    try {
      await deleteFlag();
      setHasSeenOnboarding(false);
    } catch (error) {
      console.warn("useOnboarding: failed to reset flag", error);
    }
  }, []);

  return { isReady, hasSeenOnboarding, completeOnboarding, resetOnboarding };
}