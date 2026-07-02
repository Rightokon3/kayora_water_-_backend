/**
 * LocationCard
 *
 * Displays one saved delivery address: a label icon (Home/Work/etc),
 * the label name, and the full address beneath it. Includes a
 * trailing remove (trash) button. Animates in with a fade + rise when
 * first mounted, matching the rest of the app's entrance pattern.
 */
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { AddressLabelType, SavedAddress } from "@/types/location";

type LocationCardProps = {
  address: SavedAddress;
  onRemove: (id: string) => void;
};

const LABEL_ICONS: Record<AddressLabelType, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Work: "briefcase",
  School: "school",
  Parents: "people",
  Shop: "storefront",
  Custom: "location",
};

export function LocationCard({ address, onRemove }: LocationCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    opacity.value = withTiming(1, { duration: 360 });
    translateY.value = withTiming(0, { duration: 360, easing });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const displayLabel =
    address.label === "Custom" && address.customLabel ? address.customLabel : address.label;

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.iconBadge}>
        <Ionicons name={LABEL_ICONS[address.label]} size={20} color={Colors.primaryBlue} />
      </View>

      <View style={styles.textColumn}>
        <Text style={styles.label}>{displayLabel}</Text>
        <Text style={styles.address} numberOfLines={2}>
          {address.address}
        </Text>
      </View>

      <Pressable
        onPress={() => onRemove(address.id)}
        hitSlop={10}
        style={styles.removeButton}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${displayLabel} address`}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.lightBlue,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.darkText,
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: Colors.grayText,
  },
  removeButton: {
    padding: 6,
    marginLeft: 8,
  },
});
