import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { Colors } from "@/constants/colors";
import { reverseGeocode } from "./../../utils/reverseGeocode";
import { ensureMapLibreReady } from "./../../utils/mapLibreInit";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const FALLBACK_CENTER = { lat: 6.335, lng: 5.6037 }; // Benin City — same fallback used elsewhere in the app

export interface MapLocationPickerResult {
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
}

export function MapLocationPicker({
  visible,
  initialLatitude,
  initialLongitude,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initialLatitude?: number;
  initialLongitude?: number;
  onConfirm: (result: MapLocationPickerResult) => void;
  onClose: () => void;
}) {
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);

  const [center, setCenter] = useState({
    lat: initialLatitude ?? FALLBACK_CENTER.lat,
    lng: initialLongitude ?? FALLBACK_CENTER.lng,
  });
  const [address, setAddress] = useState<{ title: string; subtitle: string } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setNativeAvailable(ensureMapLibreReady());
  }, []);

  // Reset to the initial position each time the picker opens.
  useEffect(() => {
    if (!visible) return;
    setCenter({ lat: initialLatitude ?? FALLBACK_CENTER.lat, lng: initialLongitude ?? FALLBACK_CENTER.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Reverse-geocode whenever the settled center changes. onRegionDidChange
  // (used below) only fires once a pan/zoom gesture actually settles, so
  // this is naturally debounced the same way `moveend` is on the web side.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setGeocoding(true);
    reverseGeocode(center.lat, center.lng).then((result) => {
      if (!cancelled) {
        setAddress(result);
        setGeocoding(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [center.lat, center.lng, visible]);

  const handleRegionDidChange = (feature: GeoJSON.Feature<GeoJSON.Point>) => {
    const [lng, lat] = feature.geometry.coordinates;
    setCenter({ lat, lng });
  };

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const position = await Location.getCurrentPositionAsync({});
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCenter(next);
        cameraRef.current?.setCamera({
          centerCoordinate: [next.lng, next.lat],
          zoomLevel: 16,
          animationDuration: 600,
        });
      }
    } catch (e) {
      // Fall back silently — the driver can still pan manually.
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      title: address?.title ?? "Pinned Location",
      subtitle: address?.subtitle ?? `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`,
      latitude: center.lat,
      longitude: center.lng,
    });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        {nativeAvailable === false ? (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>Map unavailable in this build.</Text>
          </View>
        ) : nativeAvailable === null ? null : (
          <MapLibreGL.MapView
            style={{ flex: 1 }}
            styleURL={STYLE_URL}
            logoEnabled={false}
            attributionEnabled
            onRegionDidChange={handleRegionDidChange}
          >
            <MapLibreGL.Camera
              ref={cameraRef}
              defaultSettings={{
                centerCoordinate: [center.lng, center.lat],
                zoomLevel: 15,
              }}
            />
          </MapLibreGL.MapView>
        )}

        {/* Fixed center pin — the map pans underneath this, so whatever
            sits at screen-center is the picked coordinate. */}
        <View pointerEvents="none" style={styles.pinWrap}>
          <Ionicons name="location" size={40} color={Colors.primaryBlue} />
        </View>

        <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={Colors.darkText} />
        </Pressable>

        <Pressable onPress={handleUseMyLocation} style={styles.locateButton}>
          {locating ? (
            <ActivityIndicator size="small" color={Colors.primaryBlue} />
          ) : (
            <Ionicons name="locate-outline" size={20} color={Colors.primaryBlue} />
          )}
        </Pressable>

        <View style={styles.bottomSheet}>
          <Text style={styles.addressTitle} numberOfLines={1}>
            {geocoding ? "Finding address…" : address?.title ?? "Pinned Location"}
          </Text>
          <Text style={styles.addressSubtitle} numberOfLines={1}>
            {geocoding ? " " : address?.subtitle ?? `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`}
          </Text>
          <Pressable onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Confirm This Location</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  fallbackText: { fontSize: 13, color: Colors.grayText, textAlign: "center" },
  pinWrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40, // tip of the pin lands on the exact center point
  },
  closeButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  locateButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  addressTitle: { fontSize: 15, fontWeight: "700", color: Colors.darkText },
  addressSubtitle: { fontSize: 12.5, color: Colors.grayText, marginTop: 2, marginBottom: 16 },
  confirmButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});