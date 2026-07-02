/**
 * StaticMap (native: iOS / Android)
 * Shows a fixed Leaflet map with a single marker.
 * Uses the same WebView+HTML approach as RiderTrackingMap.native.tsx.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export type StaticMapProps = {
  latitude: number;
  longitude: number;
  markerLabel: string;
  zoom?: number;
};

function buildHtml(props: StaticMapProps): string {
  const { latitude, longitude, markerLabel, zoom = 15 } = props;
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var map = L.map('map', { zoomControl: false, attributionControl: false })
        .setView([${latitude}, ${longitude}], ${zoom});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.marker([${latitude}, ${longitude}])
        .addTo(map)
        .bindPopup(${JSON.stringify(markerLabel)})
        .openPopup();
    </script>
  </body>
</html>
`;
}

export function StaticMap(props: StaticMapProps) {
  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: buildHtml(props) }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", height: "100%", overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "transparent" },
});