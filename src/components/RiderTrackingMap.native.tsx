import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Appearance } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";

MapLibreGL.setAccessToken(null);

const STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export function RiderTrackingMap({
  customerLatitude,
  customerLongitude,
  riderLatitude,
  riderLongitude,
  destinationLatitude,
  destinationLongitude,
}: {
  customerLatitude: number;
  customerLongitude: number;
  riderLatitude: number;
  riderLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
}) {
  const destLat = destinationLatitude ?? customerLatitude;
  const destLng = destinationLongitude ?? customerLongitude;

  const isDark = Appearance.getColorScheme() === "dark";
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const hasFitOnce = useRef(false);

  // Fit both points once on first load; after that, follow the rider as
  // location updates arrive (keeps the destination steady in view).
  useEffect(() => {
    if (!hasFitOnce.current) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [riderLongitude, riderLatitude],
      animationDuration: 1000,
    });
  }, [riderLatitude, riderLongitude]);

  const routeGeoJson = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [riderLongitude, riderLatitude],
        [destLng, destLat],
      ],
    },
  };

  return (
    <MapLibreGL.MapView
      style={styles.map}
      styleURL={isDark ? STYLE_DARK : STYLE_LIGHT}
      logoEnabled={false}
      attributionEnabled
      onDidFinishLoadingMap={() => {
        const ne: [number, number] = [Math.max(riderLongitude, destLng), Math.max(riderLatitude, destLat)];
        const sw: [number, number] = [Math.min(riderLongitude, destLng), Math.min(riderLatitude, destLat)];
        cameraRef.current?.fitBounds(ne, sw, [60, 60, 60, 60], 0);
        hasFitOnce.current = true;
      }}
    >
      <MapLibreGL.Camera
        ref={cameraRef}
        defaultSettings={{ centerCoordinate: [riderLongitude, riderLatitude], zoomLevel: 13 }}
      />

      <MapLibreGL.ShapeSource id="rider-tracking-route" shape={routeGeoJson}>
        <MapLibreGL.LineLayer
          id="rider-tracking-route-line"
          style={{ lineColor: "#1E5FAF", lineWidth: 4, lineOpacity: 0.85, lineDasharray: [1, 2] }}
        />
      </MapLibreGL.ShapeSource>

      <MapLibreGL.MarkerView coordinate={[destLng, destLat]} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.destPin} />
      </MapLibreGL.MarkerView>

      <MapLibreGL.MarkerView coordinate={[riderLongitude, riderLatitude]} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={styles.riderPin} />
      </MapLibreGL.MarkerView>
    </MapLibreGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, borderRadius: 16, overflow: "hidden" },
  riderPin: {
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
  destPin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D4A64A",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#D4A64A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});