import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useAuthStore = create()(persist((set) => ({
    token: null,
    address: null,
    setAuth: (token, address) => set({ token, address }),
    logout: () => set({ token: null, address: null }),
}), { name: 'cercle-auth' }));
