// Design tokens — single source of truth for all colors, spacing, typography
export const Colors = {
  // Brand
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',

  // Semantic
  income: '#10B981',
  incomeLight: '#D1FAE5',
  expense: '#F43F5E',
  expenseLight: '#FFE4E6',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Dark theme
  dark: {
    bg: '#0A0F1E',
    surface: '#111827',
    card: '#1F2937',
    cardAlt: '#161D2E',
    border: '#2D3748',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    overlay: 'rgba(0,0,0,0.6)',
  },

  // Light theme
  light: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardAlt: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    overlay: 'rgba(0,0,0,0.4)',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// Chart colors palette
export const ChartColors = [
  '#7C3AED', '#10B981', '#F59E0B', '#3B82F6',
  '#EC4899', '#F97316', '#14B8A6', '#8B5CF6',
  '#EF4444', '#06B6D4', '#84CC16', '#F43F5E',
];
