
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";

import { useTheme, ThemeMode } from "@/hooks/useTheme";
import { BottomTabBar } from "@/components/BottomTabBar";
import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { getSavedAddresses, saveAddresses } from "@/services/storage";
import {
  getUserProfile,
  UserProfile,
  saveUserProfile,
  getSavedCards,
  SavedCard,
  addSavedCard,
  deleteSavedCard,
  setDefaultCard,
  getNotificationPreferences,
  saveNotificationPreferences,
  NotificationPreferences,
  saveThemePreference,
  deleteAllUserData,
} from "@/services/storage";
import { SavedAddress } from "@/types/location";

type ThemeColors = ReturnType<typeof useTheme>["colors"];

const APP_VERSION = "1.0.0";

const DELETE_REASONS = [
  "I no longer use Kayora.",
  "I created another account.",
  "Too many notifications.",
  "Delivery experience.",
  "Payment issues.",
  "App performance.",
  "Privacy concerns.",
  "Other",
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const toastRef = useRef<AnimatedToastRef>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    orderNotifications: true,
    promotions: true,
    newProducts: false,
    locationServices: false,
  });

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [deleteCardTarget, setDeleteCardTarget] = useState<SavedCard | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 380 });
    (async () => {
      const [p, a, c, n] = await Promise.all([
        getUserProfile(),
        getSavedAddresses(),
        getSavedCards(),
        getNotificationPreferences(),
      ]);
      setProfile(p);
      setAddresses(a);
      setCards(c);
      setNotifPrefs(n);
    })();
  }, []);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  const handleBack = useCallback(() => router.back(), []);
  const handleNotifications = useCallback(() => router.push("/notifications" as never), []);

  const handleSaveProfile = useCallback(
    async (updated: UserProfile) => {
      await saveUserProfile(updated);
      setProfile(updated);
      setShowEditProfile(false);
      toastRef.current?.show({ message: "Profile Updated Successfully.", type: "success" });
    },
    []
  );

  const handleDeleteCard = useCallback(async (card: SavedCard) => {
    const updated = await deleteSavedCard(card.id);
    setCards(updated);
    setDeleteCardTarget(null);
  }, []);

  const handleSetDefaultCard = useCallback(async (id: string) => {
    const updated = await setDefaultCard(id);
    setCards(updated);
  }, []);

  const handleAddCard = useCallback(async (card: SavedCard) => {
    const updated = await addSavedCard(card);
    setCards(updated);
    setShowAddCard(false);
    toastRef.current?.show({ message: "Card added successfully.", type: "success" });
  }, []);

  const handleToggleNotif = useCallback(
    async (key: keyof NotificationPreferences) => {
      const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
      setNotifPrefs(updated);
      await saveNotificationPreferences(updated);
    },
    [notifPrefs]
  );

  const handleThemeChange = useCallback(
    async (newMode: ThemeMode) => {
      setMode(newMode);
      await saveThemePreference(newMode);
    },
    [setMode]
  );

  const handleSignOut = useCallback(async () => {
    setShowSignOutConfirm(false);
    toastRef.current?.show({ message: "Signed out successfully.", type: "success" });
    setTimeout(() => router.replace("/(sign)/login"), 600);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    await deleteAllUserData();
    setShowDeleteAccount(false);
    router.replace("/(sign)/login");
  }, []);

  const initial = profile?.username ? profile.username.charAt(0).toUpperCase() : "?";

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.white }]} edges={["top"]}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.darkText} />
          <Text style={[styles.backLabel, { color: colors.darkText }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Settings</Text>
        <Pressable
          onPress={handleNotifications}
          style={[styles.iconButton, { backgroundColor: colors.inputBackground }]}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.darkText} />
        </Pressable>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Profile Card */}
        <SectionCard colors={colors} index={0}>
          <View style={styles.profileRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryBlue }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={[styles.profileName, { color: colors.darkText }]}>
                  {profile?.username ?? "—"}
                </Text>
                <View style={[styles.verifiedBadge, { backgroundColor: colors.success + "1A" }]}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
                </View>
              </View>
              <Text style={[styles.profileMeta, { color: colors.grayText }]}>{profile?.email ?? "—"}</Text>
              <Text style={[styles.profileMeta, { color: colors.grayText }]}>{profile?.phone ?? "—"}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setShowEditProfile(true)}
            style={[styles.editProfileButton, { backgroundColor: colors.primaryBlue }]}
          >
            <Ionicons name="pencil" size={15} color="#FFF" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </Pressable>
        </SectionCard>

        {/* Payment Methods */}
        <SectionTitle title="Payment Methods" colors={colors} />
        <SectionCard colors={colors} index={1}>
          <View style={[styles.cashRow, { backgroundColor: colors.lightBlue }]}>
            <Ionicons name="cash-outline" size={20} color={colors.primaryBlue} />
            <Text style={[styles.cashLabel, { color: colors.primaryBlue }]}>Cash on Delivery</Text>
            <Text style={[styles.cashAlways, { color: colors.grayText }]}>Always available</Text>
          </View>

          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              colors={colors}
              onSetDefault={() => handleSetDefaultCard(card.id)}
              onDelete={() => setDeleteCardTarget(card)}
            />
          ))}

          <Pressable
            onPress={() => setShowAddCard(true)}
            style={[styles.addCardButton, { borderColor: colors.primaryBlue }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primaryBlue} />
            <Text style={[styles.addCardText, { color: colors.primaryBlue }]}>Add New Card</Text>
          </Pressable>
        </SectionCard>

        {/* Delivery Locations */}
        <SectionTitle title="Delivery Locations" colors={colors} />
        <SectionCard colors={colors} index={2}>
          {addresses.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.grayText }]}>No saved addresses yet.</Text>
          ) : (
            addresses.map((address) => (
              <AddressRow key={address.id} address={address} colors={colors} />
            ))
          )}
          <Pressable
            onPress={() => router.push("/routeSetup" as never)}
            style={[styles.addCardButton, { borderColor: colors.primaryBlue }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primaryBlue} />
            <Text style={[styles.addCardText, { color: colors.primaryBlue }]}>Add New Location</Text>
          </Pressable>
        </SectionCard>

        {/* Distributor Card */}
        <SectionTitle title="Business" colors={colors} />
        <SectionCard colors={colors} index={3}>
          <View style={styles.distributorRow}>
            <View style={[styles.distributorIcon, { backgroundColor: colors.goldAccent + "1A" }]}>
              <Ionicons name="business" size={22} color={colors.goldAccent} />
            </View>
            <View style={styles.distributorText}>
              <Text style={[styles.distributorTitle, { color: colors.darkText }]}>
                Become a Kayora Distributor
              </Text>
              <Text style={[styles.distributorSubtitle, { color: colors.grayText }]}>
                Join our growing network and earn by supplying premium water.
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/contacts" as never)}
            style={[styles.distributorButton, { backgroundColor: colors.goldAccent }]}
          >
            <Text style={styles.distributorButtonText}>Apply Now</Text>
          </Pressable>
        </SectionCard>

        {/* App Settings */}
        <SectionTitle title="App Settings" colors={colors} />
        <SectionCard colors={colors} index={4}>
          <Text style={[styles.settingsSubLabel, { color: colors.grayText }]}>Theme</Text>
          <View style={styles.themeRow}>
            {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => handleThemeChange(m)}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: mode === m ? colors.primaryBlue : colors.inputBackground,
                    borderColor: mode === m ? colors.primaryBlue : colors.border,
                  },
                ]}
              >
                <Text style={[styles.themeChipText, { color: mode === m ? "#FFF" : colors.grayText }]}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.settingsSubLabel, { color: colors.grayText }]}>Notifications</Text>
          {(
            [
              { key: "orderNotifications", label: "Order Notifications" },
              { key: "promotions", label: "Promotions" },
              { key: "newProducts", label: "New Products" },
              { key: "locationServices", label: "Location Services" },
            ] as Array<{ key: keyof NotificationPreferences; label: string }>
          ).map((item) => (
            <View key={item.key} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.darkText }]}>{item.label}</Text>
              <Switch
                value={notifPrefs[item.key]}
                onValueChange={() => handleToggleNotif(item.key)}
                trackColor={{ false: colors.border, true: colors.primaryBlue }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {[
            { label: "Language", value: "English", icon: "language-outline" },
            { label: "Terms & Conditions", icon: "document-text-outline" },
            { label: "Privacy Policy", icon: "shield-outline" },
            { label: "Contact Support", icon: "headset-outline" },
          ].map((item) => (
            <Pressable key={item.label} style={styles.menuRow}>
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.grayText} />
              <Text style={[styles.menuLabel, { color: colors.darkText }]}>{item.label}</Text>
              <View style={styles.menuRight}>
                {item.value && (
                  <Text style={[styles.menuValue, { color: colors.grayText }]}>{item.value}</Text>
                )}
                <Ionicons name="chevron-forward" size={16} color={colors.grayText} />
              </View>
            </Pressable>
          ))}

          <View style={styles.versionRow}>
            <Text style={[styles.versionText, { color: colors.grayText }]}>
              Version {APP_VERSION}
            </Text>
          </View>
        </SectionCard>

        {/* Danger Zone */}
        <SectionTitle title="Danger Zone" colors={colors} />
        <View style={[styles.dangerCard, { borderColor: colors.error }]}>
          <Pressable
            onPress={() => setShowDeleteAccount(true)}
            style={styles.dangerRow}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.dangerLabel, { color: colors.error }]}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.error} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.error + "30" }]} />
          <Pressable
            onPress={() => setShowSignOutConfirm(true)}
            style={styles.dangerRow}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[styles.dangerLabel, { color: colors.error }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.error} />
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomTabBar activeTab="settings" colors={colors} />

      {/* Edit Profile Modal */}
      {profile && (
        <EditProfileModal
          visible={showEditProfile}
          profile={profile}
          colors={colors}
          onClose={() => setShowEditProfile(false)}
          onSave={handleSaveProfile}
        />
      )}

      {/* Add Card Modal */}
      <AddCardModal
        visible={showAddCard}
        colors={colors}
        onClose={() => setShowAddCard(false)}
        onAdd={handleAddCard}
      />

      {/* Delete Card Confirmation */}
      <ConfirmModal
        visible={deleteCardTarget !== null}
        title={"Remove " + (deleteCardTarget?.maskedNumber ?? "") + "?"}
        message="This card will be removed from your saved payment methods."
        confirmLabel="Remove"
        confirmDanger
        colors={colors}
        onCancel={() => setDeleteCardTarget(null)}
        onConfirm={() => deleteCardTarget && handleDeleteCard(deleteCardTarget)}
      />

      {/* Sign Out Confirmation */}
      <ConfirmModal
        visible={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        confirmDanger
        colors={colors}
        onCancel={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOut}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        visible={showDeleteAccount}
        colors={colors}
        onClose={() => setShowDeleteAccount(false)}
        onDelete={handleDeleteAccount}
      />

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// SectionCard + SectionTitle helpers
// ---------------------------------------------------------------------------

function SectionTitle({ title, colors }: { title: string; colors: ThemeColors }) {
  return (
    <Text style={[styles.sectionTitle, { color: colors.grayText }]}>{title.toUpperCase()}</Text>
  );
}

function SectionCard({
  children,
  colors,
  index,
}: {
  children: React.ReactNode;
  colors: ThemeColors;
  index: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    opacity.value = withDelay(index * 70, withTiming(1, { duration: 380 }));
    translateY.value = withDelay(index * 70, withTiming(0, { duration: 380, easing }));
  }, [index]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, animStyle]}
    >
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// CardRow
// ---------------------------------------------------------------------------

function CardRow({
  card,
  colors,
  onSetDefault,
  onDelete,
}: {
  card: SavedCard;
  colors: ThemeColors;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.cardRow, { borderColor: colors.border }]}>
      <View style={[styles.cardTypeIcon, { backgroundColor: colors.lightBlue }]}>
        <Ionicons name="card-outline" size={18} color={colors.primaryBlue} />
      </View>
      <View style={styles.cardRowInfo}>
        <Text style={[styles.cardBankName, { color: colors.darkText }]}>{card.bankName}</Text>
        <Text style={[styles.cardMasked, { color: colors.grayText }]}>
          {card.cardType} •••• {card.maskedNumber.slice(-4)} · {card.expiryDate}
        </Text>
        {card.isDefault && (
          <View style={[styles.defaultBadge, { backgroundColor: colors.success + "1A" }]}>
            <Text style={[styles.defaultBadgeText, { color: colors.success }]}>Default</Text>
          </View>
        )}
      </View>
      <View style={styles.cardRowActions}>
        {!card.isDefault && (
          <Pressable onPress={onSetDefault} hitSlop={8}>
            <Ionicons name="star-outline" size={18} color={colors.primaryBlue} />
          </Pressable>
        )}
        <Pressable onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AddressRow
// ---------------------------------------------------------------------------

const ADDR_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home", Work: "briefcase", School: "school",
  Parents: "people", Shop: "storefront", Custom: "location",
};

function AddressRow({ address, colors }: { address: SavedAddress; colors: ThemeColors }) {
  const label =
    address.label === "Custom" && address.customLabel ? address.customLabel : address.label;
  return (
    <View style={[styles.addressRow, { borderColor: colors.border }]}>
      <Ionicons name={ADDR_ICONS[address.label] ?? "location"} size={18} color={colors.primaryBlue} />
      <View style={styles.addressInfo}>
        <Text style={[styles.addressLabel, { color: colors.darkText }]}>{label}</Text>
        <Text style={[styles.addressDetail, { color: colors.grayText }]} numberOfLines={1}>
          {address.address}
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// EditProfileModal
// ---------------------------------------------------------------------------

function EditProfileModal({
  visible,
  profile,
  colors,
  onClose,
  onSave,
}: {
  visible: boolean;
  profile: UserProfile;
  colors: ThemeColors;
  onClose: () => void;
  onSave: (p: UserProfile) => Promise<void>;
}) {
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email);
  const [isSaving, setIsSaving] = useState(false);
  const [emailNote, setEmailNote] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    await onSave({ ...profile, username, email });
    setIsSaving(false);
  }, [profile, username, email, onSave]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.white }]} edges={["top", "bottom"]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.darkText} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.darkText }]}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <SettingsInput label="Username" value={username} onChangeText={setUsername} colors={colors} />
            <SettingsInput
              label="Email Address"
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailNote(true); }}
              keyboardType="email-address"
              autoCapitalize="none"
              colors={colors}
            />
            {emailNote && (
              <Text style={[styles.emailNote, { color: colors.grayText }]}>
                Verification email will be required when the backend is connected.
              </Text>
            )}
            <SettingsInput
              label="Phone Number (cannot be edited)"
              value={profile.phone}
              onChangeText={() => {}}
              editable={false}
              colors={colors}
            />
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveButton, { backgroundColor: colors.primaryBlue }]}
            >
              <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save Changes"}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// AddCardModal
// ---------------------------------------------------------------------------

function AddCardModal({
  visible,
  colors,
  onClose,
  onAdd,
}: {
  visible: boolean;
  colors: ThemeColors;
  onClose: () => void;
  onAdd: (card: SavedCard) => Promise<void>;
}) {
  const [bankName, setBankName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardType, setCardType] = useState<SavedCard["cardType"]>("Visa");
  const [isDefault, setIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatCardNumber = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    return digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
  };

  const handleAdd = useCallback(async () => {
    if (!bankName || cardNumber.replace(/\s/g, "").length < 16 || expiry.length < 5) return;
    setIsSaving(true);
    await onAdd({
      id: "card_" + Date.now(),
      bankName,
      maskedNumber: cardNumber,
      expiryDate: expiry,
      cardType,
      isDefault,
    });
    setBankName(""); setCardNumber(""); setExpiry(""); setIsDefault(false);
    setIsSaving(false);
  }, [bankName, cardNumber, expiry, cardType, isDefault, onAdd]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.white }]} edges={["top", "bottom"]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={colors.darkText} /></Pressable>
          <Text style={[styles.modalTitle, { color: colors.darkText }]}>Add New Card</Text>
          <View style={{ width: 24 }} />
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <SettingsInput label="Bank Name" value={bankName} onChangeText={setBankName} colors={colors} />
            <SettingsInput
              label="Card Number"
              value={cardNumber}
              onChangeText={(v) => setCardNumber(formatCardNumber(v))}
              keyboardType="number-pad"
              colors={colors}
            />
            <SettingsInput
              label="Expiry (MM/YY)"
              value={expiry}
              onChangeText={(v) => setExpiry(formatExpiry(v))}
              keyboardType="number-pad"
              colors={colors}
            />
            <Text style={[styles.fieldLabel, { color: colors.grayText }]}>Card Type</Text>
            <View style={styles.cardTypeRow}>
              {(["Visa", "Mastercard", "Verve", "Other"] as SavedCard["cardType"][]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setCardType(t)}
                  style={[styles.cardTypeChip, {
                    backgroundColor: cardType === t ? colors.primaryBlue : colors.inputBackground,
                    borderColor: cardType === t ? colors.primaryBlue : colors.border,
                  }]}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: cardType === t ? "#FFF" : colors.grayText }}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setIsDefault((p) => !p)} style={styles.defaultToggleRow}>
              <Ionicons name={isDefault ? "checkbox" : "square-outline"} size={22} color={colors.primaryBlue} />
              <Text style={[styles.toggleLabel, { color: colors.darkText }]}>Set as default card</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              disabled={isSaving}
              style={[styles.saveButton, { backgroundColor: colors.primaryBlue }]}
            >
              <Text style={styles.saveButtonText}>{isSaving ? "Adding..." : "Add Card"}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// DeleteAccountModal
// ---------------------------------------------------------------------------

function DeleteAccountModal({
  visible,
  colors,
  onClose,
  onDelete,
}: {
  visible: boolean;
  colors: ThemeColors;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = selectedReason !== null && (selectedReason !== "Other" || otherText.trim().length > 0);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    await onDelete();
  }, [onDelete]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.white }]} edges={["top", "bottom"]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={24} color={colors.darkText} /></Pressable>
          <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Account</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <Text style={[styles.deleteHeading, { color: colors.darkText }]}>We're sorry to see you go.</Text>
          <Text style={[styles.deleteSubtitle, { color: colors.grayText }]}>
            Why are you deleting your account?
          </Text>

          {DELETE_REASONS.map((reason) => (
            <Pressable
              key={reason}
              onPress={() => setSelectedReason(reason)}
              style={[styles.reasonRow, { borderColor: selectedReason === reason ? colors.error : colors.border }]}
            >
              <Ionicons
                name={selectedReason === reason ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={selectedReason === reason ? colors.error : colors.grayText}
              />
              <Text style={[styles.reasonText, { color: colors.darkText }]}>{reason}</Text>
            </Pressable>
          ))}

          {selectedReason === "Other" && (
            <TextInput
              value={otherText}
              onChangeText={setOtherText}
              placeholder="Please describe your reason..."
              placeholderTextColor={colors.placeholder}
              multiline
              numberOfLines={4}
              style={[styles.textArea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.darkText }]}
            />
          )}

          <Text style={[styles.warningText, { color: colors.error }]}>
            This action cannot be undone.
          </Text>

          <View style={styles.deleteButtonsRow}>
            <Pressable onPress={onClose} style={[styles.cancelButton, { borderColor: colors.border }]}>
              <Text style={[styles.cancelButtonText, { color: colors.darkText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={!canDelete || isDeleting}
              style={[styles.deleteButton, { backgroundColor: canDelete ? colors.error : colors.grayText }]}
            >
              <Text style={styles.deleteButtonText}>
                {isDeleting ? "Deleting..." : "Delete My Account"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ConfirmModal
// ---------------------------------------------------------------------------

function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  confirmDanger,
  colors,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  colors: ThemeColors;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.confirmOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.confirmCard, { backgroundColor: colors.white }]}>
          <Text style={[styles.confirmTitle, { color: colors.darkText }]}>{title}</Text>
          <Text style={[styles.confirmMessage, { color: colors.grayText }]}>{message}</Text>
          <View style={styles.deleteButtonsRow}>
            <Pressable onPress={onCancel} style={[styles.cancelButton, { borderColor: colors.border }]}>
              <Text style={[styles.cancelButtonText, { color: colors.darkText }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={[styles.deleteButton, { backgroundColor: confirmDanger ? colors.error : colors.primaryBlue }]}
            >
              <Text style={styles.deleteButtonText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SettingsInput helper
// ---------------------------------------------------------------------------

function SettingsInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  editable = true,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences";
  editable?: boolean;
  colors: ThemeColors;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputWrapper}>
      <Text style={[styles.fieldLabel, { color: colors.grayText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.placeholder}
        style={[
          styles.textInput,
          {
            backgroundColor: editable ? colors.inputBackground : colors.border,
            borderColor: focused ? colors.primaryBlue : colors.border,
            color: colors.darkText,
          },
        ]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
  backButton: { flexDirection: "row", alignItems: "center", gap: 2, minWidth: 64 },
  backLabel: { fontSize: 15, fontWeight: "600" },
  headerTitle: { fontSize: 17, fontWeight: "800" },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
    shadowColor: "#0D4A8C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  profileName: { fontSize: 16, fontWeight: "800" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  verifiedText: { fontSize: 10, fontWeight: "700" },
  profileMeta: { fontSize: 12, marginTop: 2 },
  editProfileButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 12 },
  editProfileText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  cashRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, marginBottom: 10 },
  cashLabel: { flex: 1, fontSize: 14, fontWeight: "700" },
  cashAlways: { fontSize: 11 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1 },
  cardTypeIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardRowInfo: { flex: 1 },
  cardBankName: { fontSize: 14, fontWeight: "700" },
  cardMasked: { fontSize: 12, marginTop: 2 },
  defaultBadge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  defaultBadgeText: { fontSize: 10, fontWeight: "700" },
  cardRowActions: { flexDirection: "row", gap: 12 },
  addCardButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 44, borderRadius: 12, borderWidth: 1.5, marginTop: 10 },
  addCardText: { fontSize: 14, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: "700" },
  addressDetail: { fontSize: 12, marginTop: 1 },
  distributorRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  distributorIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  distributorText: { flex: 1 },
  distributorTitle: { fontSize: 14, fontWeight: "800", marginBottom: 4 },
  distributorSubtitle: { fontSize: 12, lineHeight: 18 },
  distributorButton: { height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  distributorButtonText: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  settingsSubLabel: { fontSize: 12, fontWeight: "700", marginBottom: 10 },
  themeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  themeChip: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  themeChipText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, marginVertical: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuValue: { fontSize: 13 },
  versionRow: { alignItems: "center", paddingTop: 8 },
  versionText: { fontSize: 12 },
  dangerCard: { borderWidth: 1.5, borderRadius: 16, marginBottom: 4, overflow: "hidden" },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  dangerLabel: { flex: 1, fontSize: 14, fontWeight: "700" },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  modalScroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  inputWrapper: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  textInput: { height: 50, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15 },
  emailNote: { fontSize: 12, marginTop: -8, marginBottom: 16, lineHeight: 18 },
  saveButton: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveButtonText: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  cardTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  cardTypeChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  defaultToggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  deleteHeading: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  deleteSubtitle: { fontSize: 14, marginBottom: 16 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  reasonText: { flex: 1, fontSize: 14 },
  textArea: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingTop: 12, fontSize: 14, minHeight: 100, textAlignVertical: "top", marginTop: 8, marginBottom: 16 },
  warningText: { fontSize: 13, fontWeight: "700", textAlign: "center", marginBottom: 20 },
  deleteButtonsRow: { flexDirection: "row", gap: 12 },
  cancelButton: { flex: 1, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  cancelButtonText: { fontSize: 14, fontWeight: "700" },
  deleteButton: { flex: 1, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  deleteButtonText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  confirmOverlay: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  confirmCard: { width: "100%", borderRadius: 20, padding: 24 },
  confirmTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  confirmMessage: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
});