import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

type AuthContextType = {
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for an existing token on startup (Remember Me functionality)
    async function loadToken() {
      try {
        const storedToken = await SecureStore.getItemAsync('user_session_token');
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (e) {
        console.error("Failed to load session token", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadToken();
  }, []);

  const login = async (newToken: string) => {
    await SecureStore.setItemAsync('user_session_token', newToken);
    setToken(newToken);
    router.replace('/dashboard');
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('user_session_token');
    setToken(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}