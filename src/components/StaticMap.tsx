/**
 * StaticMap (fallback re-export for tsc/ESLint/Jest)
 * Metro always prefers .native.tsx or .web.tsx at runtime.
 */
export { StaticMap } from "./StaticMap.native";
export type { StaticMapProps } from "./StaticMap.native";