import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withSequence,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { BottomTabBar } from "@/components/BottomTabBar";
import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { PRODUCTS, Product, getProductById } from "@/constants/products";
import { SavedAddress } from "@/types/location";
import {
  getUserProfile,
} from "@/services/storage";

const API_BASE_URL = "http://localhost:8000"; 

// ─── LOCAL TYPES REPLACING THE BROKEN STORAGE IMPORTS ───
export type CartItem = {
  productId: number;
  quantity: number;
};

export type PaymentMethod = "cash" | "card";

export type NearbyDriver = {
  id: number;
  fullName: string;
  vehicle: string;
  plateNumber?: string;
  distanceKm: number;
  etaMinutes: number;
};

export type OrderTimeline = {
  key: string;
  label: string;
  completedAt: string | null;
};

export type Order = {
  id: string;
  customer: {
    username: string;
    email: string;
    phone: string;
  };
  products: Array<{
    productId: number;
    name: string;
    size: string;
    price: number;
    quantity: number;
  }>;
  deliveryAddress: {
    label: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryTiming: "asap" | "scheduled";
  deliveryDateTime: string;
  deliveryCompletedAt: string | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
  status: string;
  rider: any | null;
  timeline: OrderTimeline[];
  createdAt: number;
};

const DELIVERY_FEE = 500;
const SERVICE_FEE = 100;
const DISCOUNT = 0;

// ─── BUSINESS HOURS: drivers work 7:00 AM – 5:00 PM ───
// TEMPORARY TESTING SWITCH: set to false to bypass the off-duty check
// while testing the new driver-selection feature. Set back to true
// before shipping — this is the ONLY line that needs to change.
const BUSINESS_HOURS_ENFORCED = true;

const BUSINESS_HOURS_START = 7;  // 7:00 AM
const BUSINESS_HOURS_END = 17;   // 5:00 PM (24hr clock)

function isWithinBusinessHours(date: Date): boolean {
  if (!BUSINESS_HOURS_ENFORCED) return true;
  const hour = date.getHours();
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

function formatBusinessHoursLabel(): string {
  return "7:00 AM – 5:00 PM";
}

type CartLine = {
  product: Product;
  quantity: number;
};

type DeliveryTimingOption = "asap" | "scheduled";

function formatNaira(amount: number): string {
  return "\u20A6" + amount.toLocaleString();
}

function formatDateTime(date: Date): string {
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return dateLabel + ", " + timeLabel;
}

// ─── SKELETON LOADER FOR BACKEND SYNC STATES ───
function CartSkeleton({ colors }: { colors: any }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withTiming(0.8, { duration: 800 }, () => {
      opacity.value = withTiming(0.4, { duration: 800 });
    });
    
    const interval = setInterval(() => {
      opacity.value = withTiming(0.8, { duration: 800 }, () => {
        opacity.value = withTiming(0.4, { duration: 800 });
      });
    }, 1600);

    return () => clearInterval(interval);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.section}>
      {[1, 2].map((key) => (
        <Animated.View
          key={key}
          style={[
            styles.cartLineCard,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
            animatedStyle,
          ]}
        >
          <View style={[styles.cartLineImageWrapper, { backgroundColor: colors.border }]} />
          <View style={styles.cartLineBody}>
            <View style={{ backgroundColor: colors.border, width: 40, height: 10, borderRadius: 4, marginBottom: 6 }} />
            <View style={{ backgroundColor: colors.border, width: "70%", height: 16, borderRadius: 4, marginBottom: 6 }} />
            <View style={{ backgroundColor: colors.border, width: "45%", height: 12, borderRadius: 4, marginBottom: 12 }} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ backgroundColor: colors.border, width: 70, height: 26, borderRadius: 14 }} />
              <View style={{ backgroundColor: colors.border, width: 60, height: 16, borderRadius: 4 }} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

export default function MyCartScreen() {
  const { colors } = useTheme();
  const toastRef = useRef<AnimatedToastRef>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [deliveryTiming, setDeliveryTiming] = useState<DeliveryTimingOption>("asap");
  const [scheduledDate, setScheduledDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 30, 0, 0);
    return tomorrow;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Product | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showOffDutyModal, setShowOffDutyModal] = useState(false);

  // ─── ASAP DRIVER SELECTION (customer picks the driver directly,
  // instead of the order being broadcast to every online driver) ───
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      const [cartRes, addressRes, profileRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/cart`, {
          headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/saved-addresses`, {
          headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/user-profile`, {
          headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` },
        }),
      ]);

      const cartJson = await cartRes.json().catch(() => ({ cart: [] }));
      const addressJson = await addressRes.json().catch(() => []);
      const profileJson = await profileRes.json().catch(() => null);

      setCartItems(cartJson.cart || []);
      setAddresses(addressJson.addresses || addressJson || []);
      setProfile(profileJson?.user || profileJson || authProfile);
    } catch (err) {
      console.error("Backend Cart loading sync failure:", err);
      toastRef.current?.show({ message: "Unable to sync with database inventory.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cartLines = useMemo<CartLine[]>(() => {
    return cartItems
      .map((item) => {
        const product = getProductById(item.productId);
        return product ? { product, quantity: item.quantity } : null;
      })
      .filter((line): line is CartLine => line !== null);
  }, [cartItems]);

  const subtotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [cartLines]
  );

  const total = useMemo(
    () => subtotal + (cartLines.length > 0 ? DELIVERY_FEE + SERVICE_FEE - DISCOUNT : 0),
    [subtotal, cartLines.length]
  );

  const handleIncrement = useCallback(async (productId: number, currentQuantity: number) => {
    try {
      const userProfile = await getUserProfile();
      const token = userProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId, quantity: currentQuantity + 1 })
      });

      const json = await response.json();
      if (response.ok) {
        setCartItems(json.cart || []);
      }
    } catch (err) {
      console.error("Failed to increment quantity:", err);
    }
  }, []);

  const handleDecrement = useCallback(async (product: Product, currentQuantity: number) => {
    if (currentQuantity <= 1) {
      setRemoveTarget(product);
      return;
    }
    try {
      const userProfile = await getUserProfile();
      const token = userProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/cart/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: product.id, quantity: currentQuantity - 1 })
      });

      const json = await response.json();
      if (response.ok) {
        setCartItems(json.cart || []);
      }
    } catch (err) {
      console.error("Failed to decrement quantity:", err);
    }
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!removeTarget) return;
    try {
      const userProfile = await getUserProfile();
      const token = userProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/cart/remove/${removeTarget.id}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });

      const json = await response.json();
      if (response.ok) {
        setCartItems(json.cart || []);
        setRemoveTarget(null);
      }
    } catch (err) {
      console.error("Failed to remove item from cart:", err);
    }
  }, [removeTarget]);

  const handleCancelRemove = useCallback(() => {
    setRemoveTarget(null);
  }, []);

  const loadNearbyDrivers = useCallback(async (latitude: number, longitude: number) => {
    setIsLoadingDrivers(true);
    setSelectedDriverId(null);
    try {
      const userProfile = await getUserProfile();
      const token = userProfile?.token || "";

      const response = await fetch(
        `${API_BASE_URL}/api/drivers/nearby?latitude=${latitude}&longitude=${longitude}`,
        {
          headers: { "Accept": "application/json", "Authorization": `Bearer ${token}` },
        }
      );
      const json = await response.json();
      if (response.ok) {
        setNearbyDrivers(json.drivers || []);
      } else {
        setNearbyDrivers([]);
      }
    } catch (err) {
      console.error("Failed to load nearby drivers:", err);
      setNearbyDrivers([]);
    } finally {
      setIsLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    if (deliveryTiming !== "asap") {
      return;
    }
    const address = addresses.find((a) => a.id === selectedAddressId);
    if (address) {
      loadNearbyDrivers(address.latitude, address.longitude);
    } else {
      setNearbyDrivers([]);
      setSelectedDriverId(null);
    }
  }, [deliveryTiming, selectedAddressId, addresses, loadNearbyDrivers]);

  const handleSelectTiming = useCallback((timing: DeliveryTimingOption) => {
    setDeliveryTiming(timing);
    if (timing === "scheduled") {
      setNearbyDrivers([]);
      setSelectedDriverId(null);
    }
  }, []);

  const handleTrashPress = useCallback((product: Product) => {
    setRemoveTarget(product);
  }, []);

  const handleDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (event.type === "dismissed" || !date) return;
    setScheduledDate((current) => {
      const updated = new Date(current);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      return updated;
    });
  }, []);

  const handleTimeChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (event.type === "dismissed" || !date) return;
    setScheduledDate((current) => {
      const updated = new Date(current);
      updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
      return updated;
    });
  }, []);

  const validateOrder = useCallback((): string | null => {
    if (cartLines.length === 0) {
      return "Your cart is empty.";
    }
    if (!selectedAddressId) {
      return "Please choose a delivery address.";
    }
    if (!paymentMethod) {
      return "Please choose a payment method.";
    }
    if (paymentMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) {
        return "Enter a valid 16-digit card number.";
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        return "Enter a valid expiry date (MM/YY).";
      }
      if (cardCvv.length < 3) {
        return "Enter a valid CVV.";
      }
      if (!cardHolder.trim()) {
        return "Enter the card holder's name.";
      }
    }
    if (deliveryTiming === "asap" && !selectedDriverId) {
      return "Please select a driver for your ASAP delivery.";
    }
    return null;
  }, [cartLines.length, selectedAddressId, paymentMethod, cardNumber, cardExpiry, cardCvv, cardHolder, deliveryTiming, selectedDriverId]);

  const handlePlaceOrder = useCallback(async () => {
    // ─── BUSINESS HOURS CHECK ───
    // ASAP orders are checked against the current time. Scheduled orders
    // are checked against the time the customer picked, since drivers
    // won't be available to fulfill a delivery scheduled for, say, 9 PM.
    const timeToCheck = deliveryTiming === "asap" ? new Date() : scheduledDate;
    if (!isWithinBusinessHours(timeToCheck)) {
      setShowOffDutyModal(true);
      return;
    }

    const validationError = validateOrder();
    if (validationError) {
      toastRef.current?.show({ message: validationError, type: "error" });
      return;
    }

    const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
    if (!selectedAddress || !paymentMethod) return;

    setIsPlacingOrder(true);
    try {
      const now = new Date().toISOString();

      const orderPayload = {
        addressId: selectedAddressId,
        paymentMethod: paymentMethod,
        deliveryTiming: deliveryTiming,
        deliveryDateTime: (deliveryTiming === "asap" ? new Date() : scheduledDate).toISOString(),
        driverId: deliveryTiming === "asap" ? selectedDriverId : null,
        cartItems: cartLines.map(line => ({
          productId: line.product.id,
          quantity: line.quantity,
          price: line.product.price
        })),
        subtotal: subtotal,
        deliveryFee: DELIVERY_FEE,
        serviceFee: SERVICE_FEE,
        total: total,
      };

      const userProfile = await getUserProfile();
      const token = userProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/orders/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setLastOrder(result.order);
        setCartItems([]);
        setShowSuccessModal(true);
      } else {
        toastRef.current?.show({ 
          message: result.message || "Failed to submit order to database.", 
          type: "error" 
        });
      }
    } catch (err) {
      console.error("Order submit error:", err);
      toastRef.current?.show({ message: "Network error saving order details.", type: "error" });
    } finally {
      setIsPlacingOrder(false);
    }
  }, [validateOrder, addresses, selectedAddressId, paymentMethod, cartLines, deliveryTiming, scheduledDate, subtotal, total, selectedDriverId]);

  const handleContinueShopping = useCallback(() => {
    setShowSuccessModal(false);
    router.replace("/dashboard");
  }, []);

  const handleViewOrders = useCallback(() => {
    setShowSuccessModal(false);
    router.push("/my-orders");
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleAddAddress = useCallback(() => {
    router.push("/routeSetup");
  }, []);

  const handleStartShopping = useCallback(() => {
    router.replace("/dashboard");
  }, []);

  const cartCount = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.quantity, 0),
    [cartLines]
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.white }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} accessibilityLabel="Back to dashboard">
          <Ionicons name="chevron-back" size={22} color={colors.darkText} />
          <Text style={[styles.backLabel, { color: colors.darkText }]}>Back</Text>
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.darkText }]}>My Cart</Text>

        <View style={styles.cartIconWrapper}>
          <Ionicons name="cart-outline" size={20} color={colors.darkText} />
          {cartCount > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.goldAccent }]}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? "99+" : cartCount}</Text>
            </View>
          )}
        </View>
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <CartSkeleton colors={colors} />
        </ScrollView>
      ) : cartLines.length === 0 ? (
        <EmptyCart colors={colors} onStartShopping={handleStartShopping} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            {cartLines.map((line, index) => (
              <CartLineCard
                key={line.product.id}
                line={line}
                index={index}
                colors={colors}
                onIncrement={() => handleIncrement(line.product.id, line.quantity)}
                onDecrement={() => handleDecrement(line.product, line.quantity)}
                onTrashPress={() => handleTrashPress(line.product)}
              />
            ))}
          </View>

          <OrderSummaryCard
            colors={colors}
            subtotal={subtotal}
            deliveryFee={cartLines.length > 0 ? DELIVERY_FEE : 0}
            serviceFee={cartLines.length > 0 ? SERVICE_FEE : 0}
            discount={DISCOUNT}
            total={total}
          />

          <DeliveryTimingCard
            colors={colors}
            timing={deliveryTiming}
            onSelectTiming={handleSelectTiming}
            scheduledDate={scheduledDate}
            onPressDate={() => setShowDatePicker(true)}
            onPressTime={() => setShowTimePicker(true)}
          />

          <DeliveryAddressCard
            colors={colors}
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            onSelectAddress={setSelectedAddressId}
            onAddAddress={handleAddAddress}
          />

          {deliveryTiming === "asap" && selectedAddressId && (
            <DriverSelectionCard
              colors={colors}
              drivers={nearbyDrivers}
              selectedDriverId={selectedDriverId}
              onSelectDriver={setSelectedDriverId}
              isLoading={isLoadingDrivers}
            />
          )}

          <PaymentMethodCard
            colors={colors}
            paymentMethod={paymentMethod}
            onSelectPaymentMethod={setPaymentMethod}
            cardNumber={cardNumber}
            onChangeCardNumber={setCardNumber}
            cardExpiry={cardExpiry}
            onChangeCardExpiry={setCardExpiry}
            cardCvv={cardCvv}
            onChangeCardCvv={setCardCvv}
            cardHolder={cardHolder}
            onChangeCardHolder={setCardHolder}
          />

          <PlaceOrderButton colors={colors} loading={isPlacingOrder} onPress={handlePlaceOrder} />
        </ScrollView>
      )}

      <BottomTabBar activeTab="cart" colors={colors} />

      {Platform.OS !== "web" && showDatePicker && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
      {Platform.OS !== "web" && showTimePicker && (
        <DateTimePicker value={scheduledDate} mode="time" onChange={handleTimeChange} />
      )}

      {Platform.OS === "web" && (
        <WebDateTimeFallback
          visible={showDatePicker || showTimePicker}
          mode={showDatePicker ? "date" : "time"}
          colors={colors}
          initialDate={scheduledDate}
          onClose={() => {
            setShowDatePicker(false);
            setShowTimePicker(false);
          }}
          onConfirm={(date: React.SetStateAction<Date>) => {
            setScheduledDate(date);
            setShowDatePicker(false);
            setShowTimePicker(false);
          }}
        />
      )}

      <OffDutyModal
        visible={showOffDutyModal}
        colors={colors}
        onClose={() => setShowOffDutyModal(false)}
      />

      <RemoveConfirmationModal
        product={removeTarget}
        colors={colors}
        onCancel={handleCancelRemove}
        onConfirm={handleConfirmRemove}
      />

      <SuccessModal
        visible={showSuccessModal}
        colors={colors}
        onContinueShopping={handleContinueShopping}
        onViewOrders={handleViewOrders}
      />

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

type ThemeColors = ReturnType<typeof useTheme>["colors"];

type CartLineCardProps = {
  line: CartLine;
  index: number;
  colors: ThemeColors;
  onIncrement: () => void;
  onDecrement: () => void;
  onTrashPress: () => void;
};

const CartLineCard = React.memo(function CartLineCard({
  line,
  index,
  colors,
  onIncrement,
  onDecrement,
  onTrashPress,
}: CartLineCardProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);
  const quantityScale = useSharedValue(1);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    opacity.value = withTiming(1, { duration: 360 });
    translateY.value = withTiming(0, { duration: 360, easing });
  }, []);

  useEffect(() => {
    quantityScale.value = withSequence(
      withTiming(1.18, { duration: 100 }),
      withTiming(1, { duration: 140 })
    );
  }, [line.quantity, quantityScale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  const quantityStyle = useAnimatedStyle(() => ({
    transform: [{ scale: quantityScale.value }],
  }));
  const lineSubtotal = line.product.price * line.quantity;

  return (
    <Animated.View
      style={[styles.cartLineCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, cardStyle]}
    >
      <View style={styles.cartLineImageWrapper}>
        {line.product.image ? (
          <Animated.Image source={{ uri: line.product.image }} style={styles.cartLineImage} />
        ) : (
          <LinearGradient
            colors={["#0B2545", "#0D4A8C", "#1E5FAF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cartLineImage}
          >
            <Ionicons name="water" size={22} color="rgba(255,255,255,0.55)" />
          </LinearGradient>
        )}
      </View>

      <View style={styles.cartLineBody}>
        <View style={styles.cartLineTitleRow}>
          <View style={styles.cartLineTitleColumn}>
            <Text style={[styles.cartLineSize, { color: colors.goldAccent }]}>{line.product.size}</Text>
            <Text style={[styles.cartLineName, { color: colors.darkText }]} numberOfLines={1}>
              {line.product.name}
            </Text>
            <Text style={[styles.cartLineTagline, { color: colors.grayText }]} numberOfLines={1}>
              {line.product.tagline}
            </Text>
          </View>

          <Pressable onPress={onTrashPress} hitSlop={8} accessibilityLabel={"Remove " + line.product.name}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </Pressable>
        </View>

        <View style={styles.cartLineFooterRow}>
          <View style={styles.quantityStepper}>
            <Pressable
              onPress={onDecrement}
              style={[styles.stepperButton, { borderColor: colors.border }]}
              accessibilityLabel="Decrease quantity"
            >
              <Ionicons name="remove" size={16} color={colors.darkText} />
            </Pressable>

            <Animated.Text style={[styles.stepperValue, { color: colors.darkText }, quantityStyle]}>
              {line.quantity}
            </Animated.Text>

            <Pressable
              onPress={onIncrement}
              style={[styles.stepperButton, { borderColor: colors.border }]}
              accessibilityLabel="Increase quantity"
            >
              <Ionicons name="add" size={16} color={colors.darkText} />
            </Pressable>
          </View>

          <Text style={[styles.cartLineSubtotal, { color: colors.darkText }]}>
            {formatNaira(lineSubtotal)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

type OrderSummaryCardProps = {
  colors: ThemeColors;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  discount: number;
  total: number;
};

function OrderSummaryCard({ colors, subtotal, deliveryFee, serviceFee, discount, total }: OrderSummaryCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.cardSectionTitle, { color: colors.darkText }]}>Order Summary</Text>

      <SummaryRow label="Subtotal" value={formatNaira(subtotal)} colors={colors} />
      <SummaryRow label="Delivery Fee" value={formatNaira(deliveryFee)} colors={colors} />
      <SummaryRow label="Service Fee" value={formatNaira(serviceFee)} colors={colors} />
      <SummaryRow label="Discount" value={"-" + formatNaira(discount)} colors={colors} />

      <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

      <SummaryRow label="Total" value={formatNaira(total)} colors={colors} isTotal />
    </View>
  );
}

function SummaryRow({
  label,
  value,
  colors,
  isTotal,
}: {
  label: string;
  value: string;
  colors: ThemeColors;
  isTotal?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text
        style={[
          styles.summaryLabel,
          { color: isTotal ? colors.darkText : colors.grayText },
          isTotal && styles.summaryLabelTotal,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          { color: isTotal ? colors.primaryBlue : colors.darkText },
          isTotal && styles.summaryValueTotal,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

type DeliveryTimingCardProps = {
  colors: ThemeColors;
  timing: DeliveryTimingOption;
  onSelectTiming: (timing: DeliveryTimingOption) => void;
  scheduledDate: Date;
  onPressDate: () => void;
  onPressTime: () => void;
};

function DeliveryTimingCard({
  colors,
  timing,
  onSelectTiming,
  scheduledDate,
  onPressDate,
  onPressTime,
}: DeliveryTimingCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.cardSectionTitle, { color: colors.darkText }]}>Delivery</Text>

      <RadioRow
        label="ASAP"
        isSelected={timing === "asap"}
        colors={colors}
        onPress={() => onSelectTiming("asap")}
      />
      <RadioRow
        label="Schedule Delivery"
        isSelected={timing === "scheduled"}
        colors={colors}
        onPress={() => onSelectTiming("scheduled")}
      />

      {timing === "scheduled" && (
        <View style={styles.scheduleRow}>
          <Pressable
            onPress={onPressDate}
            style={[styles.scheduleButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.primaryBlue} />
            <Text style={[styles.scheduleButtonText, { color: colors.darkText }]}>
              {scheduledDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </Text>
          </Pressable>

          <Pressable
            onPress={onPressTime}
            style={[styles.scheduleButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          >
            <Ionicons name="time-outline" size={16} color={colors.primaryBlue} />
            <Text style={[styles.scheduleButtonText, { color: colors.darkText }]}>
              {scheduledDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </Text>
          </Pressable>
        </View>
      )}

      {timing === "scheduled" && (
        <Text style={[styles.scheduleSummary, { color: colors.grayText }]}>
          Arriving {formatDateTime(scheduledDate)}
        </Text>
      )}
    </View>
  );
}

function RadioRow({
  label,
  isSelected,
  colors,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const innerScale = useSharedValue(isSelected ? 1 : 0);
  useEffect(() => {
    innerScale.value = withSpring(isSelected ? 1 : 0, { damping: 14, stiffness: 240 });
  }, [isSelected, innerScale]);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  return (
    <Pressable onPress={onPress} style={styles.radioRow}>
      <View
        style={[
          styles.radioOuter,
          { borderColor: isSelected ? colors.primaryBlue : colors.border },
        ]}
      >
        <Animated.View style={[styles.radioInner, { backgroundColor: colors.primaryBlue }, innerStyle]} />
      </View>
      <Text style={[styles.radioLabel, { color: colors.darkText }]}>{label}</Text>
    </Pressable>
  );
}

type DeliveryAddressCardProps = {
  colors: ThemeColors;
  addresses: SavedAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onAddAddress: () => void;
};

const ADDRESS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Work: "briefcase",
  School: "school",
  Parents: "people",
  Shop: "storefront",
  Custom: "location",
};

function DeliveryAddressCard({
  colors,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
}: DeliveryAddressCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.cardSectionTitle, { color: colors.darkText }]}>Delivery Address</Text>

      {addresses.map((address) => {
        const isSelected = address.id === selectedAddressId;
        const label =
          address.label === "Custom" && address.customLabel ? address.customLabel : address.label;

        return (
          <Pressable
            key={address.id}
            onPress={() => onSelectAddress(address.id)}
            style={[
              styles.addressRow,
              {
                backgroundColor: isSelected ? colors.inputBackground : "transparent",
                borderColor: isSelected ? colors.primaryBlue : colors.border,
              },
            ]}
          >
            <Ionicons name={ADDRESS_ICONS[address.label] ?? "location"} size={18} color={isSelected ? colors.primaryBlue : colors.grayText} />
            <View style={styles.addressTextColumn}>
              <Text style={[styles.addressLabel, { color: colors.darkText }]}>{label}</Text>
              <Text style={[styles.addressDetail, { color: colors.grayText }]} numberOfLines={1}>
                {address.address}
              </Text>
            </View>
            {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primaryBlue} />}
          </Pressable>
        );
      })}
      <Pressable onPress={onAddAddress} style={styles.addAddressRow}>
        <Ionicons name="add-circle-outline" size={18} color={colors.primaryBlue} />
        <Text style={[styles.addAddressText, { color: colors.primaryBlue }]}>Add New Address</Text>
      </Pressable>
    </View>
  );
}

type DriverSelectionCardProps = {
  colors: ThemeColors;
  drivers: NearbyDriver[];
  selectedDriverId: number | null;
  onSelectDriver: (id: number) => void;
  isLoading: boolean;
};

function DriverSelectionCard({
  colors,
  drivers,
  selectedDriverId,
  onSelectDriver,
  isLoading,
}: DriverSelectionCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.cardSectionTitle, { color: colors.darkText }]}>Choose Your Driver</Text>

      {isLoading ? (
        <View style={styles.driverEmptyState}>
          <View style={[styles.driverEmptyIconCircle, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="search-outline" size={26} color={colors.primaryBlue} />
          </View>
          <Text style={[styles.driverEmptyTitle, { color: colors.darkText }]}>Finding drivers nearby...</Text>
        </View>
      ) : drivers.length === 0 ? (
        <View style={styles.driverEmptyState}>
          <View style={[styles.driverEmptyIconCircle, { backgroundColor: colors.inputBackground }]}>
            <Ionicons name="bicycle-outline" size={26} color={colors.grayText} />
          </View>
          <Text style={[styles.driverEmptyTitle, { color: colors.darkText }]}>No Drivers Nearby</Text>
          <Text style={[styles.driverEmptyText, { color: colors.grayText }]}>
            No drivers are currently online near this address. Try again shortly, or switch to Schedule Delivery.
          </Text>
        </View>
      ) : (
        drivers.map((driver) => {
          const isSelected = driver.id === selectedDriverId;
          return (
            <Pressable
              key={driver.id}
              onPress={() => onSelectDriver(driver.id)}
              style={[
                styles.addressRow,
                {
                  backgroundColor: isSelected ? colors.inputBackground : "transparent",
                  borderColor: isSelected ? colors.primaryBlue : colors.border,
                },
              ]}
            >
              <Ionicons
                name="bicycle-outline"
                size={18}
                color={isSelected ? colors.primaryBlue : colors.grayText}
              />
              <View style={styles.addressTextColumn}>
                <Text style={[styles.addressLabel, { color: colors.darkText }]}>{driver.fullName}</Text>
                <Text style={[styles.addressDetail, { color: colors.grayText }]} numberOfLines={1}>
                  {driver.vehicle} · {driver.distanceKm.toFixed(1)} km away · ~{driver.etaMinutes} min
                </Text>
              </View>
              {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primaryBlue} />}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

type PaymentMethodCardProps = {
  colors: ThemeColors;
  paymentMethod: PaymentMethod | null;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  cardNumber: string;
  onChangeCardNumber: (value: string) => void;
  cardExpiry: string;
  onChangeCardExpiry: (value: string) => void;
  cardCvv: string;
  onChangeCardCvv: (value: string) => void;
  cardHolder: string;
  onChangeCardHolder: (value: string) => void;
};

function PaymentMethodCard({
  colors,
  paymentMethod,
  onSelectPaymentMethod,
  cardNumber,
  onChangeCardNumber,
  cardExpiry,
  onChangeCardExpiry,
  cardCvv,
  onChangeCardCvv,
  cardHolder,
  onChangeCardHolder,
}: PaymentMethodCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <Text style={[styles.cardSectionTitle, { color: colors.darkText }]}>Payment Method</Text>
      <View style={styles.paymentOptionsRow}>
        <PaymentOption icon="cash-outline" label="Cash On Delivery" isSelected={paymentMethod === "cash"} colors={colors} onPress={() => onSelectPaymentMethod("cash")} />
        <PaymentOption icon="card-outline" label="Card Payment" isSelected={paymentMethod === "card"} colors={colors} onPress={() => onSelectPaymentMethod("card")} />
      </View>
      {paymentMethod === "card" && (
        <DemoCardForm
          colors={colors}
          cardNumber={cardNumber}
          onChangeCardNumber={onChangeCardNumber}
          cardExpiry={cardExpiry}
          onChangeCardExpiry={onChangeCardExpiry}
          cardCvv={cardCvv}
          onChangeCardCvv={onChangeCardCvv}
          cardHolder={cardHolder}
          onChangeCardHolder={onChangeCardHolder}
        />
      )}
    </View>
  );
}

function PaymentOption({
  icon,
  label,
  isSelected,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isSelected: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.03 : 1, { damping: 16, stiffness: 220 });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.paymentOptionWrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        style={[
          styles.paymentOption,
          {
            backgroundColor: isSelected ? colors.inputBackground : "transparent",
            borderColor: isSelected ? colors.primaryBlue : colors.border,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={isSelected ? colors.primaryBlue : colors.grayText} />
        <Text style={[styles.paymentOptionLabel, { color: isSelected ? colors.primaryBlue : colors.darkText }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function DemoCardForm({
  colors,
  cardNumber,
  onChangeCardNumber,
  cardExpiry,
  onChangeCardExpiry,
  cardCvv,
  onChangeCardCvv,
  cardHolder,
  onChangeCardHolder,
}: {
  colors: ThemeColors;
  cardNumber: string;
  onChangeCardNumber: (value: string) => void;
  cardExpiry: string;
  onChangeCardExpiry: (value: string) => void;
  cardCvv: string;
  onChangeCardCvv: (value: string) => void;
  cardHolder: string;
  onChangeCardHolder: (value: string) => void;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleCardNumberChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, 16);
    const grouped = digitsOnly.replace(/(\d{4})(?=\d)/g, "$1 ");
    onChangeCardNumber(grouped);
  };

  const handleExpiryChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, 4);
    const formatted = digitsOnly.length > 2 ? digitsOnly.slice(0, 2) + "/" + digitsOnly.slice(2) : digitsOnly;
    onChangeCardExpiry(formatted);
  };

  return (
    <Animated.View style={[styles.cardForm, animatedStyle]}>
      <Text style={[styles.inputLabel, { color: colors.grayText }]}>Card Number</Text>
      <TextInput value={cardNumber} onChangeText={handleCardNumberChange} placeholder="1234 5678 9012 3456" placeholderTextColor={colors.placeholder} keyboardType="number-pad" style={[styles.cardInput, { backgroundColor: colors.inputBackground, color: colors.darkText, borderColor: colors.border }]} />
      <View style={styles.cardFormRow}>
        <View style={styles.cardFormHalf}>
          <Text style={[styles.inputLabel, { color: colors.grayText }]}>Expiry</Text>
          <TextInput value={cardExpiry} onChangeText={handleExpiryChange} placeholder="MM/YY" placeholderTextColor={colors.placeholder} keyboardType="number-pad" style={[styles.cardInput, { backgroundColor: colors.inputBackground, color: colors.darkText, borderColor: colors.border }]} />
        </View>
        <View style={styles.cardFormHalf}>
          <Text style={[styles.inputLabel, { color: colors.grayText }]}>CVV</Text>
          <TextInput value={cardCvv} onChangeText={(text) => onChangeCardCvv(text.replace(/\D/g, "").slice(0, 4))} placeholder="123" placeholderTextColor={colors.placeholder} keyboardType="number-pad" secureTextEntry style={[styles.cardInput, { backgroundColor: colors.inputBackground, color: colors.darkText, borderColor: colors.border }]} />
        </View>
      </View>
      <Text style={[styles.inputLabel, { color: colors.grayText }]}>Card Holder</Text>
      <TextInput value={cardHolder} onChangeText={onChangeCardHolder} placeholder="Name on card" placeholderTextColor={colors.placeholder} autoCapitalize="words" style={[styles.cardInput, { backgroundColor: colors.inputBackground, color: colors.darkText, borderColor: colors.border }]} />
    </Animated.View>
  );
}

function PlaceOrderButton({ colors, loading, onPress, }: { colors: ThemeColors; loading: boolean; onPress: () => void; }) {
  const scale = useSharedValue(1);
  const handlePressIn = useCallback(() => { scale.value = withTiming(0.97, { duration: 120 }); }, [scale]);
  const handlePressOut = useCallback(() => { scale.value = withTiming(1, { duration: 160 }); }, [scale]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={loading} style={[styles.placeOrderButton, { backgroundColor: colors.primaryBlue, opacity: loading ? 0.7 : 1 }]} >
        <Ionicons name="cart" size={18} color="#FFFFFF" />
        <Text style={styles.placeOrderText}>{loading ? "Placing Order..." : "Place Order"}</Text>
      </Pressable>
    </Animated.View>
  );
}

function OffDutyModal({ visible, colors, onClose }: { visible: boolean; colors: ThemeColors; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.confirmModalCard, { backgroundColor: colors.white }]}>
          <View style={[styles.confirmIconCircle, { backgroundColor: "#F59E0B1A" }]}>
            <Ionicons name="moon-outline" size={26} color="#F59E0B" />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.darkText }]}>Our Drivers Are Off Duty</Text>
          <Text style={[styles.confirmSubtitle, { color: colors.grayText }]}>
            {"We're open daily from " + formatBusinessHoursLabel() + ". Please place your order during these hours, or choose a delivery time that falls within them."}
          </Text>
          <Pressable
            onPress={onClose}
            style={[styles.confirmRemoveButton, { backgroundColor: colors.primaryBlue, width: "100%" }]}
          >
            <Text style={styles.confirmRemoveText}>Got It</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RemoveConfirmationModal({ product, colors, onCancel, onConfirm, }: { product: Product | null; colors: ThemeColors; onCancel: () => void; onConfirm: () => void; }) {
  return (
    <Modal visible={product !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.confirmModalCard, { backgroundColor: colors.white }]}>
          <View style={[styles.confirmIconCircle, { backgroundColor: colors.error + "14" }]}>
            <Ionicons name="trash-outline" size={28} color={colors.error} />
          </View>
          <Text style={[styles.confirmTitle, { color: colors.darkText }]}>
            Remove <Text style={{ fontWeight: "800" }}>{product?.name}</Text>?
          </Text>
          <Text style={[styles.confirmSubtitle, { color: colors.grayText }]}>
            It'll be removed from your cart, but you can always add it back later.
          </Text>
          <View style={styles.confirmButtonsRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.confirmCancelButton,
                { borderColor: colors.border, backgroundColor: colors.inputBackground, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.confirmCancelText, { color: colors.darkText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmRemoveButton,
                { backgroundColor: colors.error, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" />
              <Text style={styles.confirmRemoveText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SuccessModal({ visible, colors, onContinueShopping, onViewOrders, }: { visible: boolean; colors: ThemeColors; onContinueShopping: () => void; onViewOrders: () => void; }) {
  const scale = useSharedValue(0.85);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 14, stiffness: 180 });
      checkScale.value = withSequence(withTiming(0, { duration: 0 }), withSpring(1, { damping: 10, stiffness: 160 }));
    } else {
      scale.value = 0.85;
      checkScale.value = 0;
    }
  }, [visible, scale, checkScale]);

  const modalStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], }));
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }], }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <Animated.View style={[styles.successModalCard, { backgroundColor: colors.white }, modalStyle]}>
          <Animated.View style={[styles.successIconCircle, { backgroundColor: colors.success + "1A" }, checkStyle]}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          </Animated.View>
          <Text style={[styles.successTitle, { color: colors.darkText }]}>Order Successfully Placed</Text>
          <Text style={[styles.successSubtitle, { color: colors.grayText }]}> Your Kayora Premium Water order has been received.{"\n"} We&apos;ll notify you once your order is confirmed. </Text>
          <Pressable onPress={onContinueShopping} style={[styles.successPrimaryButton, { backgroundColor: colors.primaryBlue }]} >
            <Text style={styles.successPrimaryText}>Continue Shopping</Text>
          </Pressable>
          <Pressable onPress={onViewOrders} style={styles.successSecondaryButton}>
            <Text style={[styles.successSecondaryText, { color: colors.primaryBlue }]}>View Orders</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function EmptyCart({ colors, onStartShopping }: { colors: ThemeColors; onStartShopping: () => void }) {
  return (
    <View style={styles.emptyCartContainer}>
      <View style={[styles.emptyCartIconCircle, { backgroundColor: colors.inputBackground }]}>
        <Ionicons name="cart-outline" size={40} color={colors.grayText} />
      </View>
      <Text style={[styles.emptyCartTitle, { color: colors.darkText }]}>Your Cart is Empty</Text>
      <Text style={[styles.emptyCartSubtitle, { color: colors.grayText }]}> Look like you haven&apos;t added any clean premium hydration products to your cart yet. </Text>
      <Pressable onPress={onStartShopping} style={[styles.emptyCartButton, { backgroundColor: colors.primaryBlue }]}>
        <Text style={styles.emptyCartButtonText}>Start Shopping</Text>
      </Pressable>
    </View>
  );
}

function WebDateTimeFallback({
  visible,
  mode,
  colors,
  initialDate,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  mode: "date" | "time";
  colors: ThemeColors;
  initialDate: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}) {
  const [dateValue, setDateValue] = useState(() => toDateInputValue(initialDate));
  const [timeValue, setTimeValue] = useState(() => toTimeInputValue(initialDate));

  useEffect(() => {
    setDateValue(toDateInputValue(initialDate));
    setTimeValue(toTimeInputValue(initialDate));
  }, [initialDate, visible]);

  const handleConfirm = () => {
    const [year, month, day] = dateValue.split("-").map(Number);
    const [hours, minutes] = timeValue.split(":").map(Number);
    const updated = new Date(initialDate);
    if (mode === "date") {
      updated.setFullYear(year, month - 1, day);
    } else {
      updated.setHours(hours, minutes, 0, 0);
    }
    onConfirm(updated);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[webPickerStyles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[webPickerStyles.card, { backgroundColor: colors.white }]}>
          <Text style={[webPickerStyles.title, { color: colors.darkText }]}>
            {mode === "date" ? "Select Delivery Date" : "Select Delivery Time"}
          </Text>

          {mode === "date" ? (
            <input
              type="date"
              value={dateValue}
              min={toDateInputValue(new Date())}
              onChange={(e) => setDateValue(e.target.value)}
              style={webInputStyle}
            />
          ) : (
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              style={webInputStyle}
            />
          )}

          <View style={webPickerStyles.buttonsRow}>
            <Pressable onPress={onClose} style={[webPickerStyles.cancelButton, { borderColor: colors.border }]}>
              <Text style={[webPickerStyles.cancelText, { color: colors.darkText }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} style={[webPickerStyles.confirmButton, { backgroundColor: colors.primaryBlue }]}>
              <Text style={webPickerStyles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

const webInputStyle: React.CSSProperties = {
  fontSize: 16,
  padding: 12,
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  marginBottom: 20,
  width: "100%",
};

const webPickerStyles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: { width: 320, padding: 24, borderRadius: 16 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  buttonsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelButton: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },
  confirmButton: { flex: 1, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  confirmText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  backButton: { flexDirection: "row", alignItems: "center" },
  backLabel: { fontSize: 15, marginLeft: 4, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  cartIconWrapper: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  cartBadge: { position: "absolute", right: -2, top: -2, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
  cartBadgeText: { fontSize: 10, color: "#FFFFFF", fontWeight: "700" },
  scrollContent: { paddingBottom: 32 },
  section: { paddingHorizontal: 16, marginTop: 12 },
  cartLineCard: { flexDirection: "row", padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  cartLineImageWrapper: { width: 72, height: 72, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  cartLineImage: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cartLineBody: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
  cartLineTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cartLineTitleColumn: { flex: 1, paddingRight: 8 },
  cartLineSize: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginBottom: 2 },
  cartLineName: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  cartLineTagline: { fontSize: 12 },
  cartLineFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quantityStepper: { flexDirection: "row", alignItems: "center" },
  stepperButton: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepperValue: { fontSize: 14, fontWeight: "700", marginHorizontal: 12, minWidth: 16, textAlign: "center" },
  cartLineSubtotal: { fontSize: 15, fontWeight: "700" },
  card: { marginHorizontal: 16, padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 12 },
  cardSectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 13 },
  summaryLabelTotal: { fontSize: 14, fontWeight: "700" },
  summaryValue: { fontSize: 13, fontWeight: "600" },
  summaryValueTotal: { fontSize: 16, fontWeight: "800" },
  summaryDivider: { height: 1, marginVertical: 8 },
  radioRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 10 },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  radioLabel: { fontSize: 14, fontWeight: "600" },
  scheduleRow: { flexDirection: "row", marginTop: 4, marginBottom: 8 },
  scheduleButton: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", marginRight: 8 },
  scheduleButtonText: { fontSize: 13, fontWeight: "600", marginLeft: 6 },
  scheduleSummary: { fontSize: 12, fontWeight: "500" },
  addressRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  addressTextColumn: { flex: 1, marginLeft: 10, paddingRight: 8 },
  addressLabel: { fontSize: 14, fontWeight: "700", marginBottom: 1 },
  addressDetail: { fontSize: 12 },
  addAddressRow: { flexDirection: "row", alignItems: "center", marginTop: 6, paddingVertical: 4 },
  addAddressText: { fontSize: 13, fontWeight: "700", marginLeft: 6 },
  driverEmptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 20, paddingHorizontal: 12 },
  driverEmptyIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  driverEmptyTitle: { fontSize: 14, fontWeight: "700", marginBottom: 4, textAlign: "center" },
  driverEmptyText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  paymentOptionsRow: { flexDirection: "row", marginHorizontal: -4 },
  paymentOptionWrapper: { flex: 1, paddingHorizontal: 4 },
  paymentOption: { height: 48, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  paymentOptionLabel: { fontSize: 12, fontWeight: "700", marginLeft: 8 },
  cardForm: { marginTop: 14 },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4, marginTop: 10 },
  cardInput: { height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  cardFormRow: { flexDirection: "row", marginHorizontal: -6 },
  cardFormHalf: { flex: 1, paddingHorizontal: 6 },
  placeOrderButton: { marginHorizontal: 16, height: 50, borderRadius: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 24 },
  placeOrderText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginLeft: 8 },
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  confirmModalCard: { width: "85%", padding: 20, borderRadius: 16, alignItems: "center" },
  confirmIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  confirmTitle: { fontSize: 16, fontWeight: "700", textAlign: "center", marginBottom: 6 },
  confirmSubtitle: { fontSize: 13, textAlign: "center", marginBottom: 18 },
  confirmButtonsRow: { flexDirection: "row", marginHorizontal: -6 },
  confirmCancelButton: { flex: 1, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", marginHorizontal: 6 },
  confirmCancelText: { fontSize: 14, fontWeight: "600" },
  confirmRemoveButton: { flex: 1, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginHorizontal: 6 },
  confirmRemoveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  successModalCard: { width: "85%", padding: 24, borderRadius: 20, alignItems: "center" },
  successIconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontSize: 19, fontWeight: "800", textAlign: "center", marginBottom: 8 },
  successSubtitle: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 24 },
  successPrimaryButton: { width: "100%", height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  successPrimaryText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  successSecondaryButton: { width: "100%", height: 44, alignItems: "center", justifyContent: "center" },
  successSecondaryText: { fontSize: 14, fontWeight: "700" },
  emptyCartContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, marginTop: 80 },
  emptyCartIconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyCartTitle: { fontSize: 18, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  emptyCartSubtitle: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 24 },
  emptyCartButton: { paddingHorizontal: 24, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyCartButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});