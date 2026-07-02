import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";

import { AuthInput } from "@/components/AuthInput";
import { PasswordInput } from "@/components/PasswordInput";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { ProfileImagePicker } from "@/components/ProfileImagePicker";
import { Colors } from "@/constants/colors";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validatePhone,
  validateUsername,
} from "../../../utils/validation";
import { saveUserProfile } from "@/services/storage";

type TouchedFields = {
  username: boolean;
  email: boolean;
  phone: boolean;
  password: boolean;
  repeatPassword: boolean;
};

// Auto-detects local host endpoint based on your emulator environment
const API_BASE_URL = Platform.OS === "android" ? "http://127.0.0.1:8000" : "http://localhost:8000";

export default function SignupScreen() {
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [touched, setTouched] = useState<TouchedFields>({
    username: false,
    email: false,
    phone: false,
    password: false,
    repeatPassword: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);

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
    formTranslateY.value = withDelay(120, withTiming(0, { duration: 420, easing }));
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const usernameError = useMemo(() => validateUsername(username), [username]);
  const emailError = useMemo(() => validateEmail(email), [email]);
  const phoneError = useMemo(() => validatePhone(phone), [phone]);
  const passwordError = useMemo(() => validatePassword(password), [password]);
  const repeatPasswordError = useMemo(
    () => (passwordError ? undefined : validatePasswordMatch(password, repeatPassword)),
    [password, repeatPassword, passwordError]
  );

  const passwordsMatch = !passwordError && !repeatPasswordError && repeatPassword.length > 0;

  const shouldShow = useCallback(
    (field: keyof TouchedFields) => touched[field] || submitAttempted,
    [touched, submitAttempted]
  );

  const markTouched = useCallback((field: keyof TouchedFields) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const isFormValid =
    !usernameError && !emailError && !phoneError && !passwordError && !repeatPasswordError;

  const handleCreateAccount = useCallback(async () => {
    setSubmitAttempted(true);

    if (!isFormValid) {
      toastRef.current?.show({
        message: "Please fix the highlighted fields",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("email", email.trim().toLowerCase());
      formData.append("phone", phone.trim());
      formData.append("password", password);
      // Backend validation helper rule confirmation handling
      formData.append("password_confirmation", repeatPassword);

      if (profileImageUri) {
        formData.append("profile_picture", {
          uri: Platform.OS === "android" ? profileImageUri : profileImageUri.replace("file://", ""),
          type: "image/jpeg",
          name: "profile.jpg",
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Signup failed. Check credentials.");
      }

      // Persist profile context plus authorization token globally
      await saveUserProfile({
        username: data.user.username,
        email: data.user.email,
        phone: data.user.phone,
        profileImageUri: data.user.profile_picture,
        token: data.token, 
        createdAt: Date.now(),
      });

      router.replace("/routeSetup");
    } catch (error: any) {
      toastRef.current?.show({
        message: error.message || "Something went wrong creating your account. Try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isFormValid, username, email, phone, password, repeatPassword, profileImageUri]);

  const handleNavigateToLogin = useCallback(() => {
    router.push("/login");
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
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join Kayora and get water delivered fast</Text>
          </Animated.View>

          <Animated.View style={[styles.form, formStyle]}>
            <ProfileImagePicker
              imageUri={profileImageUri}
              onImageSelected={setProfileImageUri}
              onImageRemoved={() => setProfileImageUri(null)}
              toastRef={toastRef}
            />

            <View style={styles.fieldsSpacer} />

            <AuthInput
              label="Username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                markTouched("username");
              }}
              placeholder="e.g. paul_walker"
              autoCapitalize="none"
              autoCorrect={false}
              errorText={shouldShow("username") ? usernameError : undefined}
              isValid={!usernameError && username.length > 0}
              returnKeyType="next"
            />

            <AuthInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                markTouched("email");
              }}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              errorText={shouldShow("email") ? emailError : undefined}
              isValid={!emailError && email.length > 0}
              returnKeyType="next"
            />

            <AuthInput
              label="Phone Number"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                markTouched("phone");
              }}
              placeholder="+2348012345678"
              keyboardType="phone-pad"
              errorText={shouldShow("phone") ? phoneError : undefined}
              isValid={!phoneError && phone.length > 0}
              returnKeyType="next"
            />

            <PasswordInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                markTouched("password");
              }}
              placeholder="At least 8 characters"
              errorText={shouldShow("password") ? passwordError : undefined}
              returnKeyType="next"
            />

            <PasswordInput
              label="Repeat Password"
              value={repeatPassword}
              onChangeText={(text) => {
                setRepeatPassword(text);
                markTouched("repeatPassword");
              }}
              placeholder="Re-enter your password"
              errorText={shouldShow("repeatPassword") ? repeatPasswordError : undefined}
              showMatchIcon
              isValid={passwordsMatch}
              returnKeyType="done"
              onSubmitEditing={handleCreateAccount}
            />

            <PrimaryButton
              label="Create Account"
              onPress={handleCreateAccount}
              loading={isSubmitting}
              style={styles.submitButton}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginPrompt}>Already have an account? </Text>
              <Text style={styles.loginLink} onPress={handleNavigateToLogin}>
                Login
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: "700", color: Colors.darkText, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { fontSize: 15, color: Colors.grayText },
  form: { width: "100%" },
  fieldsSpacer: { height: 24 },
  submitButton: { marginTop: 8 },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginPrompt: { fontSize: 14, color: Colors.grayText },
  loginLink: { fontSize: 14, color: Colors.primaryBlue, fontWeight: "700" },
});