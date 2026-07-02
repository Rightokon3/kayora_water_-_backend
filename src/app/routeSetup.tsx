import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";

import { SearchLocation } from "@/components/SearchLocation";
import { LocationCard } from "@/components/LocationCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AnimatedToast, AnimatedToastRef } from "@/components/AnimatedToast";
import { Colors } from "@/constants/colors";
import { AddressLabelType, AddressSuggestion, SavedAddress } from "@/types/location";

// IMPORT UPDATED STORAGE LAYOUT
import {
  getSavedAddresses,
  getUserProfile,
  saveAddressesToStorage,
  setRouteSetupComplete,
} from "@/services/storage";

const LABEL_OPTIONS: AddressLabelType[] = ["Home", "Work", "School", "Parents", "Shop", "Custom"];
const API_BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

function generateId(): string {
  return `addr_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export default function RouteSetupScreen() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<AddressLabelType>("Home");
  const [pendingSuggestion, setPendingSuggestion] = useState<AddressSuggestion | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const toastRef = useRef<AnimatedToastRef>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    const easing = ReanimatedEasing.out(ReanimatedEasing.cubic);
    opacity.value = withTiming(1, { duration: 420 });
    translateY.value = withTiming(0, { duration: 420, easing });
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Read saved addresses on layout load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await getSavedAddresses();
        if (isMounted) {
          setAddresses(saved || []);
          setIsLoadingInitial(false);
        }
      } catch (err) {
        if (isMounted) setIsLoadingInitial(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectSuggestion = useCallback((suggestion: AddressSuggestion) => {
    setPendingSuggestion(suggestion);
  }, []);

  const handleAddAddress = useCallback(async () => {
    if (!pendingSuggestion) {
      toastRef.current?.show({
        message: "Search and select an address first",
        type: "error",
      });
      return;
    }

    try {
      // 1. Recover token credentials
      const profile = await getUserProfile(); 
      const token = profile?.token || "";

      let backendSyncedAddress = null;

      // 2. Post coordinates to protected model endpoints
      try {
        const response = await fetch(`${API_BASE_URL}/api/addresses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            label: selectedLabel,
            address: `${pendingSuggestion.title}, ${pendingSuggestion.subtitle}`,
            latitude: pendingSuggestion.latitude,
            longitude: pendingSuggestion.longitude,
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          backendSyncedAddress = data.address;
        }
      } catch (e) {
        console.warn("Backend address sync failed, writing to client storage only.");
      }

      // 3. Fallback to client mapping storage
      const newAddress: SavedAddress = {
        id: backendSyncedAddress?.id ? String(backendSyncedAddress.id) : generateId(),
        label: selectedLabel,
        address: `${pendingSuggestion.title}, ${pendingSuggestion.subtitle}`,
        latitude: pendingSuggestion.latitude,
        longitude: pendingSuggestion.longitude,
        createdAt: Date.now(),
      };

      const updatedList = [...addresses, newAddress];
      await saveAddressesToStorage(updatedList);
      setAddresses(updatedList);
      setPendingSuggestion(null);
      
      toastRef.current?.show({
        message: "Address added successfully",
        type: "success",
        duration: 1800,
      });
    } catch (error: any) {
      toastRef.current?.show({
        message: error.message || "Could not sync address details.",
        type: "error",
      });
    }
  }, [pendingSuggestion, selectedLabel, addresses]);

  const handleRemoveAddress = useCallback(async (id: string) => {
    const updatedList = addresses.filter(item => item.id !== id);
    await saveAddressesToStorage(updatedList);
    setAddresses(updatedList);
  }, [addresses]);

  const handleFinishSetup = useCallback(async () => {
    if (addresses.length === 0) {
      toastRef.current?.show({
        message: "Add at least one delivery address to continue",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      await setRouteSetupComplete(true);
      router.replace("/dashboard");
    } catch (error) {
      console.error(error);
      toastRef.current?.show({
        message: "Failed to complete setup. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [addresses.length]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={Colors.darkText} />
          </Pressable>
          <Text style={styles.headerTitle}>Your route</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.sectionLabel}>Label this address</Text>
        <View style={styles.labelChipsRow}>
          {LABEL_OPTIONS.map((label) => {
            const isSelected = label === selectedLabel;
            return (
              <Pressable
                key={label}
                onPress={() => setSelectedLabel(label)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.searchSection}>
          <SearchLocation
            onSelectSuggestion={handleSelectSuggestion}
            placeholder="Search for an address"
          />
        </View>

        <PrimaryButton
          label="Add Address"
          onPress={handleAddAddress}
          variant="outline"
          style={styles.addButton}
        />

        <Text style={styles.sectionLabel}>
          {addresses.length > 0 ? `Saved addresses (${addresses.length})` : "No addresses added yet"}
        </Text>

        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <LocationCard address={item} onRemove={handleRemoveAddress} />}
          ListEmptyComponent={
            !isLoadingInitial ? (
              <Text style={styles.emptyListText}>Addresses you add will appear here.</Text>
            ) : null
          }
        />

        <PrimaryButton
          label="Finish Setup"
          onPress={handleFinishSetup}
          loading={isSaving}
          style={styles.finishButton}
        />
      </Animated.View>

      <AnimatedToast ref={toastRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.darkText },
  headerSpacer: { width: 24 },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: Colors.grayText, marginBottom: 10, marginTop: 4 },
  labelChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.inputBackground, borderWidth: 1.5, borderColor: Colors.border },
  chipSelected: { backgroundColor: Colors.lightBlue, borderColor: Colors.primaryBlue },
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.grayText },
  chipTextSelected: { color: Colors.primaryBlue },
  searchSection: { marginBottom: 14, zIndex: 10 },
  addButton: { marginBottom: 20 },
  listContent: { paddingBottom: 12 },
  emptyListText: { fontSize: 13, color: Colors.grayText, textAlign: "center", paddingVertical: 16 },
  finishButton: { marginTop: 8, marginBottom: 12 },
});