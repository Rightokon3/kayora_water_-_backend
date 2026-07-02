import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { AnimatedToastRef } from "./AnimatedToast";

const AVATAR_SIZE = 110;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

type ProfileImagePickerProps = {
  imageUri: string | null;
  onImageSelected: (uri: string) => void;
  onImageRemoved: () => void;
  /** Shared toast ref from the parent screen, used for validation errors. */
  toastRef: React.RefObject<AnimatedToastRef>;
  /**
   * The user's name (or username), used to derive the fallback
   * initial shown when no photo has been picked. Optional — falls
   * back to a generic person icon if not provided or empty.
   */
  name?: string;
};

function getExtension(uriOrFileName: string): string {
  const cleaned = uriOrFileName.split("?")[0];
  const parts = cleaned.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/** First letter of the first non-empty word, uppercased. */
function getInitial(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Deterministic background color for the initial avatar, derived from
 * the name so the same person always gets the same color rather than
 * a random one changing on every re-render.
 */
function getInitialBackgroundColor(name?: string): string {
  const palette = [Colors.primaryBlue, Colors.secondaryBlue, "#0EA5E9", "#6366F1", "#0D9488"];
  const trimmed = name?.trim();
  if (!trimmed) return Colors.primaryBlue;
  const charCodeSum = trimmed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[charCodeSum % palette.length];
}


export function ProfileImagePicker({
  imageUri,
  onImageSelected,
  onImageRemoved,
  toastRef,
  name,
}: ProfileImagePickerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const scale = useSharedValue(1);
  const imageOpacity = useSharedValue(imageUri ? 1 : 0);
  const removeButtonScale = useSharedValue(imageUri ? 1 : 0);

  const previousUriRef = useRef(imageUri);
  if (previousUriRef.current !== imageUri) {
    previousUriRef.current = imageUri;
    imageOpacity.value = 0;
    imageOpacity.value = withTiming(imageUri ? 1 : 0, { duration: 280 });
    removeButtonScale.value = withTiming(imageUri ? 1 : 0, { duration: 220 });
  }

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.95, { duration: 120 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 160 });
  }, [scale]);

  const validateAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset): boolean => {
      const fileName = asset.fileName ?? asset.uri;
      const extension = getExtension(fileName);

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        toastRef.current?.show({
          message: "Unsupported file type. Use JPG, PNG or WEBP.",
          type: "error",
        });
        return false;
      }

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
        toastRef.current?.show({
          message: "Image is too large. Maximum size is 5MB.",
          type: "error",
        });
        return false;
      }

      return true;
    },
    [toastRef]
  );

  const handlePick = useCallback(async () => {
    setIsProcessing(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        toastRef.current?.show({
          message: "Allow photo library access to upload a profile picture",
          type: "error",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!validateAsset(asset)) {
        return;
      }

      onImageSelected(asset.uri);
    } finally {
      setIsProcessing(false);
    }
  }, [onImageSelected, toastRef, validateAsset]);

  const handleRemove = useCallback(() => {
    onImageRemoved();
  }, [onImageRemoved]);

  const avatarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));
  const removeButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: removeButtonScale.value }],
    opacity: removeButtonScale.value,
  }));

  return (
    <View style={styles.wrapper}>
      <Animated.View style={avatarAnimatedStyle}>
        <Pressable
          onPress={handlePick}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isProcessing}
          style={styles.avatarPressable}
          accessibilityRole="button"
          accessibilityLabel="Upload profile photo"
        >
          <View style={styles.avatarCircle}>
            {imageUri ? (
              <Animated.View style={[styles.imageFill, imageAnimatedStyle]}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  contentFit="cover"
                  transition={150}
                />
              </Animated.View>
            ) : getInitial(name) ? (
              <View
                style={[
                  styles.initialFill,
                  { backgroundColor: getInitialBackgroundColor(name) },
                ]}
              >
                <Text style={styles.initialText}>{getInitial(name)}</Text>
              </View>
            ) : (
              <Ionicons name="person" size={48} color={Colors.placeholder} />
            )}
          </View>

          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={Colors.white} />
          </View>
        </Pressable>
      </Animated.View>

      {imageUri && (
        <Animated.View style={[styles.removeButtonWrapper, removeButtonAnimatedStyle]}>
          <Pressable
            onPress={handleRemove}
            style={styles.removeButton}
            accessibilityRole="button"
            accessibilityLabel="Remove profile photo"
            hitSlop={8}
          >
            <Ionicons name="close" size={14} color={Colors.white} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: AVATAR_SIZE + 24,
    height: AVATAR_SIZE + 24,
    alignSelf: "center",
  },
  avatarPressable: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  imageFill: {
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initialFill: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  initialText: {
    fontSize: 40,
    fontWeight: "700",
    color: Colors.white,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  removeButtonWrapper: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.darkText,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
});