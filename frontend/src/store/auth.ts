import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  address: string | null;
  setAuth: (token: string, address: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      address: null,
      setAuth: (token, address) => set({ token, address }),
      logout: () => set({ token: null, address: null }),
    }),
    { name: 'cercle-auth' }
  )
);
