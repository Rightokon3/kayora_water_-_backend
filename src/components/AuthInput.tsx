/**
 * AuthInput
 *
 * Reusable labeled text input matching the reference design: small
 * label above a light-gray rounded field. Animates border color and
 * background tint on focus, and shows an animated error message
 * (fade + slight shake) below the field when `errorText` is set.
 */
import React, { forwardRef, useCallback, useState } from "react";
import {
  KeyboardTypeOptions,
  NativeSyntheticEvent,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

type AuthInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  errorText?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  /** Right-side success state, e.g. a green check icon rendered by the parent. */
  rightAccessory?: React.ReactNode;
  /** Force the success (green) border even without an accessory, e.g. matched passwords. */
  isValid?: boolean;
};

export const AuthInput = forwardRef<TextInput, AuthInputProps>(function AuthInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    errorText,
    autoCapitalize = "sentences",
    autoCorrect = true,
    keyboardType = "default",
    returnKeyType,
    onSubmitEditing,
    rightAccessory,
    isValid,
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const shakeX = useSharedValue(0);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [shakeX]);

  const previousErrorRef = React.useRef(errorText);
  React.useEffect(() => {
    if (errorText && errorText !== previousErrorRef.current) {
      triggerShake();
    }
    previousErrorRef.current = errorText;
  }, [errorText, triggerShake]);

  const handleFocus = useCallback((_e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback((_e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    setIsFocused(false);
  }, []);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const hasError = Boolean(errorText);
  const showSuccess = !hasError && isValid;

  const borderColor = hasError
    ? Colors.borderError
    : showSuccess
    ? Colors.borderSuccess
    : isFocused
    ? Colors.borderFocused
    : Colors.border;

  const backgroundColor = isFocused || hasError || showSuccess ? Colors.white : Colors.inputBackground;

  return (
    <Animated.View style={[styles.container, shakeStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.fieldWrapper,
          { borderColor, backgroundColor },
          (isFocused || hasError || showSuccess) && styles.fieldWrapperElevated,
        ]}
      >
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.placeholder}
          style={styles.input}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightAccessory}
      </View>
      {hasError && <Text style={styles.errorText}>{errorText}</Text>}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.grayText,
    marginBottom: 6,
  },
  fieldWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  fieldWrapperElevated: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.darkText,
    height: "100%",
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 2,
  },
});
