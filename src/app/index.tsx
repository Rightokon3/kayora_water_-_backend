
import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { SplashScreen } from "../components/SplashScreen";
import { Onboarding } from "../components/onboarding/Onboarding";
import { useOnboarding } from "../hooks/useOnboarding";
import { Colors } from "../constants/theme";

export default function Index() {
  const [splashFinished, setSplashFinished] = useState(false);
  const { isReady, hasSeenOnboarding } = useOnboarding();

  const handleSplashFinish = useCallback(() => {
    setSplashFinished(true);
  }, []);


  if (!splashFinished || !isReady) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }


  if (hasSeenOnboarding) {
    return <Redirect href="/(sign)/login" />;
  }

  return (
    <View style={styles.root}>
      <Onboarding />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
});
