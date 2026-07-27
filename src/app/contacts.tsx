/**
 * Contacts / Become a Distributor screen.
 *
 * Sections:
 *  - Header (back, title, notifications icon)
 *  - Hero card with gradient overlay + two CTA buttons
 *  - Contact info cards (phone, email, address, hours)
 *  - OpenStreetMap showing Kayora factory location
 *  - FAQ accordion (Reanimated height animations)
 *  - Distributor application full-screen modal with form + validation
 *  - Bottom tab bar (Contact tab highlighted)
 *
 * The "Apply to Distribute" modal form saves locally via
 * saveDistributorApplication() in services/storage.ts — designed so
 * replacing that with a real backend call (Laravel/Firebase) only
 * requires changing that one function.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { BottomTabBar } from "@/components/BottomTabBar";
import { StaticMap } from "@/components/StaticMap";
import { useTheme } from "@/hooks/useTheme";
import {
  BusinessType,
  getUserProfile,
} from "@/services/storage";
import { validateEmail, validatePhone } from "../../utils/validation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE_URL = "https://kayorabackend-production.up.railway.app";
const KAYORA_PHONE = "0904 078 9918";
const KAYORA_EMAIL = "info@kaybibeverage.com";
const KAYORA_LAT = 4.6486423;
const KAYORA_LNG = 7.9478112;

const BUSINESS_TYPES: BusinessType[] = [
  "Retail Shop",
  "Wholesale",
  "Supermarket",
  "Distributor",
  "Mini Distributor",
  "Hotel",
  "Restaurant",
  "School",
  "Office",
  "Other",
];

const FAQ_ITEMS = [
  {
    id: "1",
    question: "How do I become a Kayora distributor?",
    answer:
      "Tap 'Apply to Distribute' on this page, fill in the form, and submit. Our team will review your application and contact you within one business day to discuss next steps.",
  },
  {
    id: "2",
    question: "How long does the approval process take?",
    answer:
      "Most applications are reviewed within 1 business day. Once approved, onboarding typically takes 2-3 additional business days before your first supply.",
  },
  {
    id: "3",
    question: "What is the minimum order quantity?",
    answer:
      "Minimum order quantities vary by product and distributor tier. Contact our team directly for pricing and volume tiers tailored to your business size.",
  },
  {
    id: "4",
    question: "Which locations do you deliver to?",
    answer:
      "We currently serve all LGAs in Akwa Ibom State, with expanding coverage to neighboring states. Contact us to confirm availability in your specific area.",
  },
  {
    id: "5",
    question: "What payment methods do you accept?",
    answer:
      "We accept bank transfers, cash on delivery for verified distributors, and POS payments at our depot. Credit facilities are available for long-standing distribution partners.",
  },
];

type ThemeColors = ReturnType<typeof useTheme>["colors"];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ContactsScreen() {
  const { colors } = useTheme();
  const toastRef = useRef<AnimatedToastRef>(null as any);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const headerOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(24);
  const heroOpacity = useSharedValue(0);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    headerOpacity.value = withTiming(1, { duration: 380 });
    heroOpacity.value = withDelay(100, withTiming(1, { duration: 480 }));
    heroTranslateY.value = withDelay(
      100,
      withTiming(0, { duration: 480, easing }),
    );
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleNotifications = useCallback(() => {
    router.push("/notifications" as never);
  }, []);

  const handleApply = useCallback(() => {
    setShowApplicationModal(true);
  }, []);

  const handleTalkToTeam = useCallback(async () => {
    const url = `tel:${KAYORA_PHONE}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      toastRef.current?.show({
        message: "Unable to open phone application.",
        type: "error",
      });
    }
  }, []);

  const handleOpenMaps = useCallback(() => {
    Linking.openURL(`https://maps.google.com/?q=${KAYORA_LAT},${KAYORA_LNG}`);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowApplicationModal(false);
  }, []);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.white }]}
      edges={["top"]}
    >
      <Animated.View style={[styles.header, headerStyle]}>
        <Pressable
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.darkText} />
          <Text style={[styles.backLabel, { color: colors.darkText }]}>
            Back
          </Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>
          Become a Distributor
        </Text>
        <Pressable
          onPress={handleNotifications}
          style={[
            styles.iconButton,
            { backgroundColor: colors.inputBackground },
          ]}
          accessibilityLabel="Notifications"
        >
          <Ionicons
            name="notifications-outline"
            size={18}
            color={colors.darkText}
          />
        </Pressable>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={heroStyle}>
          <HeroCard
            colors={colors}
            onApply={handleApply}
            onTalkToTeam={handleTalkToTeam}
          />
        </Animated.View>

        <ContactCards colors={colors} />

        <MapCard colors={colors} onOpenMaps={handleOpenMaps} />

        <FaqSection colors={colors} />
      </ScrollView>

      <BottomTabBar activeTab="settings" colors={colors} />

      <ApplicationModal
        visible={showApplicationModal}
        colors={colors}
        onClose={handleCloseModal}
        toastRef={toastRef}
      />

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// HeroCard
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-undef
function HeroCard({
  colors,
  onApply,
  onTalkToTeam,
}: {
  colors: ThemeColors;
  onApply: () => void;
  onTalkToTeam: () => void;
}) {
  return (
    <View style={[styles.heroCard, { backgroundColor: colors.primaryBlue }]}>
      <View style={styles.heroOverlay}>
        <Text style={styles.heroEyebrow}>Distribution Network</Text>
        <Text style={styles.heroHeading}>
          Carry the Standard.{"\n"}Build a Business.
        </Text>
        <Text style={styles.heroParagraph}>
          Kayora Premium Water is recruiting distributors across Akwa Ibom and
          neighboring states. Join our growing network and enjoy dependable
          supply, premium products and business support.
        </Text>
      </View>

      <View style={styles.heroButtons}>
        <Pressable onPress={onApply} style={styles.heroPrimaryButton}>
          <Ionicons name="business" size={16} color={colors.primaryBlue} />
          <Text style={[styles.heroPrimaryText, { color: colors.primaryBlue }]}>
            Apply to Distribute
          </Text>
        </Pressable>

        <Pressable onPress={onTalkToTeam} style={styles.heroSecondaryButton}>
          <Ionicons name="call" size={16} color="#FFFFFF" />
          <Text style={styles.heroSecondaryText}>Talk to Our Team</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ContactCards
// ---------------------------------------------------------------------------

function ContactCards({ colors }: { colors: ThemeColors }) {
  const cards = [
    {
      id: "phone",
      icon: "call-outline" as keyof typeof Ionicons.glyphMap,
      title: "Phone",
      lines: [KAYORA_PHONE],
    },
    {
      id: "email",
      icon: "mail-outline" as keyof typeof Ionicons.glyphMap,
      title: "Email",
      lines: [KAYORA_EMAIL],
    },
    {
      id: "address",
      icon: "location-outline" as keyof typeof Ionicons.glyphMap,
      title: "Address",
      lines: [
        "Kaybi Beverage Industries Limited",
        "173 Eket Oron Road, Eket",
        "Akwa Ibom State",
      ],
    },
    {
      id: "hours",
      icon: "time-outline" as keyof typeof Ionicons.glyphMap,
      title: "Working Hours",
      lines: [
        "Monday - Friday: 8:00 AM - 5:00 PM",
        "Saturday: 9:00 AM - 2:00 PM",
        "Sunday: Closed",
      ],
    },
  ];

  return (
    <View style={styles.contactCardsGrid}>
      {cards.map((card, index) => (
        <ContactInfoCard
          key={card.id}
          card={card}
          index={index}
          colors={colors}
        />
      ))}
    </View>
  );
}

type ContactCardData = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  lines: string[];
};

// eslint-disable-next-line no-undef
function ContactInfoCard({
  card,
  index,
  colors,
}: {
  card: ContactCardData;
  index: number;
  colors: ThemeColors;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    const delay = 200 + index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration: 380 }));
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 380, easing }),
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.contactCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
        animatedStyle,
      ]}
    >
      <View
        style={[styles.contactCardIcon, { backgroundColor: colors.lightBlue }]}
      >
        <Ionicons name={card.icon} size={20} color={colors.primaryBlue} />
      </View>
      <Text style={[styles.contactCardTitle, { color: colors.darkText }]}>
        {card.title}
      </Text>
      {card.lines.map((line, i) => (
        <Text
          key={i}
          style={[styles.contactCardLine, { color: colors.grayText }]}
        >
          {line}
        </Text>
      ))}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// MapCard
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-undef
function MapCard({
  colors,
  onOpenMaps,
}: {
  colors: ThemeColors;
  onOpenMaps: () => void;
}) {
  return (
    <View style={[styles.mapCard, { borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.darkText }]}>
        Find Us
      </Text>
      <View style={styles.mapWrapper}>
        <StaticMap
          latitude={KAYORA_LAT}
          longitude={KAYORA_LNG}
          markerLabel="Kayora Premium Water"
          zoom={15}
        />
      </View>
      <Pressable
        onPress={onOpenMaps}
        style={[styles.openMapsButton, { backgroundColor: colors.primaryBlue }]}
      >
        <Ionicons name="navigate" size={15} color="#FFFFFF" />
        <Text style={styles.openMapsText}>Open in Google Maps</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// FAQ Section
// ---------------------------------------------------------------------------

function FaqSection({ colors }: { colors: ThemeColors }) {
  return (
    <View style={styles.faqSection}>
      <Text style={[styles.sectionTitle, { color: colors.darkText }]}>
        Frequently Asked Questions
      </Text>
      {FAQ_ITEMS.map((item, index) => (
        <FaqItem key={item.id} item={item} index={index} colors={colors} />
      ))}
    </View>
  );
}

// eslint-disable-next-line no-undef
function FaqItem({
  item,
  index,
  colors,
}: {
  item: { id: string; question: string; answer: string };
  index: number;
  colors: ThemeColors;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(12);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    const delay = 100 + index * 60;
    cardOpacity.value = withDelay(delay, withTiming(1, { duration: 360 }));
    cardTranslateY.value = withDelay(
      delay,
      withTiming(0, { duration: 360, easing }),
    );
  }, [index]);

  const toggle = useCallback(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    if (!isOpen) {
      height.value = withTiming(1, { duration: 280, easing });
      opacity.value = withTiming(1, { duration: 280 });
      rotate.value = withTiming(1, { duration: 260, easing });
    } else {
      height.value = withTiming(0, { duration: 240, easing });
      opacity.value = withTiming(0, { duration: 200 });
      rotate.value = withTiming(0, { duration: 240, easing });
    }
    setIsOpen((prev) => !prev);
  }, [isOpen]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const answerStyle = useAnimatedStyle(() => ({
    maxHeight: height.value === 0 ? 0 : 500,
    opacity: opacity.value,
    overflow: "hidden",
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 180}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.faqCard,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
        cardStyle,
      ]}
    >
      <Pressable onPress={toggle} style={styles.faqQuestion}>
        <Text style={[styles.faqQuestionText, { color: colors.darkText }]}>
          {item.question}
        </Text>
        <Animated.View style={iconStyle}>
          <Ionicons name="chevron-down" size={18} color={colors.primaryBlue} />
        </Animated.View>
      </Pressable>
      <Animated.View style={answerStyle}>
        <Text style={[styles.faqAnswer, { color: colors.grayText }]}>
          {item.answer}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Application Modal
// ---------------------------------------------------------------------------

type FormValues = {
  fullName: string;
  businessName: string;
  businessType: BusinessType | "";
  city: string;
  lga: string;
  state: string;
  phone: string;
  whatsapp: string;
  email: string;
  estimatedMonthlyVolume: string;
  yearsInBusiness: string;
  additionalInfo: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.fullName.trim()) errors.fullName = "Full name is required";
  if (!values.businessName.trim())
    errors.businessName = "Business name is required";
  if (!values.businessType)
    errors.businessType = "Please select a business type";
  if (!values.city.trim()) errors.city = "City is required";
  if (!values.lga.trim()) errors.lga = "LGA is required";
  if (!values.state.trim()) errors.state = "State is required";
  const phoneError = validatePhone(values.phone);
  if (phoneError) errors.phone = phoneError;
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.estimatedMonthlyVolume.trim())
    errors.estimatedMonthlyVolume = "Please estimate monthly volume";
  return errors;
}

const INITIAL_FORM: FormValues = {
  fullName: "",
  businessName: "",
  businessType: "",
  city: "",
  lga: "",
  state: "",
  phone: "",
  whatsapp: "",
  email: "",
  estimatedMonthlyVolume: "",
  yearsInBusiness: "",
  additionalInfo: "",
};

// eslint-disable-next-line no-undef
function ApplicationModal({
  visible,
  colors,
  onClose,
  toastRef,
}: {
  visible: boolean;
  colors: ThemeColors;
  onClose: () => void;
  toastRef: React.RefObject<AnimatedToastRef>;
}) {
  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [touched, setTouched] = useState<Set<keyof FormValues>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const successScale = useSharedValue(0.7);
  const successOpacity = useSharedValue(0);

  const computedErrors = useMemo(() => validateForm(form), [form]);
  const isValid = Object.keys(computedErrors).length === 0;

  const visibleErrors: FormErrors = useMemo(() => {
    const result: FormErrors = {};
    (Object.keys(computedErrors) as Array<keyof FormValues>).forEach((key) => {
      if (touched.has(key)) {
        result[key] = computedErrors[key];
      }
    });
    return result;
  }, [computedErrors, touched]);

  const handleChange = useCallback((field: keyof FormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const handleSelectType = useCallback((type: BusinessType) => {
    setForm((prev) => ({ ...prev, businessType: type }));
    setTouched((prev) => new Set(prev).add("businessType"));
    setShowTypeDropdown(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    const allFields = Object.keys(INITIAL_FORM) as Array<keyof FormValues>;
    setTouched(new Set(allFields));
    const currentErrors = validateForm(form);
    if (Object.keys(currentErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const user = await getUserProfile();
      const token = user?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/distributor/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          businessName: form.businessName.trim(),
          businessType: form.businessType,
          city: form.city.trim(),
          lga: form.lga.trim(),
          state: form.state.trim(),
          phone: form.phone.trim(),
          whatsapp: form.whatsapp.trim() || null,
          email: form.email.trim().toLowerCase(),
          estimatedMonthlyVolume: form.estimatedMonthlyVolume.trim(),
          yearsInBusiness: form.yearsInBusiness.trim() || null,
          additionalInfo: form.additionalInfo.trim() || null,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        successScale.value = withSpring(1, { damping: 12, stiffness: 180 });
        successOpacity.value = withTiming(1, { duration: 300 });

        setTimeout(() => {
          setShowSuccess(false);
          setForm(INITIAL_FORM);
          setTouched(new Set());
          successScale.value = 0.7;
          successOpacity.value = 0;
          onClose();
        }, 2200);
      } else {
        const errorData = await response.json();
        toastRef.current?.show({
          message: errorData.message || "Failed to submit application.",
          type: "error",
        });
      }
    } catch (err) {
      toastRef.current?.show({
        message: "Network error connecting to server.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [form, onClose]);

  const successStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [{ scale: successScale.value }],
  }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.modalRoot, { backgroundColor: colors.white }]}
        edges={["top", "bottom"]}
      >
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.border }]}
        >
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.darkText} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.darkText }]}>
            Distributor Application
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {showSuccess ? (
          <Animated.View style={[styles.successContainer, successStyle]}>
            <View
              style={[
                styles.successIconCircle,
                { backgroundColor: colors.success + "1A" },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={colors.success}
              />
            </View>
            <Text style={[styles.successTitle, { color: colors.darkText }]}>
              Application Submitted Successfully
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.grayText }]}>
              Our team will contact you within one business day.
            </Text>
          </Animated.View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={[styles.formSectionLabel, { color: colors.grayText }]}
              >
                Personal Information
              </Text>

              <FormField
                label="Full Name *"
                value={form.fullName}
                onChangeText={(v) => handleChange("fullName", v)}
                placeholder="Your full name"
                error={visibleErrors.fullName}
                colors={colors}
              />
              <FormField
                label="Business Name *"
                value={form.businessName}
                onChangeText={(v) => handleChange("businessName", v)}
                placeholder="Your business or company name"
                error={visibleErrors.businessName}
                colors={colors}
              />

              <Text style={[styles.fieldLabel, { color: colors.grayText }]}>
                Business Type *
              </Text>
              <Pressable
                onPress={() => setShowTypeDropdown(true)}
                style={[
                  styles.dropdownTrigger,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: visibleErrors.businessType
                      ? colors.error
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    {
                      color: form.businessType
                        ? colors.darkText
                        : colors.placeholder,
                    },
                  ]}
                >
                  {form.businessType || "Select business type"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.grayText}
                />
              </Pressable>
              {visibleErrors.businessType && (
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {visibleErrors.businessType}
                </Text>
              )}

              <Modal
                visible={showTypeDropdown}
                transparent
                animationType="fade"
              >
                <Pressable
                  style={styles.dropdownOverlay}
                  onPress={() => setShowTypeDropdown(false)}
                >
                  <View
                    style={[
                      styles.dropdownList,
                      { backgroundColor: colors.white },
                    ]}
                  >
                    {BUSINESS_TYPES.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => handleSelectType(type)}
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: colors.darkText },
                          ]}
                        >
                          {type}
                        </Text>
                        {form.businessType === type && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={colors.primaryBlue}
                          />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </Pressable>
              </Modal>

              <Text
                style={[
                  styles.formSectionLabel,
                  { color: colors.grayText, marginTop: 16 },
                ]}
              >
                Location
              </Text>
              <FormField
                label="City *"
                value={form.city}
                onChangeText={(v) => handleChange("city", v)}
                placeholder="e.g. Eket"
                error={visibleErrors.city}
                colors={colors}
              />
              <FormField
                label="LGA *"
                value={form.lga}
                onChangeText={(v) => handleChange("lga", v)}
                placeholder="e.g. Eket LGA"
                error={visibleErrors.lga}
                colors={colors}
              />
              <FormField
                label="State *"
                value={form.state}
                onChangeText={(v) => handleChange("state", v)}
                placeholder="e.g. Akwa Ibom"
                error={visibleErrors.state}
                colors={colors}
              />

              <Text
                style={[
                  styles.formSectionLabel,
                  { color: colors.grayText, marginTop: 16 },
                ]}
              >
                Contact Details
              </Text>
              <FormField
                label="Phone *"
                value={form.phone}
                onChangeText={(v) => handleChange("phone", v)}
                placeholder="+2348012345678"
                keyboardType="phone-pad"
                error={visibleErrors.phone}
                colors={colors}
              />
              <FormField
                label="WhatsApp (Optional)"
                value={form.whatsapp}
                onChangeText={(v) => handleChange("whatsapp", v)}
                placeholder="+2348012345678"
                keyboardType="phone-pad"
                colors={colors}
              />
              <FormField
                label="Email *"
                value={form.email}
                onChangeText={(v) => handleChange("email", v)}
                placeholder="you@business.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={visibleErrors.email}
                colors={colors}
              />

              <Text
                style={[
                  styles.formSectionLabel,
                  { color: colors.grayText, marginTop: 16 },
                ]}
              >
                Business Details
              </Text>
              <FormField
                label="Estimated Monthly Volume *"
                value={form.estimatedMonthlyVolume}
                onChangeText={(v) => handleChange("estimatedMonthlyVolume", v)}
                placeholder="e.g. 500 cartons"
                error={visibleErrors.estimatedMonthlyVolume}
                colors={colors}
              />
              <FormField
                label="Years in Business (Optional)"
                value={form.yearsInBusiness}
                onChangeText={(v) => handleChange("yearsInBusiness", v)}
                placeholder="e.g. 3 years"
                keyboardType="number-pad"
                colors={colors}
              />

              <Text style={[styles.fieldLabel, { color: colors.grayText }]}>
                Anything Else (Optional)
              </Text>
              <TextInput
                value={form.additionalInfo}
                onChangeText={(v) => handleChange("additionalInfo", v)}
                placeholder="Tell us anything that would help us understand your business..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.darkText,
                  },
                ]}
              />

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: isValid
                      ? colors.primaryBlue
                      : colors.grayText,
                    opacity: isSubmitting ? 0.7 : 1,
                  },
                ]}
              >
                {isSubmitting ? (
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>
                      Submit Application
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

// eslint-disable-next-line no-undef
function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  colors,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  colors: ThemeColors;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : isFocused
      ? colors.primaryBlue
      : colors.border;
  const isValid = !error && value.length > 0;

  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: colors.grayText }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.inputBackground, borderColor },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "sentences"}
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.fieldInput, { color: colors.darkText }]}
        />
        {isValid && (
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        )}
      </View>
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
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
  headerTitle: { fontSize: 16, fontWeight: "800" },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20,
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    paddingTop: 0,
  },
  heroOverlay: {
    padding: 24,
    paddingBottom: 20,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  heroHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 32,
    marginBottom: 12,
  },
  heroParagraph: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroPrimaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  heroPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
  },
  heroSecondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  heroSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contactCardsGrid: {
    gap: 12,
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  contactCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  contactCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },
  contactCardLine: {
    fontSize: 13,
    lineHeight: 19,
  },
  mapCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  mapWrapper: {
    height: 220,
  },
  openMapsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    margin: 16,
    borderRadius: 12,
  },
  openMapsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  faqSection: {
    gap: 10,
  },
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  fieldWrapper: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  fieldInput: { flex: 1, fontSize: 15, height: "100%" },
  errorText: { fontSize: 11, marginTop: 4 },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 4,
  },
  dropdownTriggerText: { fontSize: 15 },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dropdownList: {
    borderRadius: 16,
    overflow: "hidden",
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  dropdownItemText: { fontSize: 14, fontWeight: "600" },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 28,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});