import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/theme";
import { Pagination } from "./Pagination";
import { useResponsive } from "../../../utils/responsive";

type NavigationButtonsProps = {
  pageCount: number;
  activeIndex: number;
  isLastPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onDotPress: (index: number) => void;
};

export function NavigationButtons({
  pageCount,
  activeIndex,
  isLastPage,
  onPrevious,
  onNext,
  onDotPress,
}: NavigationButtonsProps) {
  const { rs } = useResponsive();
  const isFirstPage = activeIndex === 0;
  const fontSize = rs({ smallPhone: 14, phone: 15, tablet: 16, desktop: 16 });

  return (
    <View style={styles.row}>
      <View style={styles.sideSlot}>
        {!isFirstPage && (
          <Pressable onPress={onPrevious} hitSlop={12} style={styles.textButton}>
            <Text style={[styles.previousLabel, { fontSize }]}>Previous</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.centerSlot}>
        <Pagination count={pageCount} activeIndex={activeIndex} onDotPress={onDotPress} />
      </View>

      <View style={[styles.sideSlot, styles.rightSlot]}>
        <Pressable onPress={onNext} hitSlop={12} style={styles.textButton}>
          <Text style={[styles.nextLabel, { fontSize }]}>{isLastPage ? "Get Started" : "Next"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  sideSlot: {
    minWidth: 76,
    justifyContent: "center",
  },
  rightSlot: {
    alignItems: "flex-end",
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  previousLabel: {
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  nextLabel: {
    color: Colors.primary,
    fontWeight: "700",
  },
});
