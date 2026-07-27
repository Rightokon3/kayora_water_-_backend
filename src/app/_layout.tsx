import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";

import { getUserProfile } from "@/services/storage";
import { Colors } from "@/constants/colors";
import { OfflineGate } from "../components/OfflineGate";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function checkAuthSession() {
      try {
        const user = await getUserProfile();
        
        // If a valid token exists, route straight to the dashboard
        if (user && user.token) {
          router.replace("/dashboard");
        }
      } catch (error) {
        console.error("Failed to verify auth session:", error);
      } finally {
        setIsCheckingSession(false);
        // Hide the splash screen smoothly once the routing check is done
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    checkAuthSession();
  }, []);

  // Show a clean loading indicator while determining the destination
  if (isCheckingSession) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.white || "#FFFFFF" }}>
        <ActivityIndicator size="large" color={Colors.primaryBlue || "#007AFF"} />
      </View>
    );
  }

  return (
     <OfflineGate>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(sign)" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </OfflineGate>
  );
}