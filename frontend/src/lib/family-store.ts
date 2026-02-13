import { create } from 'zustand';

interface FamilyStoreState {
  activeFamilyId: string | null;
  setActiveFamilyId: (id: string | null) => void;
}

const FAMILY_KEY = 'nfamily_active_family';

/**
 * Global store for the currently active family context.
 */
export const useFamilyStore = create<FamilyStoreState>((set) => ({
  activeFamilyId:
    typeof window !== 'undefined' ? localStorage.getItem(FAMILY_KEY) : null,

  setActiveFamilyId: (id: string | null) => {
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(FAMILY_KEY, id);
      } else {
        localStorage.removeItem(FAMILY_KEY);
      }
    }
    set({ activeFamilyId: id });
  },
}));
