import React from "react";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { Colors } from "../../constants/theme";

type FeatureIconProps = {
  name: string;
  size?: number;
  color?: string;
};

export function FeatureIcon({ name, size = 20, color = Colors.primary }: FeatureIconProps) {
  switch (name) {
    case "check":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M5 13l4 4L19 7"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "filter":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 5h16M7 12h10M10 19h4"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 11.5L12 4l8 7.5M6 10v9h12v-9"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "truck":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 7h11v8H3V7zM14 11h4l3 3v1h-7v-4z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <Circle cx="7" cy="18" r="1.6" fill={color} />
          <Circle cx="17" cy="18" r="1.6" fill={color} />
        </Svg>
      );
    case "drop":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3C12 3 18 11 18 15a6 6 0 11-12 0c0-4 6-12 6-12z"
            stroke={color}
            strokeWidth={2.1}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "star":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6L12 3z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "price":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Line x1="12" y1="3" x2="12" y2="21" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path
            d="M16 7.5c0-1.4-1.8-2.5-4-2.5s-4 1.1-4 2.5 1.8 2.2 4 2.7c2.2.5 4 1.3 4 2.8s-1.8 2.5-4 2.5-4-1.1-4-2.5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "heart":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 20s-7-4.4-9.5-8.8C.8 8 2.4 4.8 5.6 4.2c2-.4 3.7.5 4.4 2 .7-1.5 2.4-2.4 4.4-2 3.2.6 4.8 3.8 3.1 7-2.5 4.4-9.5 8.8-9.5 8.8z"
            stroke={color}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
        </Svg>
      );
  }
}
