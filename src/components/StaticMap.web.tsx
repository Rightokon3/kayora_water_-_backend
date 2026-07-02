/**
 * StaticMap (web)
 * Securely lazy-loads Leaflet only in the browser to prevent SSR errors.
 */
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text } from "react-native";

export type StaticMapProps = {
  latitude: number;
  longitude: number;
  markerLabel: string;
  zoom?: number;
};

export function StaticMap({ latitude, longitude, markerLabel, zoom = 15 }: StaticMapProps) {
  const [MapComponents, setMapComponents] = useState<any>(null);

useEffect(() => {
    // Dynamically import the JS libraries first
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]).then(async ([ReactLeaflet, Leaflet]) => {
      // Safely load the static CSS file separately without inline casting
      await import("leaflet/dist/leaflet.css");

      const L = Leaflet.default;

      // Define the icon inside the browser-only context
      const pinIcon = L.divIcon({
        html: "<div style='font-size:28px;line-height:1'>📍</div>",
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      // Save components and configured icon to state
      setMapComponents({
        MapContainer: ReactLeaflet.MapContainer,
        TileLayer: ReactLeaflet.TileLayer,
        Marker: ReactLeaflet.Marker,
        Popup: ReactLeaflet.Popup,
        pinIcon,
      });
    }).catch(err => {
      console.error("Failed to load Leaflet map packages:", err);
    });
  }, []);

  // While loading on the client or rendering on the server, show a fallback UI
  if (!MapComponents) {
    return (
      <View style={[styles.container, styles.fallback]}>
        <Text style={styles.fallbackText}>Loading Map...</Text>
      </View>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, pinIcon } = MapComponents;

  return (
    <View style={styles.container}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[latitude, longitude]} icon={pinIcon}>
          <Popup>{markerLabel}</Popup>
        </Marker>
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: "100%", overflow: "hidden" },
  fallback: {
    backgroundColor: "#F2F2F7",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#8E8E93",
    fontSize: 14,
    fontWeight: "600",
  },
});