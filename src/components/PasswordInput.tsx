/**
 * PasswordInput
 *
 * Same visual language as AuthInput (label, rounded field, animated
 * focus/error/success states, shake-on-new-error) but with a
 * password-specific eye toggle on the right. When `showMatchIcon` is
 * true and the field is valid, a green check icon renders just to the
 * left of the eye toggle — so the repeat-password field can confirm
 * "passwords match" without losing the ability to reveal/hide text.
 */
import React, { forwardRef, useCallback, useState } from "react";
import {
  NativeSyntheticEvent,
  Pressable,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

type PasswordInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  errorText?: string;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  /** Show a green check icon when the field is valid (e.g. passwords match). */
  showMatchIcon?: boolean;
  isValid?: boolean;
};

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(function PasswordInput(
  {
    label,
    value,
    onChangeText,
    placeholder,
    errorText,
    returnKeyType,
    onSubmitEditing,
    showMatchIcon = false,
    isValid = false,
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
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

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const hasError = Boolean(errorText);
  const showSuccess = !hasError && showMatchIcon && isValid && value.length > 0;

  const borderColor = hasError
    ? Colors.borderError
    : showSuccess
    ? Colors.borderSuccess
    : isFocused
    ? Colors.borderFocused
    : Colors.border;

  const backgroundColor =
    isFocused || hasError || showSuccess ? Colors.white : Colors.inputBackground;

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
          secureTextEntry={!isVisible}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {showSuccess && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={Colors.success}
            style={styles.checkIcon}
          />
        )}
        <Pressable onPress={toggleVisibility} hitSlop={10}>
          <Ionicons
            name={isVisible ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={Colors.grayText}
          />
        </Pressable>
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
  checkIcon: {
    marginRight: 10,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
    marginLeft: 2,
  },
});
