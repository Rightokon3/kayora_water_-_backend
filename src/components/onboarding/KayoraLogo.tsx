/**
 * KayoraLogo
 * Renders the real Kayora brand logo from assets/logo.png.
 * Use a transparent PNG so it sits cleanly on any background
 * (white onboarding pages, blue splash screen, etc).
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";

type KayoraLogoProps = {
  size?: number;
  variant?: "color" | "white";
  showWordmark?: boolean;
};

export function KayoraLogo({ size = 220 }: KayoraLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require("../../../assets/images/kayora-logo.png")}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});