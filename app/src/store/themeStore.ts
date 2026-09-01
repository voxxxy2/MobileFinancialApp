import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',

  loadTheme: async () => {
    const saved = await AsyncStorage.getItem('fintrack_theme');
    if (saved === 'light' || saved === 'dark') set({ theme: saved });
  },

  toggleTheme: async () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    await AsyncStorage.setItem('fintrack_theme', next);
  },

  setTheme: async (t) => {
    set({ theme: t });
    await AsyncStorage.setItem('fintrack_theme', t);
  },
}));
