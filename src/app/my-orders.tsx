import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { BottomTabBar } from "@/components/BottomTabBar";
import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { RiderTrackingMap } from "@/components/RiderTrackingMap";
import { getProductById } from "@/constants/products";
import { getUserProfile } from "@/services/storage";

// Replace with your local machine IP or production URL
const API_BASE_URL = "http://localhost:8000"; 

export type OrderStatus = "Pending" | "Preparing" | "Active" | "Out for Delivery" | "Completed" | "Cancelled";

export type OrderTimelineStep = {
  key: string;
  label: string;
  completedAt: string | null;
};

export type Rider = {
  id: number;
  fullName: string;
  phone: string;
  vehicleType: string;
  motorcycleRegNumber: string;
  currentLatitude: number;
  currentLongitude: number;
};

export type Order = {
  id: string;
  deliveryTiming: "asap" | "scheduled";
  deliveryDateTime: string;
  status: OrderStatus;
  paymentMethod: "cash" | "card";
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  createdAt: string;
  deliveryCompletedAt: string | null;
  deliveryAddress: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  products: Array<{
    productId: number;
    name: string;
    size: string;
    price: number;
    quantity: number;
  }>;
  timeline: OrderTimelineStep[];
  rider: Rider | null;
};

const TRACK_ORDER_STATUSES: OrderStatus[] = ["Active", "Out for Delivery"];

function canTrackOrder(status: OrderStatus): boolean {
  return TRACK_ORDER_STATUSES.includes(status);
}

type FilterTab = "all" | "active" | "past";

// Arranges and maps orders accurately based on backend database statuses
function matchesFilter(order: Order, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "active") {
    return ["Pending", "Preparing", "Active", "Out for Delivery"].includes(order.status);
  }
  return ["Completed", "Cancelled"].includes(order.status);
}

function formatNaira(amount: number): string {
  return "\u20A6" + amount.toLocaleString();
}

function formatOrderDate(value: string | number): string {
  const date = new Date(value);
  return (
    date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    ", " +
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

type ThemeColors = ReturnType<typeof useTheme>["colors"];

type StatusBadgeConfig = {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
};

function getStatusBadgeConfig(status: OrderStatus, colors: ThemeColors): StatusBadgeConfig {
  switch (status) {
    case "Pending":
      return { color: colors.goldAccent, icon: "time-outline" };
    case "Preparing":
      return { color: "#F97316", icon: "construct-outline" };
    case "Active":
    case "Out for Delivery":
      return { color: colors.primaryBlue, icon: "bicycle-outline" };
    case "Completed":
      return { color: colors.success, icon: "checkmark-circle-outline" };
    case "Cancelled":
      return { color: colors.error, icon: "close-circle-outline" };
    default:
      return { color: colors.grayText, icon: "help-circle-outline" };
  }
}

export default function MyOrdersScreen() {
  const { colors } = useTheme();
  const toastRef = useRef<AnimatedToastRef>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isLoading, setIsLoading] = useState(true);

  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);

  // Fetch all orders matching logged in profile token from Database
  const loadOrders = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setIsLoading(true);
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setOrders(data.orders || data);
      }
    } catch (err) {
      console.error("Error loading orders from database:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders(true);
  }, [loadOrders]);

  // Regular interval background updates to update real-time status shifts
  useEffect(() => {
    const interval = setInterval(() => loadOrders(false), 7000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, activeFilter)),
    [orders, activeFilter]
  );

  const handleTrackOrder = useCallback((order: Order) => {
    setTrackingOrder(order);
  }, []);

  const handleViewDetails = useCallback(async (order: Order) => {
    // Fetch individual clean database order details row
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/orders/${order.id}`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setDetailsOrder(data.order || data);
      } else {
        setDetailsOrder(order); // Fallback to local item if query fails
      }
    } catch (err) {
      setDetailsOrder(order);
    }
  }, []);

  const handleCloseTracking = useCallback(() => {
    setTrackingOrder(null);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsOrder(null);
  }, []);

  const handleOrderAgain = useCallback(async (order: Order) => {
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      // Push all past elements right back into user api cart
      const response = await fetch(`${API_BASE_URL}/api/orders/${order.id}/reorder`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        toastRef.current?.show({
          message: "Products added back to your cart.",
          type: "success",
        });
        setDetailsOrder(null);
        router.push("/my-cart");
      }
    } catch (err) {
      toastRef.current?.show({ message: "Failed to sync cart reorder request.", type: "error" });
    }
  }, []);

  const handleStartShopping = useCallback(() => {
    router.replace("/dashboard");
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.white }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>My Orders</Text>
      </View>

      <FilterToggle activeFilter={activeFilter} onChange={setActiveFilter} colors={colors} />

      {isLoading ? (
        <View style={styles.centerWrapper}>
          <Text style={{ color: colors.grayText }}>Fetching database logs...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <EmptyOrders colors={colors} filter={activeFilter} onStartShopping={handleStartShopping} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <OrderCard
              order={item}
              index={index}
              colors={colors}
              onTrackOrder={() => handleTrackOrder(item)}
              onViewDetails={() => handleViewDetails(item)}
            />
          )}
        />
      )}

      <BottomTabBar activeTab="orders" colors={colors} />

      <TrackOrderBottomSheet order={trackingOrder} colors={colors} onClose={handleCloseTracking} />

      <OrderDetailsModal
        order={detailsOrder}
        colors={colors}
        onClose={handleCloseDetails}
        onOrderAgain={handleOrderAgain}
      />

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

const FILTER_OPTIONS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "All Orders" },
  { key: "active", label: "Active" },
  { key: "past", label: "Completed" },
];

function FilterToggle({ activeFilter, onChange, colors }: { activeFilter: FilterTab; onChange: (filter: FilterTab) => void; colors: ThemeColors; }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const segmentWidth = containerWidth / FILTER_OPTIONS.length;
  const activeIndex = FILTER_OPTIONS.findIndex((option) => option.key === activeFilter);

  useEffect(() => {
    if (containerWidth === 0) return;
    indicatorX.value = withTiming(activeIndex * segmentWidth, {
      duration: 280,
      easing: ReanimatedEasing.out(ReanimatedEasing.cubic),
    });
  }, [activeIndex, segmentWidth, containerWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segmentWidth,
  }));

  return (
    <View
      style={[styles.toggleContainer, { backgroundColor: colors.inputBackground }]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <Animated.View style={[styles.toggleIndicator, { backgroundColor: colors.primaryBlue }, indicatorStyle]} />
      )}
      {FILTER_OPTIONS.map((option) => {
        const isActive = option.key === activeFilter;
        return (
          <Pressable key={option.key} onPress={() => onChange(option.key)} style={styles.toggleSegment}>
            <Text style={[styles.toggleLabel, { color: isActive ? colors.white : colors.grayText }]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MetaChip({ label, colors }: { label: string; colors: ThemeColors }) {
  return (
    <View style={[styles.metaChip, { backgroundColor: colors.inputBackground }]}>
      <Text style={[styles.metaChipText, { color: colors.grayText }]}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status, colors }: { status: OrderStatus; colors: ThemeColors }) {
  const { color, icon } = getStatusBadgeConfig(status, colors);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (status === "Active" || status === "Out for Delivery") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 700, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
          withTiming(1, { duration: 700, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulse.value = 1;
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.statusBadge, { backgroundColor: color + "1A" }, animatedStyle]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.statusBadgeText, { color }]}>{status}</Text>
    </Animated.View>
  );
}

function OrderCard({ order, index, colors, onTrackOrder, onViewDetails }: { order: Order; index: number; colors: ThemeColors; onTrackOrder: () => void; onViewDetails: () => void; }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    opacity.value = withTiming(1, { duration: 360 });
    translateY.value = withTiming(0, { duration: 360, easing });
  }, [index]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const itemCount = order.products.reduce((sum, product) => sum + product.quantity, 0);
  const showTrackButton = canTrackOrder(order.status);

  return (
    <Animated.View style={[styles.orderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, cardStyle]}>
      <View style={styles.orderCardHeader}>
        <Text style={[styles.orderId, { color: colors.darkText }]} numberOfLines={1}>
          Order #{order.id.toString().toUpperCase()}
        </Text>
        <StatusBadge status={order.status} colors={colors} />
      </View>

      <Text style={[styles.orderDate, { color: colors.grayText }]}>Ordered on {formatOrderDate(order.createdAt)}</Text>
      <Text style={[styles.orderAddress, { color: colors.grayText }]} numberOfLines={1}>
        {order.deliveryAddress?.label} - {order.deliveryAddress?.address}
      </Text>

      <View style={styles.orderMetaRow}>
        <MetaChip label={itemCount + (itemCount === 1 ? " item" : " items")} colors={colors} />
        <MetaChip label={order.paymentMethod === "cash" ? "Cash" : "Card"} colors={colors} />
        <Text style={[styles.orderTotal, { color: colors.darkText }]}>{formatNaira(order.total)}</Text>
      </View>

      <View style={styles.orderButtonsRow}>
        {showTrackButton && (
          <Pressable onPress={onTrackOrder} style={[styles.trackButton, { backgroundColor: colors.primaryBlue }]}>
            <Ionicons name="navigate" size={15} color="#FFFFFF" />
            <Text style={styles.trackButtonText}>Track Order</Text>
          </Pressable>
        )}
        <Pressable
          onPress={onViewDetails}
          style={[styles.detailsButton, { borderColor: colors.border }, !showTrackButton && styles.detailsButtonFull]}
        >
          <Text style={[styles.detailsButtonText, { color: colors.darkText }]}>View Details</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function TrackOrderBottomSheet({ order, colors, onClose }: { order: Order | null; colors: ThemeColors; onClose: () => void; }) {
  const translateY = useSharedValue(600);
  const [liveOrder, setLiveOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (order) {
      setLiveOrder(order);
      translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    } else {
      translateY.value = withTiming(600, { duration: 240 });
    }
  }, [order]);

  // Real-time backend tracker loop while modal tracking view stays open
  useEffect(() => {
    if (!order) return;
    
    const fetchLiveTrack = async () => {
      try {
        const authProfile = await getUserProfile();
        const token = authProfile?.token || "";

        const response = await fetch(`${API_BASE_URL}/api/orders/${order.id}/track`, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok && data.order) {
          setLiveOrder(data.order);
        }
      } catch (err) {
        console.error("Tracking connection issue:", err);
      }
    };

    fetchLiveTrack();
    const interval = setInterval(fetchLiveTrack, 4000);
    return () => clearInterval(interval);
  }, [order]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!order || !liveOrder) return null;

  const rider = liveOrder.rider;
  const etaMinutes = estimateEtaMinutes(liveOrder);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.sheetOverlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <Animated.View style={[styles.bottomSheet, { backgroundColor: colors.white }, sheetStyle]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeaderRow}>
            <Text style={[styles.sheetTitle, { color: colors.darkText }]}>Track Order</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.darkText} />
            </Pressable>
          </View>

          <View style={styles.mapWrapper}>
            {rider ? (
              <RiderTrackingMap
                customerLatitude={Number(liveOrder.deliveryAddress.latitude)}
                customerLongitude={Number(liveOrder.deliveryAddress.longitude)}
                riderLatitude={Number(rider.currentLatitude)}
                riderLongitude={Number(rider.currentLongitude)}
                destinationLatitude={Number(liveOrder.deliveryAddress.latitude)}
                destinationLongitude={Number(liveOrder.deliveryAddress.longitude)}
              />
            ) : (
              <View style={[styles.mapPlaceholder, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.mapPlaceholderText, { color: colors.grayText }]}>
                  Waiting for rider assignment...
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.etaCard, { backgroundColor: colors.lightBlue }]}>
            <Text style={[styles.etaLabel, { color: colors.primaryBlue }]}>Estimated Arrival</Text>
            <Text style={[styles.etaValue, { color: colors.primaryBlue }]}>{etaMinutes} Minutes</Text>
          </View>

          {rider && <RiderCard rider={rider} status={liveOrder.status} colors={colors} />}
        </Animated.View>
      </View>
    </Modal>
  );
}

function estimateEtaMinutes(order: Order): number {
  if (!order.rider) return 0;
  const dLat = Number(order.deliveryAddress.latitude) - Number(order.rider.currentLatitude);
  const dLng = Number(order.deliveryAddress.longitude) - Number(order.rider.currentLongitude);
  const distance = Math.sqrt(dLat * dLat + dLng * dLng);
  const minutes = Math.max(1, Math.round(distance * 800));
  return Math.min(minutes, 45);
}

function RiderCard({ rider, status, colors }: { rider: Rider; status: OrderStatus; colors: ThemeColors }) {
  return (
    <View style={[styles.riderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.riderCardTop}>
        <View style={[styles.riderAvatar, { backgroundColor: colors.primaryBlue }]}>
          <Text style={styles.riderAvatarText}>{rider.fullName.charAt(0)}</Text>
        </View>
        <View style={styles.riderInfoColumn}>
          <Text style={[styles.riderName, { color: colors.darkText }]}>{rider.fullName}</Text>
          <Text style={[styles.riderDetail, { color: colors.grayText }]}>{rider.phone}</Text>
          <Text style={[styles.riderDetail, { color: colors.grayText }]}>
            {rider.vehicleType} - {rider.motorcycleRegNumber}
          </Text>
        </View>
      </View>

      <Text style={[styles.riderStatusLine, { color: colors.primaryBlue }]}>Current status: {status}</Text>
    </View>
  );
}

function OrderDetailsModal({ order, colors, onClose, onOrderAgain }: { order: Order | null; colors: ThemeColors; onClose: () => void; onOrderAgain: (order: Order) => void; }) {
  if (!order) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.detailsRoot, { backgroundColor: colors.white }]} edges={["top", "bottom"]}>
        <View style={styles.detailsHeader}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.darkText} />
          </Pressable>
          <Text style={[styles.detailsHeaderTitle, { color: colors.darkText }]}>Order Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailsScrollContent}>
          <Text style={[styles.detailsOrderId, { color: colors.darkText }]}>
            #{order.id.toString().toUpperCase()}
          </Text>
          <View style={styles.detailsBadgeRow}>
            <StatusBadge status={order.status} colors={colors} />
          </View>

          <DetailsSection title="Order Information" colors={colors}>
            <DetailsRow label="Timing Configuration" value={order.deliveryTiming === "asap" ? "ASAP (Instant Mode)" : "Scheduled Reservation"} colors={colors} />
            <DetailsRow label="Payment Method" value={order.paymentMethod === "cash" ? "Cash on Delivery" : "Card Payment"} colors={colors} />
            <DetailsRow label="Delivery Address" value={order.deliveryAddress?.address} colors={colors} />
            <DetailsRow label="Delivery Date" value={new Date(order.deliveryDateTime).toLocaleDateString()} colors={colors} />
            <DetailsRow label="Delivery Time" value={new Date(order.deliveryDateTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} colors={colors} />
            <DetailsRow label="Order Created" value={formatOrderDate(order.createdAt)} colors={colors} />
          </DetailsSection>

          <DetailsSection title="Order Timeline" colors={colors}>
            <OrderTimelineView timeline={order.timeline || []} colors={colors} />
          </DetailsSection>

          <DetailsSection title="Products Ordered" colors={colors}>
            {order.products?.map((product, index) => (
              <ProductLineItem key={`${product.name}-${index}`} product={product} colors={colors} />
            ))}
          </DetailsSection>

          <DetailsSection title="Rider Information" colors={colors}>
            {order.rider ? (
              <RiderSummaryRow rider={order.rider} order={order} colors={colors} />
            ) : (
              <UnassignedRiderPlaceholder colors={colors} />
            )}
          </DetailsSection>

          <DetailsSection title="Payment Summary" colors={colors}>
            <DetailsRow label="Subtotal" value={formatNaira(Number(order.subtotal))} colors={colors} />
            <DetailsRow label="Delivery Fee" value={formatNaira(Number(order.deliveryFee))} colors={colors} />
            <DetailsRow label="Discount" value={"-" + formatNaira(Number(order.discount))} colors={colors} />
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <DetailsRow label="Grand Total" value={formatNaira(Number(order.total))} colors={colors} isTotal />
          </DetailsSection>

          <Pressable onPress={() => onOrderAgain(order)} style={[styles.orderAgainButton, { backgroundColor: colors.primaryBlue }]}>
            <Ionicons name="repeat" size={18} color="#FFFFFF" />
            <Text style={styles.orderAgainText}>Order Again</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function DetailsSection({ title, colors, children }: { title: string; colors: ThemeColors; children: React.ReactNode }) {
  return (
    <View style={[styles.detailsSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.detailsSectionTitle, { color: colors.darkText }]}>{title}</Text>
      {children}
    </View>
  );
}

function DetailsRow({ label, value, colors, isTotal }: { label: string; value: string; colors: ThemeColors; isTotal?: boolean; }) {
  return (
    <View style={styles.detailsRow}>
      <Text style={[styles.detailsRowLabel, { color: colors.grayText }, isTotal && styles.detailsRowLabelTotal, isTotal && { color: colors.darkText }]}>
        {label}
      </Text>
      <Text style={[styles.detailsRowValue, { color: isTotal ? colors.primaryBlue : colors.darkText }, isTotal && styles.detailsRowValueTotal]}>
        {value}
      </Text>
    </View>
  );
}

function ProductLineItem({ product, colors }: { product: Order["products"][number]; colors: ThemeColors }) {
  const catalogProduct = getProductById(product.productId);
  const lineSubtotal = product.price * product.quantity;

  return (
    <View style={styles.productLine}>
      <View style={styles.productLineImageWrapper}>
        {catalogProduct?.image ? (
          <Animated.Image source={{ uri: catalogProduct.image }} style={styles.productLineImage} />
        ) : (
          <LinearGradient
            colors={["#0B2545", "#0D4A8C", "#1E5FAF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.productLineImage}
          >
            <Ionicons name="water" size={20} color="rgba(255,255,255,0.55)" />
          </LinearGradient>
        )}
      </View>
      <View style={styles.productLineBody}>
        <Text style={[styles.productLineName, { color: colors.darkText }]}>{product.name}</Text>
        <Text style={[styles.productLineMeta, { color: colors.grayText }]}>
          {product.size} - Quantity: {product.quantity}
        </Text>
        <Text style={[styles.productLineMeta, { color: colors.grayText }]}>{formatNaira(product.price)} each</Text>
      </View>
      <Text style={[styles.productLineSubtotal, { color: colors.darkText }]}>{formatNaira(lineSubtotal)}</Text>
    </View>
  );
}

function RiderSummaryRow({ rider, order, colors }: { rider: Rider; order: Order; colors: ThemeColors }) {
  return (
    <View style={styles.riderSummaryRow}>
      <View style={[styles.riderAvatar, { backgroundColor: colors.primaryBlue }]}>
        <Text style={styles.riderAvatarText}>{rider.fullName.charAt(0)}</Text>
      </View>
      <View style={styles.riderInfoColumn}>
        <Text style={[styles.riderName, { color: colors.darkText }]}>{rider.fullName}</Text>
        <Text style={[styles.riderDetail, { color: colors.grayText }]}>{rider.phone}</Text>
        <Text style={[styles.riderDetail, { color: colors.grayText }]}>
          {rider.vehicleType} - {rider.motorcycleRegNumber}
        </Text>
        {order.deliveryCompletedAt && (
          <Text style={[styles.riderDetail, { color: colors.grayText }]}>
            Delivered at{" "}
            {new Date(order.deliveryCompletedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </Text>
        )}
      </View>
    </View>
  );
}

function UnassignedRiderPlaceholder({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.unassignedPlaceholder}>
      <Ionicons name="time-outline" size={32} color={colors.grayText} />
      <Text style={[styles.unassignedText, { color: colors.grayText }]}>Rider assignment processing...</Text>
    </View>
  );
}

function OrderTimelineView({ timeline, colors }: { timeline: OrderTimelineStep[]; colors: ThemeColors }) {
  const currentStepIndex = timeline.findIndex((step) => !step.completedAt);

  return (
    <View>
      {timeline.map((step, index) => (
        <TimelineRow
          key={step.key}
          step={step}
          isCompleted={Boolean(step.completedAt)}
          isCurrent={index === currentStepIndex}
          isLast={index === timeline.length - 1}
          colors={colors}
        />
      ))}
    </View>
  );
}

function TimelineRow({ step, isCompleted, isCurrent, isLast, colors }: { step: OrderTimelineStep; isCompleted: boolean; isCurrent: boolean; isLast: boolean; colors: ThemeColors; }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isCurrent) {
      pulse.value = withRepeat(
        withSequence(withTiming(1.25, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        false
      );
    } else {
      pulse.value = 1;
    }
  }, [isCurrent]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const dotColor = isCompleted ? colors.primaryBlue : isCurrent ? colors.primaryBlue : colors.border;
  const textColor = isCompleted || isCurrent ? colors.darkText : colors.grayText;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineDotColumn}>
        <Animated.View style={[styles.timelineDot, { backgroundColor: dotColor }, dotStyle]}>
          {isCompleted && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
        </Animated.View>
        {!isLast && (
          <View style={[styles.timelineConnector, { backgroundColor: isCompleted ? colors.primaryBlue : colors.border }]} />
        )}
      </View>
      <View style={styles.timelineTextColumn}>
        <Text style={[styles.timelineLabel, { color: textColor }, (isCompleted || isCurrent) && styles.timelineLabelActive]}>
          {step.label}
        </Text>
        {step.completedAt && (
          <Text style={[styles.timelineTimestamp, { color: colors.grayText }]}>
            {new Date(step.completedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </Text>
        )}
      </View>
    </View>
  );
}

function EmptyOrders({ colors, filter, onStartShopping }: { colors: ThemeColors; filter: FilterTab; onStartShopping: () => void; }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420 });
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const message =
    filter === "active"
      ? "No active premium orders tracking right now."
      : filter === "past"
      ? "No past completed orders found."
      : "You haven't placed any hydration orders yet.";

  return (
    <Animated.View style={[styles.emptyContainer, animatedStyle]}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="receipt-outline" size={36} color={colors.grayText} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.darkText }]}>{message}</Text>
      {filter === "all" && (
        <Pressable onPress={onStartShopping} style={[styles.emptyButton, { backgroundColor: colors.primaryBlue }]}>
          <Text style={styles.emptyButtonText}>Start Shopping</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerWrapper: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  toggleContainer: { flexDirection: "row", marginHorizontal: 20, marginBottom: 14, borderRadius: 14, padding: 4, position: "relative", overflow: "hidden" },
  toggleIndicator: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: 11 },
  toggleSegment: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  toggleLabel: { fontSize: 12, fontWeight: "700" },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  orderCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  orderCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  orderId: { fontSize: 15, fontWeight: "800", flexShrink: 1, marginRight: 8 },
  orderDate: { fontSize: 12, marginBottom: 2 },
  orderAddress: { fontSize: 12, marginBottom: 10 },
  orderMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  metaChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaChipText: { fontSize: 11, fontWeight: "600" },
  orderTotal: { fontSize: 14, fontWeight: "800", marginLeft: "auto" },
  orderButtonsRow: { flexDirection: "row", gap: 10 },
  trackButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12 },
  trackButtonText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  detailsButton: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  detailsButtonFull: { flex: 1 },
  detailsButtonText: { fontSize: 13, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFill },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, maxHeight: "88%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)", alignSelf: "center", marginBottom: 12 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: "800" },
  mapWrapper: { width: "100%", height: 220, borderRadius: 16, overflow: "hidden", marginBottom: 14 },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapPlaceholderText: { fontSize: 13 },
  etaCard: { borderRadius: 14, padding: 14, alignItems: "center", marginBottom: 14 },
  etaLabel: { fontSize: 12, fontWeight: "700", marginBottom: 2 },
  etaValue: { fontSize: 22, fontWeight: "800" },
  riderCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  riderCardTop: { flexDirection: "row", marginBottom: 10 },
  riderAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginRight: 12 },
  riderAvatarText: { fontSize: 20, fontWeight: "800", color: "#FFFFFF" },
  riderInfoColumn: { flex: 1, justifyContent: "center" },
  riderName: { fontSize: 15, fontWeight: "800", marginBottom: 2 },
  riderDetail: { fontSize: 12, marginBottom: 1 },
  riderStatusLine: { fontSize: 12, fontWeight: "700", marginBottom: 12 },
  detailsRoot: { flex: 1 },
  detailsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  detailsHeaderTitle: { fontSize: 16, fontWeight: "800" },
  detailsScrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  detailsOrderId: { fontSize: 26, fontWeight: "800", marginBottom: 8 },
  detailsBadgeRow: { marginBottom: 18 },
  detailsSection: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  detailsSectionTitle: { fontSize: 14, fontWeight: "800", marginBottom: 12 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  detailsRowLabel: { fontSize: 13, flexShrink: 1, marginRight: 8 },
  detailsRowLabelTotal: { fontSize: 15, fontWeight: "800" },
  detailsRowValue: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  detailsRowValueTotal: { fontSize: 16, fontWeight: "800" },
  summaryDivider: { height: 1, marginVertical: 6 },
  productLine: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  productLineImageWrapper: { width: 52, height: 52, borderRadius: 10, overflow: "hidden", marginRight: 12 },
  productLineImage: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  productLineBody: { flex: 1 },
  productLineName: { fontSize: 14, fontWeight: "700" },
  productLineMeta: { fontSize: 11, marginTop: 1 },
  productLineSubtotal: { fontSize: 13, fontWeight: "800" },
  riderSummaryRow: { flexDirection: "row" },
  unassignedPlaceholder: { alignItems: "center", paddingVertical: 16, gap: 8 },
  unassignedText: { fontSize: 13, textAlign: "center" },
  timelineRow: { flexDirection: "row" },
  timelineDotColumn: { alignItems: "center", marginRight: 12 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timelineConnector: { width: 2, flex: 1, minHeight: 24 },
  timelineTextColumn: { flex: 1, paddingBottom: 16 },
  timelineLabel: { fontSize: 13, fontWeight: "600" },
  timelineLabelActive: { fontWeight: "800" },
  timelineTimestamp: { fontSize: 11, marginTop: 2 },
  orderAgainButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 56, borderRadius: 28, marginTop: 4 },
  orderAgainText: { fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 15, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  emptyButton: { paddingHorizontal: 28, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  emptyButtonText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
});