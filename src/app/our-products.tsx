import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Easing as ReanimatedEasing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { Product } from "@/constants/products";
import { useTheme } from "@/hooks/useTheme";
import { addToCart, getUserProfile } from "@/services/storage";

type FilterChipKey =
  | "All"
  | "30cl"
  | "50cl"
  | "75cl"
  | "18.9L"
  | "Newest"
  | "Popular";

const FILTER_CHIPS: FilterChipKey[] = [
  "All",
  "30cl",
  "50cl",
  "75cl",
  "18.9L",
  "Newest",
  "Popular",
];
const API_BASE_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:8000"
    : "https://kayorabackend-production.up.railway.app";

function getColumnCount(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

function applyFilter(products: Product[], chip: FilterChipKey): Product[] {
  switch (chip) {
    case "All":
      return products;
    case "30cl":
    case "50cl":
    case "75cl":
    case "18.9L":
      return products.filter(
        (product) => product.category === chip || product.size === chip,
      );
    case "Newest":
      return [...products].sort((a, b) => b.id - a.id);
    case "Popular":
      return products.filter(
        (product) => product.isPopular || product.is_popular,
      );
    default:
      return products;
  }
}

export default function OurProductsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const columns = getColumnCount(width);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<FilterChipKey>("All");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);

  const toastRef = useRef<AnimatedToastRef>(null);

  // 1. Fetch products from Laravel Backend
  const fetchProducts = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      // Pull user profile to get the security token
      const profile = await getUserProfile();
      const token = profile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // <-- Pass token here to satisfy route authentication
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data && typeof data === "object" && "products" in data) {
          setProducts(Array.isArray(data.products) ? data.products : []);
        } else if (Array.isArray(data)) {
          setProducts(data);
        } else {
          setProducts([]);
        }
      } else {
        throw new Error(
          data?.message || "Unauthenticated or server error status",
        );
      }
    } catch (error) {
      console.error("Product parse error details:", error);
      toastRef.current?.show({
        message: "Failed to load real-time catalog from server.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  // 2. Client-side Search and Filter for speed
  const filteredProducts = useMemo(() => {
    const byChip = applyFilter(products, activeChip);
    const query = searchQuery.trim().toLowerCase();
    if (!query) return byChip;

    return byChip.filter((product) => {
      const haystack = (
        (product.name || "") +
        " " +
        (product.size || "") +
        " " +
        (product.tagline || "")
      ).toLowerCase();
      return haystack.includes(query);
    });
  }, [activeChip, searchQuery, products]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleCartPress = useCallback(() => {
    router.push("/my-cart");
  }, []);

  const handleSeeDetails = useCallback((id: number) => {
    router.push(("/our-products/" + id) as never);
  }, []);

  // 3. Post direct additions straight to your cart session endpoint
  const handleAddToCart = useCallback(async (product: Product) => {
    setPendingProductId(product.id);
    try {
      const profile = await getUserProfile();
      const token = profile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Sync local app storage layout cache
        await addToCart(product.id);
        toastRef.current?.show({
          message: `${product.name} added to cart`,
          type: "success",
          duration: 1800,
        });
      } else {
        throw new Error(data.message || "Failed backend cart sync");
      }
    } catch (error: any) {
      // Client storage redundancy block
      await addToCart(product.id);
      toastRef.current?.show({
        message: "Added to local cart directory.",
        type: "success",
        duration: 1800,
      });
    } finally {
      setPendingProductId(null);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProducts(false);
  }, [fetchProducts]);

  const handleChipPress = useCallback((chip: FilterChipKey) => {
    setActiveChip(chip);
  }, []);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.white }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Back to dashboard"
        >
          <Ionicons name="chevron-back" size={22} color={colors.darkText} />
          <Text style={[styles.backLabel, { color: colors.darkText }]}>
            Back
          </Text>
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.darkText }]}>
          Our Products
        </Text>

        <Pressable
          onPress={handleCartPress}
          style={[
            styles.cartButton,
            { backgroundColor: colors.inputBackground },
          ]}
          accessibilityLabel="Open cart"
        >
          <Ionicons name="cart-outline" size={18} color={colors.darkText} />
        </Pressable>
      </View>

      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="search"
            size={18}
            color={colors.grayText}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by bottle name or size..."
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.darkText }]}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.grayText} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.chipsWrapper}>
        <FlatList
          data={FILTER_CHIPS}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          renderItem={({ item }) => (
            <FilterChip
              label={item}
              isActive={activeChip === item}
              colors={colors}
              onPress={() => handleChipPress(item)}
            />
          )}
        />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          key={columns}
          numColumns={columns}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primaryBlue}
              colors={[colors.primaryBlue]}
            />
          }
          ListEmptyComponent={
            <EmptyState colors={colors} query={searchQuery} />
          }
          renderItem={({ item, index }) => (
            <ProductGridCard
              product={item}
              index={index}
              columns={columns}
              colors={colors}
              isAddingToCart={pendingProductId === item.id}
              onSeeDetails={() => handleSeeDetails(item.id)}
              onAddToCart={() => handleAddToCart(item)}
            />
          )}
        />
      )}

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

type ThemeColors = ReturnType<typeof useTheme>["colors"];

type FilterChipProps = {
  label: FilterChipKey;
  isActive: boolean;
  colors: ThemeColors;
  onPress: () => void;
};

const FilterChip = React.memo(function FilterChip({
  label,
  isActive,
  colors,
  onPress,
}: FilterChipProps) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1.04 : 1, {
      damping: 16,
      stiffness: 220,
    });
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: isActive
              ? colors.primaryBlue
              : colors.inputBackground,
            borderColor: isActive ? colors.primaryBlue : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: isActive ? colors.white : colors.grayText },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

type ProductGridCardProps = {
  product: Product;
  index: number;
  columns: number;
  colors: ThemeColors;
  isAddingToCart: boolean;
  onSeeDetails: () => void;
  onAddToCart: () => void;
};

const ProductGridCard = React.memo(function ProductGridCard({
  product,
  index,
  columns,
  colors,
  isAddingToCart,
  onSeeDetails,
  onAddToCart,
}: ProductGridCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);
  const scale = useSharedValue(1);
  const addButtonScale = useSharedValue(1);

  React.useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    const delay = Math.min(index, 10) * 55;
    opacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 380, easing }),
    );
  }, [index]);

  const handleCardPressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 220 });
  }, []);
  const handleCardPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 220 });
  }, []);

  const handleAddPressIn = useCallback(() => {
    addButtonScale.value = withSpring(0.92, { damping: 16, stiffness: 240 });
  }, []);
  const handleAddPressOut = useCallback(() => {
    addButtonScale.value = withSpring(1, { damping: 16, stiffness: 240 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
  const addButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addButtonScale.value }],
  }));

  const cardWidthStyle = columns > 1 ? { flex: 1 / columns } : undefined;

  // Render Image either via server string or fallbacks
  const imageUri = product.image_url || product.image;

  return (
    <Animated.View style={[styles.cardOuter, cardWidthStyle, cardStyle]}>
      <Pressable
        onPress={onSeeDetails}
        onPressIn={handleCardPressIn}
        onPressOut={handleCardPressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardImageWrapper}>
          {imageUri ? (
            <Animated.Image
              source={{ uri: imageUri }}
              style={styles.cardImage}
            />
          ) : (
            <LinearGradient
              colors={["#0B2545", "#0D4A8C", "#1E5FAF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardImage}
            >
              <Ionicons name="water" size={30} color="rgba(255,255,255,0.55)" />
            </LinearGradient>
          )}

          <View
            style={[styles.sizeBadge, { backgroundColor: colors.goldAccent }]}
          >
            <Text style={styles.sizeBadgeText}>{product.size}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardName, { color: colors.darkText }]}
              numberOfLines={1}
            >
              {product.name}
            </Text>
            {(product.isAvailable || product.stock_count > 0) && (
              <View
                style={[
                  styles.availabilityBadge,
                  { backgroundColor: colors.success + "1A" },
                ]}
              >
                <View
                  style={[
                    styles.availabilityDot,
                    { backgroundColor: colors.success },
                  ]}
                />
                <Text
                  style={[styles.availabilityText, { color: colors.success }]}
                >
                  Available
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.cardTagline, { color: colors.goldAccent }]}>
            {product.tagline}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.grayText }]}
            numberOfLines={2}
          >
            {product.shortDescription || product.description}
          </Text>

          <Text style={[styles.cardPrice, { color: colors.darkText }]}>
            {"\u20A6" + Number(product.price).toLocaleString()}
          </Text>

          <View style={styles.cardActions}>
            <Pressable onPress={onSeeDetails} style={styles.seeDetailsButton}>
              <Text style={[styles.seeDetails, { color: colors.primaryBlue }]}>
                See Details
              </Text>
              <Ionicons
                name="arrow-forward"
                size={12}
                color={colors.primaryBlue}
              />
            </Pressable>

            <Animated.View style={addButtonStyle}>
              <Pressable
                onPress={onAddToCart}
                onPressIn={handleAddPressIn}
                onPressOut={handleAddPressOut}
                disabled={isAddingToCart}
                style={[
                  styles.addToCartButton,
                  { backgroundColor: colors.goldAccent },
                ]}
                accessibilityLabel={"Add " + product.name + " to cart"}
              >
                <Ionicons name="add" size={14} color="#FFFFFF" />
                <Text style={styles.addToCartText}>Add</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

function EmptyState({ colors, query }: { colors: ThemeColors; query: string }) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 420 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.emptyState, animatedStyle]}>
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: colors.inputBackground },
        ]}
      >
        <Ionicons name="search" size={32} color={colors.grayText} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.darkText }]}>
        No products found.
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.grayText }]}>
        {query
          ? "Try another product name or bottle size."
          : "No products match the selected filter."}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    minWidth: 64,
  },
  backLabel: { fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  cartButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrapper: { paddingHorizontal: 20, paddingBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, height: "100%" },
  chipsWrapper: { paddingBottom: 14 },
  chipsContent: { paddingHorizontal: 20, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontWeight: "700" },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  row: { gap: 12 },
  cardOuter: { marginBottom: 14 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#0D4A8C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  cardImageWrapper: { width: "100%", height: 110, position: "relative" },
  cardImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  sizeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sizeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  cardBody: { padding: 12 },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 6,
  },
  cardName: { fontSize: 16, fontWeight: "800", flexShrink: 1 },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availabilityDot: { width: 5, height: 5, borderRadius: 2.5 },
  availabilityText: { fontSize: 9, fontWeight: "700" },
  cardTagline: {
    fontSize: 11,
    fontWeight: "600",
    fontStyle: "italic",
    marginBottom: 6,
  },
  cardDescription: { fontSize: 11, lineHeight: 15, marginBottom: 8 },
  cardPrice: { fontSize: 15, fontWeight: "800", marginBottom: 10 },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeDetailsButton: { flexDirection: "row", alignItems: "center", gap: 3 },
  seeDetails: { fontSize: 12, fontWeight: "700" },
  addToCartButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addToCartText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySubtitle: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
});
