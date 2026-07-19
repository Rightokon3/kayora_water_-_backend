import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { BottomTabBar } from "@/components/BottomTabBar";
import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { getUserProfile, deleteAllUserData } from "@/services/storage";

type ThemeColors = ReturnType<typeof useTheme>["colors"];

const API_BASE_URL = "http://localhost:8000";

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
// Skeleton primitives
// ---------------------------------------------------------------------------

function SkeletonBlock({
  width,
  height,
  radius = 8,
  colors,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  colors: ThemeColors;
  style?: any;
}) {
  const pulse = useSharedValue(0.4);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) }),
        withTiming(0.4, { duration: 700, easing: ReanimatedEasing.inOut(ReanimatedEasing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
        },
        animStyle,
        style,
      ]}
    />
  );
}

function SkeletonProfileCard({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.profileRow}>
        <SkeletonBlock width={60} height={60} radius={30} colors={colors} />
        <View style={styles.profileInfo}>
          <SkeletonBlock width={120} height={16} radius={4} colors={colors} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={160} height={12} radius={4} colors={colors} style={{ marginBottom: 6 }} />
          <SkeletonBlock width={110} height={12} radius={4} colors={colors} />
        </View>
      </View>
      <SkeletonBlock width="100%" height={42} radius={12} colors={colors} />
    </View>
  );
}

function SkeletonListCard({ rows, colors }: { rows: number; colors: ThemeColors }) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i}>
          <View style={styles.skeletonRow}>
            <View style={{ flex: 1 }}>
              <SkeletonBlock width="60%" height={14} radius={4} colors={colors} style={{ marginBottom: 6 }} />
              <SkeletonBlock width="85%" height={11} radius={4} colors={colors} />
            </View>
            <SkeletonBlock width={38} height={22} radius={11} colors={colors} />
          </View>
          {i < rows - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
        </View>
      ))}
    </View>
  );
}

function SettingsSkeleton({ colors }: { colors: ThemeColors }) {
  return (
    <View>
      <SkeletonProfileCard colors={colors} />
      <SkeletonBlock width={100} height={11} radius={4} colors={colors} style={{ marginTop: 20, marginBottom: 8 }} />
      <SkeletonListCard rows={2} colors={colors} />
      <SkeletonBlock width={110} height={11} radius={4} colors={colors} style={{ marginTop: 20, marginBottom: 8 }} />
      <SkeletonListCard rows={3} colors={colors} />
      <SkeletonBlock width={100} height={11} radius={4} colors={colors} style={{ marginTop: 20, marginBottom: 8 }} />
      <View style={[styles.dangerCard, { borderColor: colors.border }]}>
        <View style={styles.skeletonRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="50%" height={14} radius={4} colors={colors} />
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.skeletonRow}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="40%" height={14} radius={4} colors={colors} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const { colors } = useTheme();
  const toastRef = useRef<AnimatedToastRef>(null);

  // Profile Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState("customer");

  // Avatar state
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [pendingPictureUri, setPendingPictureUri] = useState<string | null>(null);
  const [pendingPictureBase64, setPendingPictureBase64] = useState<string | null>(null);
  const [shouldRemovePicture, setShouldRemovePicture] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // App Toggles
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [newProductsNotifications, setNewProductsNotifications] = useState(true);

  // Loading state — drives the skeleton
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Modal / overlay control
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReasonText, setOtherReasonText] = useState("");
  const [isSubmittingInactivation, setIsSubmittingInactivation] = useState(false);

  const headerOpacity = useSharedValue(0);
  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 380 });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));

  // Content fade-in once the skeleton is replaced by real data
  const contentOpacity = useSharedValue(0);
  useEffect(() => {
    if (!isInitialLoading) {
      contentOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isInitialLoading]);
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  // ---- Fetch settings when screen is viewed ----
  const loadDatabaseSettings = useCallback(async () => {
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok) {
        setFullName(data.user.name || "");
        setUsername(data.user.username || data.user.name || "U");
        setEmail(data.user.email || "");
        setPhone(data.user.phone || "");
        setAccountType(data.user.account_type || "customer");
        setProfilePicture(data.user.profile_picture || null);

        setOrderNotifications(data.settings.order_notifications);
        setNewProductsNotifications(data.settings.new_products);
      }
    } catch (err) {
      console.error("Error fetching persistent setting properties:", err);
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDatabaseSettings();
    }, [loadDatabaseSettings])
  );

  // ---- Avatar picking: stages a pending preview, does NOT save yet ----
  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingPictureUri(asset.uri);
      if (asset.base64) {
        setPendingPictureBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
      setShouldRemovePicture(false);
      setIsAvatarModalVisible(false);
    }
  };

  const handleRemoveImage = () => {
    setProfilePicture(null);
    setPendingPictureUri(null);
    setPendingPictureBase64(null);
    setShouldRemovePicture(true);
    setIsAvatarModalVisible(false);
    toastRef.current?.show({ message: "Picture flagged for removal. Click update to save.", type: "success" });
  };

  const handleCancelPendingPicture = useCallback(() => {
    setPendingPictureUri(null);
    setPendingPictureBase64(null);
  }, []);

  const handleConfirmPendingPicture = useCallback(async () => {
    if (!pendingPictureBase64) return;
    setIsUploadingPicture(true);
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/user/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          profile_picture_base64: pendingPictureBase64,
          remove_picture: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setProfilePicture(pendingPictureUri);
        setPendingPictureUri(null);
        setPendingPictureBase64(null);
        toastRef.current?.show({ message: "Profile picture updated!", type: "success" });
      } else {
        toastRef.current?.show({ message: data.message || "Failed to update picture.", type: "error" });
      }
    } catch (err) {
      toastRef.current?.show({ message: "Network connection error.", type: "error" });
    } finally {
      setIsUploadingPicture(false);
    }
  }, [pendingPictureBase64, pendingPictureUri, fullName, email, phone]);

  const handleUpdateProfile = useCallback(async () => {
    if (!fullName.trim() || !email.trim()) {
      toastRef.current?.show({ message: "Name and email cannot be empty.", type: "error" });
      return;
    }
    setIsSavingProfile(true);
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/user/profile/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName,
          email,
          phone,
          profile_picture_base64: null,
          remove_picture: shouldRemovePicture,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toastRef.current?.show({ message: data.message || "Profile updated successfully!", type: "success" });
        setShouldRemovePicture(false);
        setShowEditProfile(false);
      } else {
        toastRef.current?.show({ message: data.message || "Failed to update profile.", type: "error" });
      }
    } catch (err) {
      toastRef.current?.show({ message: "Network connection error.", type: "error" });
    } finally {
      setIsSavingProfile(false);
    }
  }, [fullName, email, phone, shouldRemovePicture]);

  const handleToggleChange = useCallback(async (key: "order_notifications" | "new_products", value: boolean) => {
    if (key === "order_notifications") setOrderNotifications(value);
    if (key === "new_products") setNewProductsNotifications(value);

    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      await fetch(`${API_BASE_URL}/api/user/settings/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value: value ? 1 : 0 }),
      });
    } catch (err) {
      console.error("Failed syncing notification preference toggle row:", err);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setShowSignOutConfirm(false);
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
    } catch (e) {}
    await deleteAllUserData();
    router.replace({
      pathname: "/login",
      params: { signoutMessage: "You have successfully signed out." },
    });
  }, []);

  const canSubmitDeletion =
    selectedReason !== null && (selectedReason !== "Other" || otherReasonText.trim().length > 0);

  const handleRequestAccountInactivation = useCallback(async () => {
    const reason = selectedReason === "Other" ? otherReasonText.trim() : selectedReason;

    if (!reason) {
      toastRef.current?.show({
        message: "Please specify a reason for deactivation.",
        type: "error",
      });
      return;
    }

    setIsSubmittingInactivation(true);
    try {
      const authProfile = await getUserProfile();
      const token = authProfile?.token || "";

      const response = await fetch(`${API_BASE_URL}/api/user/inactivate-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsDeleteModalVisible(false);
        setSelectedReason(null);
        setOtherReasonText("");

        toastRef.current?.show({
          message: "We have received your account deletion request.",
          type: "success",
        });
      } else {
        toastRef.current?.show({
          message: data.message || "Failed to log deactivation query.",
          type: "error",
        });
      }
    } catch (err) {
      toastRef.current?.show({ message: "Network connection error.", type: "error" });
    } finally {
      setIsSubmittingInactivation(false);
    }
  }, [selectedReason, otherReasonText]);

  const fallbackLetter = username
    ? username.charAt(0).toUpperCase()
    : fullName
    ? fullName.charAt(0).toUpperCase()
    : "U";

  const hasPendingPicture = pendingPictureUri !== null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.white }]} edges={["top"]}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={colors.darkText} />
          <Text style={[styles.backLabel, { color: colors.darkText }]}>Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Settings</Text>
        <Pressable
          onPress={() => router.push("/notifications" as never)}
          style={[styles.iconButton, { backgroundColor: colors.inputBackground }]}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.darkText} />
        </Pressable>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {isInitialLoading ? (
          <SettingsSkeleton colors={colors} />
        ) : (
          <Animated.View style={contentStyle}>
            {/* Profile Card */}
            <SectionCard colors={colors} index={0}>
              <View style={styles.profileRow}>
                <View style={styles.avatarPressable}>
                  <Pressable onPress={() => !hasPendingPicture && setIsAvatarModalVisible(true)}>
                    {(pendingPictureUri ?? profilePicture) ? (
                      <Image
                        source={{ uri: (pendingPictureUri ?? profilePicture) as string }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={[styles.avatarCircle, { backgroundColor: colors.primaryBlue }]}>
                        <Text style={styles.avatarText}>{fallbackLetter}</Text>
                      </View>
                    )}
                  </Pressable>

                  {hasPendingPicture ? (
                    <View style={styles.avatarConfirmRow}>
                      <Pressable
                        onPress={handleCancelPendingPicture}
                        disabled={isUploadingPicture}
                        style={[styles.avatarActionBtn, { backgroundColor: colors.error, borderColor: colors.white }]}
                      >
                        <Ionicons name="close" size={13} color="#FFF" />
                      </Pressable>
                      <Pressable
                        onPress={handleConfirmPendingPicture}
                        disabled={isUploadingPicture}
                        style={[
                          styles.avatarActionBtn,
                          { backgroundColor: colors.success ?? "#22C55E", borderColor: colors.white },
                        ]}
                      >
                        {isUploadingPicture ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      style={[styles.avatarEditBadge, { backgroundColor: colors.primaryBlue, borderColor: colors.white }]}
                    >
                      <Ionicons name="camera" size={12} color="#FFF" />
                    </View>
                  )}
                </View>

                <View style={styles.profileInfo}>
                  <View style={styles.profileNameRow}>
                    <Text style={[styles.profileName, { color: colors.darkText }]}>{fullName || "—"}</Text>
                    {accountType === "distributor" && (
                      <View style={[styles.tierBadge, { backgroundColor: colors.goldAccent + "1A" }]}>
                        <Ionicons name="star" size={11} color={colors.goldAccent} />
                        <Text style={[styles.tierText, { color: colors.goldAccent }]}>Distributor</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.profileMeta, { color: colors.grayText }]}>{email || "—"}</Text>
                  <Text style={[styles.profileMeta, { color: colors.grayText }]}>{phone || "—"}</Text>
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

            {/* Notifications */}
            <SectionTitle title="Notifications" colors={colors} />
            <SectionCard colors={colors} index={1}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <Text style={[styles.toggleTitle, { color: colors.darkText }]}>Order Notifications</Text>
                  <Text style={[styles.toggleSubtitle, { color: colors.grayText }]}>
                    Alerts when dispatch is on the way
                  </Text>
                </View>
                <Switch
                  value={orderNotifications}
                  onValueChange={(val) => handleToggleChange("order_notifications", val)}
                  trackColor={{ false: colors.border, true: colors.primaryBlue }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <Text style={[styles.toggleTitle, { color: colors.darkText }]}>New Products</Text>
                  <Text style={[styles.toggleSubtitle, { color: colors.grayText }]}>
                    Get broadcast logs when new inventory arrives
                  </Text>
                </View>
                <Switch
                  value={newProductsNotifications}
                  onValueChange={(val) => handleToggleChange("new_products", val)}
                  trackColor={{ false: colors.border, true: colors.primaryBlue }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </SectionCard>

            {/* App Info */}
            <SectionTitle title="App Settings" colors={colors} />
            <SectionCard colors={colors} index={2}>
              {[
                { label: "Terms & Conditions", icon: "document-text-outline" },
                { label: "Privacy Policy", icon: "shield-outline" },
                { label: "Contact Support", icon: "headset-outline" },
              ].map((item) => (
                <Pressable key={item.label} style={styles.menuRow}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.grayText} />
                  <Text style={[styles.menuLabel, { color: colors.darkText }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.grayText} />
                </Pressable>
              ))}
            </SectionCard>

            {/* Danger Zone */}
            <SectionTitle title="Danger Zone" colors={colors} />
            <View style={[styles.dangerCard, { borderColor: colors.error }]}>
              <Pressable onPress={() => setIsDeleteModalVisible(true)} style={styles.dangerRow}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={[styles.dangerLabel, { color: colors.error }]}>Request Account Deletion</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.error} />
              </Pressable>
              <View style={[styles.divider, { backgroundColor: colors.error + "30" }]} />
              <Pressable onPress={() => setShowSignOutConfirm(true)} style={styles.dangerRow}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={[styles.dangerLabel, { color: colors.error }]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.error} />
              </Pressable>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <BottomTabBar activeTab="settings" colors={colors} />

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfile} animationType="slide" onRequestClose={() => setShowEditProfile(false)}>
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.white }]} edges={["top", "bottom"]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowEditProfile(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.darkText} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.darkText }]}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <SettingsInput label="Full Name" value={fullName} onChangeText={setFullName} colors={colors} />
              <SettingsInput
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                colors={colors}
              />
              <SettingsInput
                label="Phone Line"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                colors={colors}
              />
              <Pressable
                onPress={handleUpdateProfile}
                disabled={isSavingProfile}
                style={[styles.saveButton, { backgroundColor: colors.primaryBlue }]}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Avatar Modal */}
      <Modal visible={isAvatarModalVisible} transparent animationType="fade" onRequestClose={() => setIsAvatarModalVisible(false)}>
        <View style={[styles.confirmOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.confirmCard, { backgroundColor: colors.white }]}>
            <Text style={[styles.confirmTitle, { color: colors.darkText, textAlign: "center" }]}>
              Manage Profile Picture
            </Text>
            <View style={styles.modalPreviewContainer}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.largePreviewImage} />
              ) : (
                <View style={[styles.largePreviewFallback, { backgroundColor: colors.primaryBlue }]}>
                  <Text style={styles.largePreviewFallbackText}>{fallbackLetter}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={handlePickImage} style={[styles.saveButton, { backgroundColor: colors.primaryBlue }]}>
              <Text style={styles.saveButtonText}>Upload New Photo</Text>
            </Pressable>
            {profilePicture && (
              <Pressable
                onPress={handleRemoveImage}
                style={[styles.saveButton, { backgroundColor: colors.error, marginTop: 10 }]}
              >
                <Text style={styles.saveButtonText}>Remove Photo</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setIsAvatarModalVisible(false)} style={{ marginTop: 14, alignItems: "center" }}>
              <Text style={{ color: colors.darkText, fontWeight: "700", fontSize: 14 }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={isDeleteModalVisible} animationType="slide" onRequestClose={() => setIsDeleteModalVisible(false)}>
        <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.white }]} edges={["top", "bottom"]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setIsDeleteModalVisible(false)} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.darkText} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.error }]}>Delete Account</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={[styles.deleteHeading, { color: colors.darkText }]}>We're sorry to see you go.</Text>
            <Text style={[styles.deleteSubtitle, { color: colors.grayText }]}>
              Why are you requesting deletion?
            </Text>

            {DELETE_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => setSelectedReason(reason)}
                style={[
                  styles.reasonRow,
                  { borderColor: selectedReason === reason ? colors.error : colors.border },
                ]}
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
                value={otherReasonText}
                onChangeText={setOtherReasonText}
                placeholder="Please describe your reason..."
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
                style={[
                  styles.textArea,
                  { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.darkText },
                ]}
              />
            )}

            <Text style={[styles.warningText, { color: colors.error }]}>
              Your request will be sent to the admin team for approval.
            </Text>

            <View style={styles.deleteButtonsRow}>
              <Pressable
                onPress={() => setIsDeleteModalVisible(false)}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.darkText }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRequestAccountInactivation}
                disabled={!canSubmitDeletion || isSubmittingInactivation}
                style={[
                  styles.deleteButton,
                  { backgroundColor: canSubmitDeletion ? colors.error : colors.grayText },
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {isSubmittingInactivation ? "Sending..." : "Submit Request"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Sign Out Confirm */}
      <Modal visible={showSignOutConfirm} transparent animationType="fade" onRequestClose={() => setShowSignOutConfirm(false)}>
        <View style={[styles.confirmOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.confirmCard, { backgroundColor: colors.white }]}>
            <Text style={[styles.confirmTitle, { color: colors.darkText }]}>Sign Out</Text>
            <Text style={[styles.confirmMessage, { color: colors.grayText }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.deleteButtonsRow}>
              <Pressable
                onPress={() => setShowSignOutConfirm(false)}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.darkText }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSignOut} style={[styles.deleteButton, { backgroundColor: colors.error }]}>
                <Text style={styles.deleteButtonText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// SectionCard + SectionTitle helpers
// ---------------------------------------------------------------------------

function SectionTitle({ title, colors }: { title: string; colors: ThemeColors }) {
  return <Text style={[styles.sectionTitle, { color: colors.grayText }]}>{title.toUpperCase()}</Text>;
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
// SettingsInput helper
// ---------------------------------------------------------------------------

function SettingsInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences";
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.placeholder}
        style={[
          styles.textInput,
          {
            backgroundColor: colors.inputBackground,
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
  avatarPressable: { position: "relative" },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarConfirmRow: {
    position: "absolute",
    bottom: -4,
    left: -2,
    flexDirection: "row",
    gap: 4,
  },
  avatarActionBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  profileName: { fontSize: 16, fontWeight: "800" },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  tierText: { fontSize: 10, fontWeight: "700" },
  profileMeta: { fontSize: 12, marginTop: 2 },
  editProfileButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 42, borderRadius: 12 },
  editProfileText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  toggleTextContainer: { flex: 1, paddingRight: 16 },
  toggleTitle: { fontSize: 14, fontWeight: "700" },
  toggleSubtitle: { fontSize: 11, marginTop: 2 },
  divider: { height: 1, marginVertical: 12 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  dangerCard: { borderWidth: 1.5, borderRadius: 16, marginBottom: 4, overflow: "hidden" },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  dangerLabel: { flex: 1, fontSize: 14, fontWeight: "700" },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
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
  modalScroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  inputWrapper: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  textInput: { height: 50, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15 },
  saveButton: { height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveButtonText: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  modalPreviewContainer: { alignItems: "center", marginBottom: 20 },
  largePreviewImage: { width: 140, height: 140, borderRadius: 70 },
  largePreviewFallback: { width: 140, height: 140, borderRadius: 70, justifyContent: "center", alignItems: "center" },
  largePreviewFallbackText: { color: "#FFF", fontSize: 48, fontWeight: "800" },
  deleteHeading: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  deleteSubtitle: { fontSize: 14, marginBottom: 16 },
  reasonRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  reasonText: { flex: 1, fontSize: 14 },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
    marginTop: 8,
    marginBottom: 16,
  },
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
});