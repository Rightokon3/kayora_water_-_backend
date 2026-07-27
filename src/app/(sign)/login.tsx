import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    Easing as ReanimatedEasing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { AuthInput } from "@/components/AuthInput";
import { PasswordInput } from "@/components/PasswordInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { validateLoginForm } from "../../../utils/validation";

import { saveUserProfile } from "@/services/storage";

const API_BASE_URL =
  Platform.OS === "android"
    ? "https://kayorabackend-production.up.railway.app"
    : "https://kayorabackend-production.up.railway.app";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifierError, setIdentifierError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const toastRef = useRef<AnimatedToastRef>(null);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(16);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(20);

  React.useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    headerOpacity.value = withTiming(1, { duration: 420 });
    headerTranslateY.value = withTiming(0, { duration: 420, easing });
    formOpacity.value = withDelay(120, withTiming(1, { duration: 420 }));
    formTranslateY.value = withDelay(
      120,
      withTiming(0, { duration: 420, easing }),
    );
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const handleLogin = useCallback(async () => {
    const result = validateLoginForm({ identifier, password });
    setIdentifierError(result.identifierError);
    setPasswordError(result.passwordError);

    if (!result.isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: identifier,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // REMOVED raw SecureStore call that was crashing on Web
        // saveUserProfile handles Web vs Native storage perfectly!
        await saveUserProfile({
          token: data.token,
          username: data.user.username,
          email: data.user.email,
          profileImageUri: data.user.profile_picture,
        });

        router.replace("/dashboard");
      } else {
        toastRef.current?.show({
          message: data.message || "Invalid credentials provided.",
          type: "error",
        });
      }
    } catch (error) {
      toastRef.current?.show({
        message:
          "Network request failed. Ensure your backend server is running and CORS is allowed.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [identifier, password, identifierError, passwordError]);

  const handleNavigateToSignup = useCallback(() => {
    router.push("/signup");
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, headerStyle]}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue to Kayora Water
            </Text>
          </Animated.View>

          <Animated.View style={[styles.form, formStyle]}>
            <AuthInput
              label="Email"
              value={identifier}
              onChangeText={(text) => {
                setIdentifier(text);
                if (identifierError) setIdentifierError(undefined);
              }}
              placeholder="Your email here"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              errorText={identifierError}
              returnKeyType="next"
            />

            <PasswordInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError(undefined);
              }}
              placeholder="Enter your password"
              errorText={passwordError}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <PrimaryButton
              label="Login"
              onPress={handleLogin}
              loading={isSubmitting}
              style={styles.loginButton}
            />

            <View style={styles.signupRow}>
              <Text style={styles.signupPrompt}>
                Don&apos;t have an account?{" "}
              </Text>
              <Text style={styles.signupLink} onPress={handleNavigateToSignup}>
                Sign Up
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "center",
  },
  header: { marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.darkText,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: Colors.grayText },
  form: { width: "100%" },
  loginButton: { marginTop: 12 },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  signupPrompt: { fontSize: 14, color: Colors.grayText },
  signupLink: { fontSize: 14, color: Colors.primaryBlue, fontWeight: "700" },
});
