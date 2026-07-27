import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
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

import { ThemeMode, useTheme } from "@/hooks/useTheme";
import { getUserProfile, UserProfile } from "@/services/storage";
import { Product } from "./Product";

type TabKey = "products" | "orders" | "settings" | "cart";

type TabConfig = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const TABS: TabConfig[] = [
  { key: "products", label: "Our Products", icon: "home", route: "/dashboard" },
  { key: "orders", label: "My Orders", icon: "cube", route: "/my-orders" },
  { key: "settings", label: "Settings", icon: "settings", route: "/settings" },
  { key: "cart", label: "My Cart", icon: "cart", route: "/my-cart" },
];

const API_BASE_URL =
  Platform.OS === "android"
    ? "http://127.0.0.1:8000"
    : "https://kayorabackend-production.up.railway.app";

function getColumnCount(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

export default function DashboardScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const columns = getColumnCount(width);

  const [searchQuery, setSearchQuery] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("products");

  // New operational hooks managing dynamic network streams
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // 1. SESSION PROTECTION GUARD AND REMEMBER ME AUTO-POLLING ENGINE
  useEffect(() => {
    let isMounted = true;

    const verifySessionAndFetchProducts = async () => {
      const storedProfile = await getUserProfile();

      // If no token is stored in persistent device memory, deny entry
      if (!storedProfile || !storedProfile.token) {
        if (isMounted) {
          router.replace("/login");
        }
        return;
      }

      if (isMounted) {
        setProfile(storedProfile);
      }

      // Automatically fetches catalog if session token is validated
      await fetchProductsFromServer(storedProfile.token, searchQuery);
    };

    verifySessionAndFetchProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. REMOTE LIVE ENDPOINT QUERY ENGINE
  const fetchProductsFromServer = async (token: string, search: string) => {
    try {
      if (search.length > 0) setIsSearching(true);

      const url = `${API_BASE_URL}/api/products?search=${encodeURIComponent(search)}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.products);
      } else if (response.status === 401) {
        // Token has expired or was revoked on the backend, clear down session
        router.replace("/login");
      }
    } catch (error) {
      console.error("Failed to query product stream:", error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  // 3. DEBOUNCED LIVE SEARCH EFFECT ENGINE
  useEffect(() => {
    if (!profile?.token) return;

    // Wait 100ms after user finishes typing before hitting the backend database
    const delayDebounceFn = setTimeout(() => {
      fetchProductsFromServer(profile.token, searchQuery);
    }, 100);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, profile?.token]);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-12);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    headerOpacity.value = withTiming(1, { duration: 380 });
    headerTranslateY.value = withTiming(0, { duration: 380, easing });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const handleThemePress = useCallback(() => {
    setMode((current: ThemeMode) => {
      if (current === "light") return "dark";
      if (current === "dark") return "system";
      return "light";
    });
  }, [setMode]);

  const handleCartPress = useCallback(() => {
    router.push("/my-cart");
  }, []);

  const handleProfilePress = useCallback(() => {
    router.push("/settings");
  }, []);

  const handleViewAllPress = useCallback(() => {
    router.push("/our-products");
  }, []);

  const handleProductPress = useCallback((id: number) => {
    router.push(("/our-products/" + id) as never);
  }, []);

  const handleTabPress = useCallback((tab: TabKey, route: string) => {
    setActiveTab(tab);
    if (route !== "/dashboard") {
      router.push(route as never);
    }
  }, []);

  const themeIconName: keyof typeof Ionicons.glyphMap = isDark
    ? "moon"
    : mode === "system"
      ? "phone-portrait-outline"
      : "sunny-outline";

  const initial =
    profile && profile.username
      ? profile.username.charAt(0).toUpperCase()
      : "?";

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.white }]}
      edges={["top"]}
    >
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.logoText, { color: colors.primaryBlue }]}>
            KAYORA
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.grayText }]}>
            Our Products
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={handleThemePress}
            style={[
              styles.iconButton,
              { backgroundColor: colors.inputBackground },
            ]}
            accessibilityLabel="Toggle theme"
            accessibilityHint={"Current theme: " + mode}
          >
            <Ionicons name={themeIconName} size={18} color={colors.darkText} />
          </Pressable>

          <Pressable
            onPress={handleCartPress}
            style={[
              styles.iconButton,
              { backgroundColor: colors.inputBackground },
            ]}
            accessibilityLabel="Open cart"
          >
            <Ionicons name="cart-outline" size={18} color={colors.darkText} />
          </Pressable>

          <Pressable
            onPress={handleProfilePress}
            style={styles.avatarButton}
            accessibilityLabel="Open settings"
          >
            {profile && profile.profileImageUri ? (
              <Animated.Image
                source={{ uri: profile.profileImageUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: colors.primaryBlue },
                ]}
              >
                <Text style={styles.avatarFallbackText}>{initial}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </Animated.View>

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
            placeholder="Search bottle size, product name..."
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.darkText }]}
            autoCorrect={false}
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={colors.primaryBlue} />
          ) : (
            searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.grayText}
                />
              </Pressable>
            )
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          key={columns}
          numColumns={columns}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={columns > 1 ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              {/* 👑 DROP THE DISTRIBUTOR BADGE RIGHT HERE */}
              {profile?.account_type === "distributor" && (
                <View
                  style={{
                    backgroundColor: "#E3F2FD",
                    borderColor: "#1E88E5",
                    borderWidth: 1,
                    padding: 8,
                    borderRadius: 10,
                    marginBottom: 10,
                    width: "100%",
                  }}
                >
                  <Text
                    style={{
                      color: "#1E88E5",
                      fontWeight: "700",
                      fontSize: 12,
                      textAlign: "center",
                    }}
                  >
                    🌟 Kayora Authorized Distributor Tier (Discounted Rates
                    Applied)
                  </Text>
                </View>
              )}

              <Text style={[styles.sectionTitle, { color: colors.darkText }]}>
                Our Products
              </Text>
              <Pressable
                onPress={handleViewAllPress}
                style={styles.viewAllButton}
              >
                <Text
                  style={[styles.viewAllText, { color: colors.primaryBlue }]}
                >
                  View All
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={colors.primaryBlue}
                />
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="water-outline"
                size={36}
                color={colors.grayText}
              />
              <Text style={[styles.emptyStateText, { color: colors.grayText }]}>
                {searchQuery
                  ? `No products match "${searchQuery}"`
                  : "No products available in database."}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ProductCard
              product={item}
              index={index}
              columns={columns}
              colors={colors}
              onPress={() => handleProductPress(item.id)}
            />
          )}
        />
      )}

      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.white, borderTopColor: colors.border },
        ]}
      >
        {TABS.map((tab) => (
          <TabBarItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            colors={colors}
            onPress={() => handleTabPress(tab.key, tab.route)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

type ThemeColors = ReturnType<typeof useTheme>["colors"];

type ProductCardProps = {
  product: Product;
  index: number;
  columns: number;
  colors: ThemeColors;
  onPress: () => void;
};

const ProductCard = React.memo(function ProductCard({
  product,
  index,
  columns,
  colors,
  onPress,
}: ProductCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const scale = useSharedValue(1);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    const delay = Math.min(index, 8) * 60;
    opacity.value = withDelay(delay, withTiming(1, { duration: 360 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 360, easing }),
    );
  }, [index]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 220 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 18, stiffness: 220 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const cardWidthStyle = columns > 1 ? { flex: 1 / columns } : undefined;

  return (
    <Animated.View style={[styles.cardOuter, cardWidthStyle, cardStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.cardImageWrapper}>
          {product.image ? (
            <Animated.Image
              source={{ uri: product.image }}
              style={styles.cardImage}
            />
          ) : (
            <LinearGradient
              colors={["#0B2545", "#0D4A8C", "#1E5FAF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardImage}
            >
              <Ionicons name="water" size={28} color="rgba(255,255,255,0.55)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.cardSize, { color: colors.goldAccent }]}>
            {product.size}
          </Text>
          <Text style={[styles.cardName, { color: colors.darkText }]}>
            {product.name}
          </Text>
          {/* 💰 DROP THE PRICE TAG RIGHT HERE */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: "800",
              color: colors.primaryBlue,
              marginVertical: 4,
            }}
          >
            ₦{(product as any).price.toLocaleString()}
          </Text>
          <Text style={[styles.cardTagline, { color: colors.goldAccent }]}>
            {product.tagline || ""}
          </Text>
          <Text
            style={[styles.cardDescription, { color: colors.grayText }]}
            numberOfLines={3}
          >
            {product.short_description || ""}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={[styles.seeDetails, { color: colors.primaryBlue }]}>
              See Details
            </Text>
            <Ionicons
              name="arrow-forward"
              size={13}
              color={colors.primaryBlue}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

type TabBarItemProps = {
  tab: TabConfig;
  isActive: boolean;
  colors: ThemeColors;
  onPress: () => void;
};

const TabBarItem = React.memo(function TabBarItem({
  tab,
  isActive,
  colors,
  onPress,
}: TabBarItemProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.12 : 1, {
      damping: 14,
      stiffness: 200,
    });
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const activeColor = colors.primaryBlue;
  const inactiveColor = colors.grayText;

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={tab.icon}
          size={22}
          color={isActive ? activeColor : inactiveColor}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? activeColor : inactiveColor },
        ]}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {},
  logoText: { fontSize: 20, fontWeight: "800", letterSpacing: 1 },
  headerSubtitle: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarButton: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  searchWrapper: { paddingHorizontal: 20, paddingBottom: 14 },
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
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  viewAllButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewAllText: { fontSize: 14, fontWeight: "700" },
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
  cardImageWrapper: { width: "100%", height: 90 },
  cardImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: 14 },
  cardSize: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardName: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  cardTagline: {
    fontSize: 12,
    fontWeight: "600",
    fontStyle: "italic",
    marginBottom: 8,
  },
  cardDescription: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 4 },
  seeDetails: { fontSize: 13, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyStateText: { fontSize: 14, textAlign: "center" },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabItem: { flex: 1, alignItems: "center", gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: "600" },
  centeredLoading: { flex: 1, justifyContent: "center", alignItems: "center" },
});
