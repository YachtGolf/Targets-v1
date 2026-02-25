
export type TargetColor = 'red' | 'blue' | 'green';

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  email?: string; // For tournament leads
  teamId?: string; // 0=Red, 1=Blue, 2=Green
  score: number;
  hits: number[];
}

export enum GameState {
  MAIN_MENU,
  ADD_PLAYERS,
  CONNECT_TARGETS,
  GAMES_MENU,
  TEAM_SELECTION,
  PLAYING,
  PODIUM
}

export enum GameType {
  TEN_TO_COUNT = 'TEN_TO_COUNT',
  COUNTDOWN_CHAOS = 'COUNTDOWN_CHAOS',
  BATTLESHIPS = 'BATTLESHIPS',
  FIRST_TO_100 = 'FIRST_TO_100',
  CAPTURE_THE_FLAG = 'CAPTURE_THE_FLAG',
  CARIBBEAN_CRUSH = 'CARIBBEAN_CRUSH',
  CARIBBEAN_CRUSH_TEAMS = 'CARIBBEAN_CRUSH_TEAMS',
  ARCTIC_BLAST = 'ARCTIC_BLAST',
  AZALEA_ATTACK = 'AZALEA_ATTACK'
}

export interface Ship {
  id: string;
  type: 'small' | 'medium' | 'large';
  color: TargetColor;
  maxHits: number;
  currentHits: number;
  isSunk: boolean;
}

export interface Fleet {
  playerId: string;
  ships: Ship[];
}
