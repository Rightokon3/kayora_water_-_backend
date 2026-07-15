import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Appearance } from "react-native";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isDark = Appearance.getColorScheme() === "dark";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? STYLE_DARK : STYLE_LIGHT,
      center: [longitude, latitude],
      zoom,
      attributionControl: { compact: true },
      interactive: false, // preview only — "Open in Google Maps" handles navigation
    });

    map.on("load", () => {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";

      if (markerLabel) {
        const label = document.createElement("div");
        label.textContent = markerLabel;
        label.style.cssText =
          "background:#0D4A8C;color:#fff;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;margin-bottom:4px;box-shadow:0 2px 6px rgba(0,0,0,0.2);";
        wrapper.appendChild(label);
      }

      const pin = document.createElement("div");
      pin.style.width = "18px";
      pin.style.height = "18px";
      pin.style.borderRadius = "9px";
      pin.style.background = "#0D4A8C";
      pin.style.border = "3px solid #FFFFFF";
      pin.style.boxShadow = "0 0 0 4px rgba(13,74,140,0.25)";
      wrapper.appendChild(pin);

      new maplibregl.Marker({ element: wrapper, anchor: "bottom" }).setLngLat([longitude, latitude]).addTo(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real DOM node — this file only ever runs on web, so a plain div is fine.
  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}