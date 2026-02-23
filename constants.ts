
import { TargetColor } from './types';

// Exported separately to resolve import error in HarbourHeist.tsx
export const TEAM_COLORS = [
  '#00A49E', // Turquoise
  '#C09941', // Ochre
  '#1F2E50', // Midnight
  '#3C3C3C', // Graphite
  '#8BABA9', // Steel
  '#E11D48'  // Crimson
];

export const COLORS = {
  background: '#DEE1DA',
  accent: '#00A49E',
  graphite: '#3C3C3C',
  white: '#FFFFFF',
  red: '#E11D48',
  blue: '#2563EB',
  green: '#059669',
  teams: TEAM_COLORS
};

export const TARGET_CONFIG: Record<TargetColor, { points: number; label: string }> = {
  red: { points: 50, label: 'Small' },
  blue: { points: 25, label: 'Medium' },
  green: { points: 10, label: 'Large' }
};

export const MAX_PLAYERS = 12;