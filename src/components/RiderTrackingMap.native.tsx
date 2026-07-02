import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export type RiderTrackingMapProps = {
  customerLatitude: number;
  customerLongitude: number;
  riderLatitude: number;
  riderLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
};

function buildLeafletHtml(props: RiderTrackingMapProps): string {
  const {
    customerLatitude,
    customerLongitude,
    riderLatitude,
    riderLongitude,
    destinationLatitude,
    destinationLongitude,
  } = props;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      .rider-icon { font-size: 22px; }
      .customer-icon { font-size: 22px; }
      .destination-icon { font-size: 22px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${riderLatitude}, ${riderLongitude}], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      var customerIcon = L.divIcon({ html: '<div class="customer-icon">\u{1F3E0}</div>', iconSize: [28, 28], className: '' });
      var riderIcon = L.divIcon({ html: '<div class="rider-icon">\u{1F6F5}</div>', iconSize: [28, 28], className: '' });
      var destinationIcon = L.divIcon({ html: '<div class="destination-icon">\u{1F4CD}</div>', iconSize: [28, 28], className: '' });

      L.marker([${customerLatitude}, ${customerLongitude}], { icon: customerIcon }).addTo(map);
      L.marker([${riderLatitude}, ${riderLongitude}], { icon: riderIcon }).addTo(map);
      L.marker([${destinationLatitude}, ${destinationLongitude}], { icon: destinationIcon }).addTo(map);

      L.polyline([
        [${riderLatitude}, ${riderLongitude}],
        [${destinationLatitude}, ${destinationLongitude}]
      ], { color: '#0D4A8C', weight: 4, opacity: 0.85 }).addTo(map);

      var bounds = L.latLngBounds([
        [${customerLatitude}, ${customerLongitude}],
        [${riderLatitude}, ${riderLongitude}],
        [${destinationLatitude}, ${destinationLongitude}]
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });
    </script>
  </body>
</html>
`;
}

export function RiderTrackingMap(props: RiderTrackingMapProps) {
  const html = useMemo(
    () => buildLeafletHtml(props),
    [
      props.customerLatitude,
      props.customerLongitude,
      props.riderLatitude,
      props.riderLongitude,
      props.destinationLatitude,
      props.destinationLongitude,
    ]
  );

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
