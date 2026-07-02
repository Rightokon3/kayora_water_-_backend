import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  Platform,
  StatusBar,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import local service layout utilities
import { getUserProfile, addToCart } from '@/services/storage';

const C = {
  primaryBlue: '#0D4A8C',
  secondaryBlue: '#1E5FAF',
  gold: '#D4A64A',
  bg: '#FFFFFF',
  text: '#1F2937',
  subtitle: '#6B7280',
  border: '#E5E7EB',
  success: '#22C55E',
  cream: '#F5F0E8',
  darkBg: '#0A0F1E',
  darkCard: '#111827',
  darkBorder: '#1F2937',
  darkText: '#F9FAFB',
  darkSub: '#9CA3AF',
};

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

interface UsedFor { title: string; desc: string }
interface Spec { label: string; value: string }
interface Regulatory { label: string; value: string; sub: string }

interface Product {
  id: number;
  name: string;
  size: string;
  tagline: string;
  price: number;
  heroDesc: string;
  aboutTitle: string;
  aboutBody: string;
  bestUsedTitle: string;
  usedFor: UsedFor[];
  specs: Spec[];
  regulatory: Regulatory[];
  imageColor: string;
  orderTitle: string;
  orderDesc: string;
}

// ─── Bottle Illustration ──────────────────────────────────────────────────────
const BottleIllustration = React.memo(({ color, size, large }: { color: string; size: string; large?: boolean }) => {
  const h = large ? 200 : 90;
  const w = large ? 100 : 46;
  return (
    <View style={{ width: w, height: h, alignItems: 'center' }}>
      <View style={{ width: w * 0.38, height: h * 0.09, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' }} />
      <View style={{ width: w * 0.28, height: h * 0.12, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      <View style={{ width: w, flex: 1, borderRadius: large ? 16 : 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.88)', paddingHorizontal: large ? 10 : 4, paddingVertical: large ? 6 : 2, borderRadius: 3, marginBottom: 4 }}>
          <Text style={{ fontSize: large ? 11 : 5, fontWeight: '800', color, letterSpacing: 1 }}>KAYORA</Text>
        </View>
        <Text style={{ fontSize: large ? 13 : 6, color: 'rgba(255,255,255,0.8)', fontWeight: '700' }}>{size}</Text>
      </View>
    </View>
  );
});

// ─── Toast Component ──────────────────────────────────────────────────────────
const Toast = React.memo(({ message, visible }: { message: string; visible: boolean }) => {
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 14 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-80, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 });
    }
  }, [visible]);

  return (
    <Animated.View style={[toastStyles.container, useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }], opacity: opacity.value }))]}>
      <Ionicons name="checkmark-circle" size={18} color={C.success} />
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
});

// ─── Related Product Card ─────────────────────────────────────────────────────
const RelatedCard = React.memo(({ item, onPress }: { item: any; onPress: () => void }) => {
  const scale = useSharedValue(1);
  return (
    <Animated.View style={useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15 }); }}
        onPress={onPress}
        style={styles.relatedCard}
      >
        <View style={styles.relatedSizeBox}>
          <Text style={styles.relatedSizeText}>{item.size}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.relatedName}>{item.name}</Text>
          <Text style={styles.relatedSub}>Kayora {item.size}</Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={C.subtitle} />
      </Pressable>
    </Animated.View>
  );
});

// ─── Main Product Screen ──────────────────────────────────────────────────────
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bg = isDark ? C.darkBg : C.bg;
  const textColor = isDark ? C.darkText : C.text;
  const subColor = isDark ? C.darkSub : C.subtitle;
  const borderColor = isDark ? C.darkBorder : C.border;

  const cartScale = useSharedValue(1);
  const bulkScale = useSharedValue(1);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800);
  }, []);

// Fetch product dataset from Laravel Endpoint
  const loadProductData = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getUserProfile();
      const token = profile?.token || "";

      // 1. Fetch current product details from API
      const productRes = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Look at backend text directly if JSON parsing fails due to server errors
      const productStatus = productRes.status;
      const productData = await productRes.json().catch(() => null);

      if (!productRes.ok) {
        console.error(`Laravel Server Error [${productStatus}]:`, productData);
        throw new Error(`Server returned status ${productStatus}`);
      }

      // 2. Fetch inventory array for cross-navigation options
      const collectionRes = await fetch(`${API_BASE_URL}/api/products`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const collectionData = await collectionRes.json().catch(() => []);

      setProduct(productData.product || productData);
      
      const allItems = collectionData.products || collectionData || [];
      setRelatedProducts(allItems.filter((p: any) => String(p.id) !== String(id)));

    } catch (err) {
      console.error("Detailed Fetch Error Summary:", err);
      showToast("Could not sync with inventory database.");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    try {
      const profile = await getUserProfile();
      const token = profile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product.id, quantity: 1 }),
      });

      if (response.ok) {
        await addToCart(product.id);
        showToast('Added to cart successfully.');
      } else {
        throw new Error();
      }
    } catch {
      // Fallback local persistence storage setup
      const raw = await AsyncStorage.getItem('kayora_cart');
      const cart = raw ? JSON.parse(raw) : [];
      const idx = cart.findIndex((i: any) => i.id === product.id);
      if (idx >= 0) cart[idx].quantity += 1;
      else cart.push({ id: product.id, name: product.name, size: product.size, price: product.price, quantity: 1 });
      await AsyncStorage.setItem('kayora_cart', JSON.stringify(cart));
      showToast('Added to local cart.');
    }
  }, [product, showToast]);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={C.primaryBlue} />
      </View>
    );
  }

if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={C.primaryBlue} />
      </View>
    );
  }

  // ─── EMPTY STATE TRIGGER ───
  if (!product) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bg} />
        
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.emptyContent}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? C.darkCard : C.cream }]}>
            <Ionicons name="cube-outline" size={48} color={C.primaryBlue} />
          </View>
          
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            Product Not Available
          </Text>
          
          <Text style={[styles.emptyDesc, { color: subColor }]}>
            This item may have been discontinued or moved in our real-time database catalog.
          </Text>

          <TouchableOpacity 
            onPress={() => router.replace('/our-products')} 
            style={[styles.emptyBtn, { backgroundColor: C.primaryBlue }]}
          >
            <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyBtnText}>Return to Catalog</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryBlue} />

      <View style={{ position: 'absolute', top: insets.top + 60, left: 0, right: 0, zIndex: 999 }}>
        <Toast message={toastMessage} visible={toastVisible} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: C.primaryBlue }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Kayora {product.size} {product.name}
        </Text>
        <TouchableOpacity onPress={() => router.push('/my-cart')} style={styles.headerBtn}>
          <Ionicons name="cart-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        
        {/* HERO */}
        <Animated.View entering={FadeIn.duration(400)} style={[styles.hero, { backgroundColor: C.primaryBlue }]}>
          <View style={styles.heroImageWrap}>
            <BottleIllustration color={product.imageColor || C.secondaryBlue} size={product.size} large />
          </View>

          <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
            <Text style={styles.heroTagline}>{product.tagline?.toUpperCase()}</Text>
            <Text style={styles.heroTitle}>Kayora {product.size}{'\n'}{product.name}</Text>
            <Text style={styles.heroDesc}>{product.heroDesc}</Text>

            <Animated.View style={[useAnimatedStyle(() => ({ transform: [{ scale: cartScale.value }] })), { marginTop: 24 }]}>
              <Pressable
                onPressIn={() => { cartScale.value = withSpring(0.96); }}
                onPressOut={() => { cartScale.value = withSpring(1); }}
                onPress={handleAddToCart}
                style={styles.cartBtn}
              >
                <Ionicons name="cart" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.cartBtnText}>Add To Cart</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={[useAnimatedStyle(() => ({ transform: [{ scale: bulkScale.value }] })), { marginTop: 12, marginBottom: 28 }]}>
              <Pressable
                onPressIn={() => { bulkScale.value = withSpring(0.96); }}
                onPressOut={() => { bulkScale.value = withSpring(1); }}
                onPress={() => router.push('/contacts')}
                style={styles.bulkBtn}
              >
                <Text style={styles.bulkBtnText}>Request Bulk Order</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* ABOUT */}
        <Animated.View entering={FadeInUp.delay(100)} style={[styles.section, { backgroundColor: isDark ? C.darkCard : C.cream }]}>
          <Text style={[styles.eyebrow, { color: C.gold }]}>ABOUT THIS PRODUCT</Text>
          <Text style={[styles.aboutTitle, { color: textColor }]}>{product.aboutTitle}</Text>
          <Text style={[styles.bodyText, { color: isDark ? C.darkSub : '#374151' }]}>{product.aboutBody}</Text>
        </Animated.View>

        {/* USE CASES */}
        {product.usedFor && (
          <Animated.View entering={FadeInUp.delay(150)} style={[styles.section, { backgroundColor: isDark ? C.darkBg : C.cream }]}>
            <Text style={[styles.eyebrow, { color: C.gold }]}>BEST USED FOR</Text>
            <Text style={[styles.sectionTitle, { color: textColor }]}>{product.bestUsedTitle}</Text>
            <View style={{ gap: 12, marginTop: 16 }}>
              {product.usedFor.map((u, i) => (
                <View key={i} style={[styles.usedCard, { backgroundColor: isDark ? C.darkCard : C.bg, borderColor }]}>
                  <Text style={[styles.usedTitle, { color: textColor }]}>{u.title}</Text>
                  <Text style={[styles.usedDesc, { color: C.secondaryBlue }]}>{u.desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* SPECS */}
        {product.specs && (
          <Animated.View entering={FadeInUp.delay(200)} style={[styles.specsSection, { backgroundColor: C.primaryBlue }]}>
            <Text style={styles.specsEyebrow}>PRODUCT SPECIFICATIONS</Text>
            {product.specs.map((s, i) => (
              <View key={i}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{s.label}</Text>
                  <Text style={styles.specValue}>{s.value}</Text>
                </View>
                {i < product.specs.length - 1 && <View style={styles.specDivider} />}
              </View>
            ))}
          </Animated.View>
        )}

        {/* REGULATORY */}
        {product.regulatory && (
          <Animated.View entering={FadeInUp.delay(250)} style={[styles.specsSection, { backgroundColor: C.primaryBlue, paddingTop: 0 }]}>
            <Text style={[styles.specsEyebrow, { paddingTop: 28 }]}>REGULATORY STATUS</Text>
            <View style={{ gap: 12, marginTop: 8 }}>
              {product.regulatory.map((r, i) => (
                <View key={i} style={styles.regCard}>
                  <Text style={styles.regLabel}>{r.label}</Text>
                  <Text style={styles.regValue}>{r.value}</Text>
                  <Text style={styles.regSub}>{r.sub}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* CTA ORDER */}
        <Animated.View entering={FadeInUp.delay(300)} style={[styles.orderSection, { backgroundColor: isDark ? C.darkCard : C.cream }]}>
          <Text style={[styles.orderTitle, { color: textColor }]}>{product.orderTitle}</Text>
          <Text style={[styles.orderDesc, { color: subColor }]}>{product.orderDesc}</Text>
          <Pressable onPress={handleAddToCart} style={[styles.cartBtn, { marginTop: 20, backgroundColor: C.primaryBlue, width: '100%' }]}>
            <Ionicons name="cart" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.cartBtnText}>Add To Cart</Text>
          </Pressable>
        </Animated.View>

        {/* RELATED */}
        {relatedProducts.length > 0 && (
          <Animated.View entering={FadeInUp.delay(350)} style={[styles.section, { backgroundColor: isDark ? C.darkBg : C.cream }]}>
            <Text style={[styles.eyebrow, { color: C.gold }]}>ALSO AVAILABLE</Text>
            <Text style={[styles.sectionTitle, { color: textColor }]}>The Rest of the Kayora Range</Text>
            <View style={{ gap: 10, marginTop: 16 }}>
              {relatedProducts.map((rp) => (
                <RelatedCard key={rp.id} item={rp} onPress={() => router.replace(`/our-products/${rp.id}`)} />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const toastStyles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 16, right: 16, backgroundColor: '#1F2937', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 999 },
  text: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1 },
});

const styles = StyleSheet.create({
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 12, gap: 4 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  hero: { paddingTop: 12 },
  heroImageWrap: { alignItems: 'center', paddingVertical: 28, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 20, borderRadius: 20, marginBottom: 20 },
  heroTagline: { color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '800', lineHeight: 40, marginBottom: 12 },
  heroDesc: { color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 24 },
  cartBtn: { backgroundColor: C.gold, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  cartBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  bulkBtn: { borderRadius: 14, paddingVertical: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  bulkBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  section: { paddingHorizontal: 20, paddingVertical: 32 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  aboutTitle: { fontSize: 26, fontWeight: '800', lineHeight: 32, marginBottom: 16 },
  bodyText: { fontSize: 15, lineHeight: 26 },
  sectionTitle: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  usedCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 4 },
  usedTitle: { fontSize: 15, fontWeight: '700', marginBottom: 5 },
  usedDesc: { fontSize: 13, lineHeight: 20 },
  specsSection: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 28 },
  specsEyebrow: { color: C.gold, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
  specRow: { paddingVertical: 14 },
  specLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: 4 },
  specValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
  specDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  regCard: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 18 },
  regLabel: { color: C.gold, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  regValue: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  regSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 18 },
  orderSection: { padding: 28, alignItems: 'center' },
  orderTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 32, marginBottom: 12 },
  orderDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  relatedCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  relatedSizeBox: { width: 52, height: 52, borderRadius: 12, backgroundColor: C.primaryBlue + '15', alignItems: 'center', justifyContent: 'center' },
  relatedSizeText: { color: C.primaryBlue, fontSize: 11, fontWeight: '800' },
  relatedName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  relatedSub: { fontSize: 12, color: C.subtitle },
});