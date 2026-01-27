import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface GlobalState {
  // --- Auth Slice ---
  session: Session | null;
  user: User | null;
  region: string | null;
  isAuthenticated: () => boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setRegion: (region: string) => void;
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  session: null,
  user: null,
  region: null,
  isAuthenticated: () => !!get().session?.user,
  setSession: (session) => set({ session, user: session?.user || null }),
  setUser: (user) => set({ user }),
  setRegion: (region) => set({ region }),
}));
