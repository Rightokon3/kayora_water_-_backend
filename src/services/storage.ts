import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";


export interface UserProfile {
  token: string;
  username: string;
  email: string;
  profileImageUri: string | null;
}

const PROFILE_KEY = "user_profile";
const ADDRESSES_KEY = "saved_addresses";
const ROUTE_SETUP_KEY = "route_setup_complete";

/* ==========================================
   USER PROFILE STORAGE FUNCTIONS
   ========================================== */

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } else {
    await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
  }
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    if (Platform.OS === "web") {
      const data = localStorage.getItem(PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    } else {
      const data = await SecureStore.getItemAsync(PROFILE_KEY);
      return data ? JSON.parse(data) : null;
    }
  } catch (error) {
    console.error("Storage read error:", error);
    return null;
  }
}

export async function clearUserProfile(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(PROFILE_KEY);
  } else {
    await SecureStore.deleteItemAsync(PROFILE_KEY);
  }
}

/* ==========================================
   ADDRESS STORAGE FUNCTIONS (Added for Route Setup)
   ========================================== */

// 1. Fetch saved addresses
export async function getSavedAddresses(): Promise<any[]> {
  try {
    if (Platform.OS === "web") {
      const data = localStorage.getItem(ADDRESSES_KEY);
      return data ? JSON.parse(data) : [];
    } else {
      const data = await SecureStore.getItemAsync(ADDRESSES_KEY);
      return data ? JSON.parse(data) : [];
    }
  } catch (error) {
    console.error("Failed to read addresses:", error);
    return [];
  }
}

// 2. Save complete list of addresses 
export async function saveAddressesToStorage(addresses: any[]): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
    } else {
      await SecureStore.setItemAsync(ADDRESSES_KEY, JSON.stringify(addresses));
    }
  } catch (error) {
    console.error("Failed to write addresses:", error);
  }
}

// 3. Mark Route Setup phase as finished
export async function setRouteSetupComplete(complete: boolean): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(ROUTE_SETUP_KEY, String(complete));
    } else {
      await SecureStore.setItemAsync(ROUTE_SETUP_KEY, String(complete));
    }
  } catch (error) {
    console.error("Failed to save route complete state:", error);
  }
}


const CART_KEY = "kayora_cart";

/* ==========================================
   CART LOCAL STORAGE UTILITIES
   ========================================== */

/**
 * Persists an item addition locally to sync up with database states.
 */
export async function addToCart(productId: number, quantity: number = 1): Promise<void> {
  try {
    let currentCart: any[] = [];
    
    // Read existing cart
    if (Platform.OS === "web") {
      const raw = localStorage.getItem(CART_KEY);
      currentCart = raw ? JSON.parse(raw) : [];
    } else {
      const raw = await SecureStore.getItemAsync(CART_KEY);
      currentCart = raw ? JSON.parse(raw) : [];
    }

    // Check if product exists to increment, or push a simplified reference tracking object
    const index = currentCart.findIndex((item: any) => item.id === productId);
    if (index >= 0) {
      currentCart[index].quantity += quantity;
    } else {
      currentCart.push({ id: productId, quantity });
    }

    // Save back to storage
    if (Platform.OS === "web") {
      localStorage.setItem(CART_KEY, JSON.stringify(currentCart));
    } else {
      await SecureStore.setItemAsync(CART_KEY, JSON.stringify(currentCart));
    }
  } catch (error) {
    console.error("Failed to add item to local storage:", error);
  }
}
