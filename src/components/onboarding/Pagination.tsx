
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import { Colors } from "../../constants/theme";

type PaginationProps = {
  count: number;
  activeIndex: number;
  onDotPress: (index: number) => void;
};

const DOT_SIZE = 8;
const ACTIVE_WIDTH = 24;

export function Pagination({ count, activeIndex, onDotPress }: PaginationProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} isActive={index === activeIndex} onPress={() => onDotPress(index)} />
      ))}
    </View>
  );
}

function Dot({ isActive, onPress }: { isActive: boolean; onPress: () => void }) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isActive ? ACTIVE_WIDTH : DOT_SIZE, {
        duration: 320,
        easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
      }),
      backgroundColor: withTiming(isActive ? Colors.primary : "rgba(15, 23, 42, 0.16)", {
        duration: 320,
      }),
    };
  });

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      style={styles.hitArea}
    >
      <Animated.View style={[styles.dot, animatedStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hitArea: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
