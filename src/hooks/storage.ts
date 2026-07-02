/**
 * Local storage service (demo persistence layer).
 *
 * Wraps AsyncStorage with typed read/write helpers for the data this
 * demo needs to survive app restarts: the signed-up user's profile,
 * their saved delivery addresses, and whether they've completed route
 * setup. No backend involved — this is intentionally swappable for a
 * real API client later without touching the screens that call it.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ADDRESS_STORAGE_KEY, SavedAddress } from "@/types/location";

const USER_PROFILE_KEY = "kayora_user_profile";
const ROUTE_SETUP_COMPLETE_KEY = "kayora_route_setup_complete";

export type UserProfile = {
  username: string;
  email: string;
  phone: string;
  /** Local file URI of the picked profile photo, or null if none selected. */
  profileImageUri: string | null;
  createdAt: number;
};

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export async function setRouteSetupComplete(complete: boolean): Promise<void> {
  await AsyncStorage.setItem(ROUTE_SETUP_COMPLETE_KEY, complete ? "true" : "false");
}

export async function isRouteSetupComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ROUTE_SETUP_COMPLETE_KEY);
  return value === "true";
}

export async function getSavedAddresses(): Promise<SavedAddress[]> {
  const raw = await AsyncStorage.getItem(ADDRESS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedAddress[]) : [];
  } catch {
    return [];
  }
}

export async function saveAddresses(addresses: SavedAddress[]): Promise<void> {
  await AsyncStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addresses));
}

export async function addAddress(address: SavedAddress): Promise<SavedAddress[]> {
  const existing = await getSavedAddresses();
  const updated = [...existing, address];
  await saveAddresses(updated);
  return updated;
}

export async function removeAddress(id: string): Promise<SavedAddress[]> {
  const existing = await getSavedAddresses();
  const updated = existing.filter((item) => item.id !== id);
  await saveAddresses(updated);
  return updated;
}
