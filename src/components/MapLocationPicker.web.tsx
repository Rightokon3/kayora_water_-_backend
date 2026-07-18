import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Colors } from "@/constants/colors";
import { reverseGeocode } from "./../../utils/reverseGeocode";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  const [center, setCenter] = useState({
    lat: initialLatitude ?? FALLBACK_CENTER.lat,
    lng: initialLongitude ?? FALLBACK_CENTER.lng,
  });
  const [address, setAddress] = useState<{ title: string; subtitle: string } | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!visible || !containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [center.lng, center.lat],
      zoom: 15,
      attributionControl: { compact: true },
    });

    const handleMoveEnd = () => {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
    };
    map.on("moveend", handleMoveEnd);
    map.on("load", handleMoveEnd);

    mapRef.current = map;

    return () => {
      map.off("moveend", handleMoveEnd);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Reverse-geocode whenever the settled center changes (moveend already
  // debounces this naturally — it only fires once the pan/zoom stops).
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

  const handleUseMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const position = await Location.getCurrentPositionAsync({});
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCenter(next);
        mapRef.current?.flyTo({ center: [next.lng, next.lat], zoom: 16 });
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
        {/* Real DOM node — this file only ever runs on web, so a plain div is fine. */}
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

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