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

import { useTheme } from "@/hooks/useTheme";
import { BottomTabBar } from "@/components/BottomTabBar";
import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import {
  getUserProfile,
  UserProfile,
  saveUserProfile,
  getSavedAddresses,
  deleteAllUserData,
} from "@/services/storage";

// Temp fallback interfaces to stop TS errors until you implement card storage
interface SavedCard {
  id: string;
  bankName: string;
  maskedNumber: string;
  expiryDate: string;
  cardType: "Visa" | "Mastercard" | "Verve" | "Other";
  isDefault: boolean;
}

interface NotificationPreferences {
  orderNotifications: boolean;
  promotions: boolean;
  newProducts: boolean;
  locationServices: boolean;
}

const API_BASE_URL = "http://localhost:8000"; 

export default function SettingsScreen() {
  const { colors } = useTheme();
  const toastRef = useRef<AnimatedToastRef>(null);

  // Profile Form Fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState("customer"); // <-- Added state to track distributor tier safely
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [pendingPictureBase64, setPendingPictureBase64] = useState<string | null>(null);
  const [shouldRemovePicture, setShouldRemovePicture] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // App Toggles (Persistent Boolean Tracking States)
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [newProductsNotifications, setNewProductsNotifications] = useState(true);

  // Modal Control Overlays
  const [isAvatarModalVisible, setIsAvatarModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmittingInactivation, setIsSubmittingInactivation] = useState(false);

  // Fetch settings when screen is viewed
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
        setAccountType(data.user.account_type || "customer"); // <-- Map account type here dynamically from your backend query mapping
        setProfilePicture(data.user.profile_picture || null);
        
        // This keeps the toggle state active when navigating away and back
        setOrderNotifications(data.settings.order_notifications);
        setNewProductsNotifications(data.settings.new_products);
      }
    } catch (err) {
      console.error("Error fetching persistent setting properties:", err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDatabaseSettings();
    }, [loadDatabaseSettings])
  );

  // Select a new picture from the device gallery
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
      setProfilePicture(asset.uri);
      if (asset.base64) {
        setPendingPictureBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
      setShouldRemovePicture(false);
      setIsAvatarModalVisible(false);
    }
  };

  // Remove the current profile picture
  const handleRemoveImage = () => {
    setProfilePicture(null);
    setPendingPictureBase64(null);
    setShouldRemovePicture(true);
    setIsAvatarModalVisible(false);
    toastRef.current?.show({ message: "Picture flagged for removal. Click update to save.", type: "success" });
  };

  // Send update profile changes to database
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
          profile_picture_base64: pendingPictureBase64,
          remove_picture: shouldRemovePicture,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toastRef.current?.show({ message: data.message || "Profile updated successfully!", type: "success" });
        setPendingPictureBase64(null);
        setShouldRemovePicture(false);
      } else {
        toastRef.current?.show({ message: data.message || "Failed to update profile.", type: "error" });
      }
    } catch (err) {
      toastRef.current?.show({ message: "Network connection error.", type: "error" });
    } finally {
      setIsSavingProfile(false);
    }
  }, [fullName, email, phone, pendingPictureBase64, shouldRemovePicture]);

  // Handle setting updates when toggled
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

  const handleRequestAccountInactivation = useCallback(async () => {
    if (!deleteReason.trim()) {
      toastRef.current?.show({ 
        message: "Please specify a reason for deactivation.", 
        type: "error" 
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
        body: JSON.stringify({ reason: deleteReason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsDeleteModalVisible(false);
        setDeleteReason(""); 
        
        toastRef.current?.show({
          message: "We have received your account deletion request.",
          type: "success",
        });
      } else {
        toastRef.current?.show({ 
          message: data.message || "Failed to log deactivation query.", 
          type: "error" 
        });
      }
    } catch (err) {
      toastRef.current?.show({ message: "Network connection error.", type: "error" });
    } finally {
      setIsSubmittingInactivation(false);
    }
  }, [deleteReason]);

  const fallbackLetter = username ? username.charAt(0).toUpperCase() : fullName ? fullName.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.white }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Settings Panel</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Control Box */}
        <View style={styles.avatarContainer}>
          <Pressable onPress={() => setIsAvatarModalVisible(true)} style={styles.avatarPressable}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primaryBlue }]}>
                <Text style={styles.avatarFallbackText}>{fallbackLetter}</Text>
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primaryBlue }]}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>
        </View>

        {/* Profile Fields Card */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.darkText }]}>Profile Information</Text>
          
          <Text style={[styles.inputLabel, { color: colors.grayText }]}>Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            style={[styles.textField, { borderColor: colors.border, color: colors.darkText }]}
          />
          
          <Text style={[styles.inputLabel, { color: colors.grayText }]}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.textField, { borderColor: colors.border, color: colors.darkText }]}
          />
          
          <Text style={[styles.inputLabel, { color: colors.grayText }]}>Phone Line</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.textField, { borderColor: colors.border, color: colors.darkText }]}
          />
          
          {/* 👑 DYNAMIC ACCOUNT LEVEL TIER ROW */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.inputBackground || "#F5F5F5" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.grayText }}>Account Level:</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: accountType === 'distributor' ? '#1E88E5' : colors.darkText }}>
              {accountType === 'distributor' ? '👑 Premium Distributor' : 'Standard Account'}
            </Text>
          </View>
          
          <Pressable
            onPress={handleUpdateProfile}
            disabled={isSavingProfile}
            style={[styles.primaryActionBtn, { backgroundColor: colors.primaryBlue }]}
          >
            {isSavingProfile ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Update Profile</Text>
            )}
          </Pressable>
        </View>

        {/* Notifications Section */}
        <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Text style={[styles.sectionHeading, { color: colors.darkText }]}>Notification Settings</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, { color: colors.darkText }]}>Order Notifications</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.grayText }]}>Alerts when dispatch is on the way</Text>
            </View>
            <Switch
              value={orderNotifications}
              onValueChange={(val) => handleToggleChange("order_notifications", val)}
              trackColor={{ true: colors.primaryBlue }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, { color: colors.darkText }]}>New Products</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.grayText }]}>Get broadcast logs when new inventory arrives</Text>
            </View>
            <Switch
              value={newProductsNotifications}
              onValueChange={(val) => handleToggleChange("new_products", val)}
              trackColor={{ true: colors.primaryBlue }}
            />
          </View>
        </View>

        {/* Administrative Action buttons */}
        <Pressable
          onPress={handleSignOut}
          style={[styles.logoutRowBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Log Out of Account</Text>
        </Pressable>

        <Pressable
          onPress={() => setIsDeleteModalVisible(true)}
          style={[styles.logoutRowBtn, { backgroundColor: colors.cardBackground, borderColor: colors.border, marginTop: 10 }]}
        >
          <Ionicons name="trash-outline" size={20} color={colors.grayText} />
          <Text style={[styles.logoutText, { color: colors.grayText }]}>Request Account Deletion</Text>
        </Pressable>
      </ScrollView>

      <BottomTabBar activeTab="settings" colors={colors} />

      {/* Avatar Viewer Modal View */}
      <Modal visible={isAvatarModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.darkText, textAlign: 'center' }]}>Manage Profile Picture</Text>
            <View style={styles.modalPreviewContainer}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.largePreviewImage} />
              ) : (
                <View style={[styles.largePreviewFallback, { backgroundColor: colors.primaryBlue }]}>
                  <Text style={styles.largePreviewFallbackText}>{fallbackLetter}</Text>
                </View>
              )}
            </View>
            <View style={styles.verticalActionList}>
              <Pressable onPress={handlePickImage} style={[styles.modalPrimaryAction, { backgroundColor: colors.primaryBlue }]}>
                <Text style={styles.whiteBtnText}>Upload New Photo</Text>
              </Pressable>
              {profilePicture && (
                <Pressable onPress={handleRemoveImage} style={[styles.modalPrimaryAction, { backgroundColor: colors.error, marginTop: 8 }]}>
                  <Text style={styles.whiteBtnText}>Remove Photo</Text>
                </Pressable>
              )}
              <Pressable onPress={() => setIsAvatarModalVisible(false)} style={[styles.cancelLinkBtn, { marginTop: 12 }]}>
                <Text style={[styles.cancelLinkText, { color: colors.darkText }]}>Close Window</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Deletion / Inactivation Request Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={[styles.modalCard, { backgroundColor: colors.white }]}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]}>Request Inactivation</Text>
              <Text style={[styles.modalDescription, { color: colors.grayText }]}>
                Your request will be submitted to the administration team. Once approved, your status becomes inactive to prevent re-registration with this email.
              </Text>
              <TextInput
                placeholder="Reason for requesting inactivation..."
                placeholderTextColor={colors.grayText}
                value={deleteReason}
                onChangeText={setDeleteReason}
                multiline
                style={[styles.modalInput, { borderColor: colors.border, color: colors.darkText }]}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setIsDeleteModalVisible(false)}
                  style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.darkText }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleRequestAccountInactivation}
                  disabled={isSubmittingInactivation}
                  style={[styles.modalBtn, { backgroundColor: colors.error }]}
                >
                  <Text style={[styles.modalBtnText, { color: colors.white }]}>
                    {isSubmittingInactivation ? "Sending..." : "Submit"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: "800" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  avatarContainer: { alignItems: "center", marginVertical: 20 },
  avatarPressable: { position: "relative" },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center" },
  avatarFallbackText: { color: "#FFF", fontSize: 36, fontWeight: "800" },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFF" },
  sectionCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionHeading: { fontSize: 15, fontWeight: "800", marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4, marginTop: 10 },
  textField: { height: 48, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 14 },
  primaryActionBtn: { height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 18 },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  toggleTextContainer: { flex: 1, paddingRight: 16 },
  toggleTitle: { fontSize: 14, fontWeight: "700" },
  toggleSubtitle: { fontSize: 11, marginTop: 2 },
  logoutRowBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 16 },
  logoutText: { fontSize: 14, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContainer: { width: "100%", alignItems: "center" },
  modalCard: { width: "100%", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  modalPreviewContainer: { alignItems: "center", marginBottom: 20 },
  largePreviewImage: { width: 160, height: 160, borderRadius: 80 },
  largePreviewFallback: { width: 160, height: 160, borderRadius: 80, justifyContent: "center", alignItems: "center" },
  largePreviewFallbackText: { color: "#FFF", fontSize: 54, fontWeight: "800" },
  verticalActionList: { width: '100%' },
  modalPrimaryAction: { height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  whiteBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  cancelLinkBtn: { padding: 10, alignItems: "center" },
  cancelLinkText: { fontWeight: "700", fontSize: 14 },
  modalDescription: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  modalInput: { height: 80, borderRadius: 12, borderWidth: 1.5, padding: 12, textAlignVertical: "top", fontSize: 14, marginBottom: 18 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 14, fontWeight: "700" },
});