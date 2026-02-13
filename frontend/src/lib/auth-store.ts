import { create } from 'zustand';
import { authFetch, ApiError } from './api-client';

interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  app_roles: Array<{ app_key: string; role: string }>;
  families: Array<{ id: string; name: string; role: string }>;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  hydrate: () => void;
}

const TOKEN_KEY = 'nfamily_tokens';

function saveTokens(access: string, refresh: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: access, refresh_token: refresh }));
}

function loadTokens(): { access_token: string; refresh_token: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Global auth store using Zustand.
 * Manages JWT tokens, user profile, login/register/logout/refresh flows.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authFetch<{ data: AuthTokens & { user: AuthUser } }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      const { access_token, refresh_token, user } = data.data;
      saveTokens(access_token, refresh_token);
      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authFetch<{ data: AuthTokens & { user: AuthUser } }>('/auth/register', {
        method: 'POST',
        body: { email, password, display_name: displayName },
      });
      const { access_token, refresh_token, user } = data.data;
      saveTokens(access_token, refresh_token);
      set({
        accessToken: access_token,
        refreshToken: refresh_token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const { accessToken, refreshToken } = get();
    try {
      if (accessToken) {
        await authFetch('/auth/logout', {
          method: 'POST',
          token: accessToken,
          body: { refresh_token: refreshToken },
        });
      }
    } catch {
      // Ignore logout errors — clear local state regardless
    }
    clearTokens();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshSession: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;
    try {
      const data = await authFetch<{ data: AuthTokens }>('/auth/refresh', {
        method: 'POST',
        body: { refresh_token: refreshToken },
      });
      const { access_token, refresh_token } = data.data;
      saveTokens(access_token, refresh_token);
      set({ accessToken: access_token, refreshToken: refresh_token });
      return true;
    } catch {
      clearTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      return false;
    }
  },

  fetchProfile: async () => {
    const { accessToken } = get();
    if (!accessToken) return;
    try {
      const data = await authFetch<{ data: AuthUser }>('/auth/me', { token: accessToken });
      set({ user: data.data });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const refreshed = await get().refreshSession();
        if (refreshed) {
          await get().fetchProfile();
        }
      }
    }
  },

  clearError: () => set({ error: null }),

  hydrate: () => {
    const tokens = loadTokens();
    if (tokens) {
      set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        isAuthenticated: true,
      });
    }
  },
}));
