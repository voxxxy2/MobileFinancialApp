import { create } from 'zustand';
import { getSetting, setSetting } from '../db/queries/settings';

interface SettingsState {
  baseCurrency: string;
  theme: 'dark' | 'light';
  isReady: boolean;

  loadSettings: () => void;
  setBaseCurrency: (currency: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  baseCurrency: 'USD',
  theme: 'dark',
  isReady: false,

  loadSettings: () => {
    const baseCurrency = getSetting('base_currency') ?? 'USD';
    const theme = (getSetting('theme') ?? 'dark') as 'dark' | 'light';
    set({ baseCurrency, theme, isReady: true });
  },

  setBaseCurrency: (currency: string) => {
    setSetting('base_currency', currency);
    set({ baseCurrency: currency });
  },

  setTheme: (theme: 'dark' | 'light') => {
    setSetting('theme', theme);
    set({ theme });
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    setSetting('theme', next);
    set({ theme: next });
  },
}));
