import { describe, it, expect, beforeEach } from 'vitest';
import { useFamilyStore } from './family-store';

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

describe('family-store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useFamilyStore.setState({ activeFamilyId: null });
  });

  it('starts with null family ID', () => {
    expect(useFamilyStore.getState().activeFamilyId).toBeNull();
  });

  it('sets active family ID', () => {
    useFamilyStore.getState().setActiveFamilyId('family-1');
    expect(useFamilyStore.getState().activeFamilyId).toBe('family-1');
    expect(localStorageMock.getItem('nfamily_active_family')).toBe('family-1');
  });

  it('clears active family ID', () => {
    useFamilyStore.getState().setActiveFamilyId('family-1');
    useFamilyStore.getState().setActiveFamilyId(null);
    expect(useFamilyStore.getState().activeFamilyId).toBeNull();
    expect(localStorageMock.getItem('nfamily_active_family')).toBeNull();
  });
});
