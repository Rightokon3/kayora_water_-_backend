import React, { useEffect, useState } from "react";
import { View } from "react-native";

export type RiderTrackingMapProps = {
  customerLatitude: number;
  customerLongitude: number;
  riderLatitude: number;
  riderLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
};

export function RiderTrackingMap(props: RiderTrackingMapProps) {
  const [Map, setMap] = useState<any>(null);

  useEffect(() => {
    async function load() {
      await import("leaflet/dist/leaflet.css");

      const ReactLeaflet = await import("react-leaflet");
      const L = await import("leaflet");

      const customerIcon = L.default.divIcon({
        html: "<div style='font-size:22px'>🏠</div>",
        className: "",
      });

      const riderIcon = L.default.divIcon({
        html: "<div style='font-size:22px'>🛵</div>",
        className: "",
      });

      const destinationIcon = L.default.divIcon({
        html: "<div style='font-size:22px'>📍</div>",
        className: "",
      });

      setMap({
        ...ReactLeaflet,
        customerIcon,
        riderIcon,
        destinationIcon,
      });
    }

    load();
  }, []);

  if (!Map) {
    return <View style={{ flex: 1 }} />;
  }

  const {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
  } = Map;

  return (
    <MapContainer
      center={[props.riderLatitude, props.riderLongitude]}
      zoom={14}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      <Marker
        position={[props.customerLatitude, props.customerLongitude]}
        icon={Map.customerIcon}
      />

      <Marker
        position={[props.riderLatitude, props.riderLongitude]}
        icon={Map.riderIcon}
      />

      <Marker
        position={[props.destinationLatitude, props.destinationLongitude]}
        icon={Map.destinationIcon}
      />

      <Polyline
        positions={[
          [props.riderLatitude, props.riderLongitude],
          [props.destinationLatitude, props.destinationLongitude],
        ]}
      />
    </MapContainer>
  );
}