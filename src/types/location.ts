/**
 * Shared types for the delivery-address / route-setup feature.
 * Used by routeSetup.tsx, LocationCard.tsx, and SearchLocation.tsx so
 * all three agree on one shape instead of each re-declaring it.
 */

/** Preset label types shown as quick-pick chips, plus a free-form custom option. */
export type AddressLabelType =
  | "Home"
  | "Work"
  | "School"
  | "Parents"
  | "Shop"
  | "Custom";

export type SavedAddress = {
  id: string;
  label: AddressLabelType;
  /** User-provided name when label === "Custom", e.g. "Aunt Ngozi's House". */
  customLabel?: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: number;
};

/** A single suggestion row returned by the address-search provider. */
export type AddressSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  latitude: number;
  longitude: number;
};

export const ADDRESS_STORAGE_KEY = "kayora_saved_addresses";
