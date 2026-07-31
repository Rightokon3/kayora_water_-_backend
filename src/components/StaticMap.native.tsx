import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Appearance } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { ensureMapLibreReady } from "../../utils/mapLibreInit";

const STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function StaticMap({
  latitude,
  longitude,
  markerLabel,
  zoom = 15,
}: {
  latitude: number;
  longitude: number;
  markerLabel?: string;
  zoom?: number;
}) {
  const isDark = Appearance.getColorScheme() === "dark";
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setNativeAvailable(ensureMapLibreReady());
  }, []);

  if (nativeAvailable === null) return null;
  if (nativeAvailable === false) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Map unavailable in this build.</Text>
      </View>
    );
  }

  return (
    <MapLibreGL.MapView
      style={styles.map}
      styleURL={isDark ? STYLE_DARK : STYLE_LIGHT}
      logoEnabled={false}
      attributionEnabled
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <MapLibreGL.Camera
        defaultSettings={{
          centerCoordinate: [longitude, latitude],
          zoomLevel: zoom,
        }}
      />
      <MapLibreGL.MarkerView coordinate={[longitude, latitude]} anchor={{ x: 0.5, y: 1 }}>
        <View style={styles.pinWrap}>
          {markerLabel && (
            <View style={styles.labelBubble}>
              <Text style={styles.labelText} numberOfLines={1}>
                {markerLabel}
              </Text>
            </View>
          )}
          <View style={styles.pin} />
        </View>
      </MapLibreGL.MarkerView>
    </MapLibreGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  fallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  fallbackText: { fontSize: 13, color: "#6B7280", textAlign: "center" },
  pinWrap: { alignItems: "center" },
  labelBubble: {
    backgroundColor: "#0D4A8C",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  labelText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  pin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0D4A8C",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#0D4A8C",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});