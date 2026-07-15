import React, { useEffect, useRef } from "react";
import { Appearance } from "react-native";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const STYLE_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const STYLE_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const ROUTE_SOURCE_ID = "rider-tracking-route";
const ROUTE_LAYER_ID = "rider-tracking-route-line";

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
  // destinationLatitude/Longitude and customerLatitude/Longitude are the
  // same point in every call site seen so far — fall back between them
  // so this still works if a caller only ever supplies one pair.
  const destLat = destinationLatitude ?? customerLatitude;
  const destLng = destinationLongitude ?? customerLongitude;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const riderMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isDark = Appearance.getColorScheme() === "dark";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? STYLE_DARK : STYLE_LIGHT,
      center: [riderLongitude, riderLatitude],
      zoom: 13,
      attributionControl: { compact: true },
    });

    map.on("load", () => {
      // Destination / customer marker (static).
      const destEl = document.createElement("div");
      destEl.style.width = "18px";
      destEl.style.height = "18px";
      destEl.style.borderRadius = "9px";
      destEl.style.background = "#D4A64A";
      destEl.style.border = "3px solid #FFFFFF";
      destEl.style.boxShadow = "0 0 0 4px rgba(212,166,74,0.25)";
      new maplibregl.Marker({ element: destEl }).setLngLat([destLng, destLat]).addTo(map);

      // Rider marker (moves as location updates arrive).
      const riderEl = document.createElement("div");
      riderEl.style.width = "18px";
      riderEl.style.height = "18px";
      riderEl.style.borderRadius = "9px";
      riderEl.style.background = "#0D4A8C";
      riderEl.style.border = "3px solid #FFFFFF";
      riderEl.style.boxShadow = "0 0 0 4px rgba(13,74,140,0.25)";
      riderMarkerRef.current = new maplibregl.Marker({ element: riderEl })
        .setLngLat([riderLongitude, riderLatitude])
        .addTo(map);

      // Route line between rider and destination.
      map.addSource(ROUTE_SOURCE_ID, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [riderLongitude, riderLatitude],
              [destLng, destLat],
            ],
          },
        },
      });
      map.addLayer({
        id: ROUTE_LAYER_ID,
        type: "line",
        source: ROUTE_SOURCE_ID,
        paint: {
          "line-color": "#1E5FAF",
          "line-width": 4,
          "line-opacity": 0.85,
          "line-dasharray": [1, 2],
        },
      });

      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([riderLongitude, riderLatitude]);
      bounds.extend([destLng, destLat]);
      map.fitBounds(bounds, { padding: 60, animate: false });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the rider marker + redraw the route line whenever the rider's
  // coordinates update (the parent polls every 4s and re-renders).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !riderMarkerRef.current) return;

    riderMarkerRef.current.setLngLat([riderLongitude, riderLatitude]);
    map.panTo([riderLongitude, riderLatitude], { animate: true, duration: 1000 });

    const source = map.getSource(ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    source?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [
          [riderLongitude, riderLatitude],
          [destLng, destLat],
        ],
      },
    });
  }, [riderLatitude, riderLongitude, destLat, destLng]);

  // Real DOM node — this file only ever runs on web, so a plain div is fine.
  return <div ref={containerRef} style={{ position: "absolute", inset: 0, borderRadius: 16, overflow: "hidden" }} />;
}