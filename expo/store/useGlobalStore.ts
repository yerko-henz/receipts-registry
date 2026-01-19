import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface GlobalState {
  // --- Auth Slice ---
  session: Session | null;
  user: User | null;
  isAuthenticated: () => boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  session: null,
  user: null,
  isAuthenticated: () => !!get().session?.user,
  setSession: (session) => set({ session, user: session?.user || null }),
  setUser: (user) => set({ user }),
}));
