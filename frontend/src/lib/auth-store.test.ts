import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from './auth-store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('auth-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset store state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  });

  it('starts with no user', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('hydrates from localStorage', () => {
    localStorageMock.setItem(
      'nfamily_tokens',
      JSON.stringify({ access_token: 'at-123', refresh_token: 'rt-456' }),
    );
    useAuthStore.getState().hydrate();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('at-123');
    expect(state.refreshToken).toBe('rt-456');
    expect(state.isAuthenticated).toBe(true);
  });

  it('hydrate does nothing without stored tokens', () => {
    useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('login stores tokens and user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            access_token: 'new-at',
            refresh_token: 'new-rt',
            expires_in: 900,
            user: { id: 'u1', email: 'test@test.com', display_name: 'Test', avatar_url: null, app_roles: [], families: [] },
          },
        }),
    });

    await useAuthStore.getState().login('test@test.com', 'password');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('new-at');
    expect(state.user?.email).toBe('test@test.com');
  });

  it('login sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid credentials' } }),
    });

    await expect(useAuthStore.getState().login('bad@test.com', 'wrong')).rejects.toThrow();
    expect(useAuthStore.getState().error).toBe('Invalid credentials');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('logout clears state', async () => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@test.com', display_name: null, avatar_url: null, app_roles: [], families: [] },
      accessToken: 'at',
      refreshToken: 'rt',
      isAuthenticated: true,
    });
    localStorageMock.setItem('nfamily_tokens', JSON.stringify({ access_token: 'at', refresh_token: 'rt' }));

    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorageMock.getItem('nfamily_tokens')).toBeNull();
  });

  it('refreshSession updates tokens', async () => {
    useAuthStore.setState({ refreshToken: 'old-rt', isAuthenticated: true });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { access_token: 'new-at', refresh_token: 'new-rt' } }),
    });

    const success = await useAuthStore.getState().refreshSession();
    expect(success).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('new-at');
    expect(useAuthStore.getState().refreshToken).toBe('new-rt');
  });

  it('refreshSession clears state on failure', async () => {
    useAuthStore.setState({ refreshToken: 'old-rt', isAuthenticated: true });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Token expired' } }),
    });

    const success = await useAuthStore.getState().refreshSession();
    expect(success).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('clearError clears the error', () => {
    useAuthStore.setState({ error: 'some error' });
    useAuthStore.getState().clearError();
    expect(useAuthStore.getState().error).toBeNull();
  });
});
