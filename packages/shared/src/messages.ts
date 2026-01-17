import type { PlayerData, PlayerState, Vector3 } from './types';

// ============================================
// Client -> Server Messages
// ============================================

export interface JoinMessage {
  type: 'join';
  name: string;
}

export interface PositionUpdate {
  type: 'position';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  state: PlayerState;
}

export interface SwingUpdate {
  type: 'swing';
  active: boolean;
  attachPoint?: Vector3;
}

export type ClientMessage = JoinMessage | PositionUpdate | SwingUpdate;

// ============================================
// Server -> Client Messages
// ============================================

export interface WelcomeMessage {
  type: 'welcome';
  yourId: string;
  players: Array<{ id: string; name: string }>;
}

export interface PlayerJoinedMessage {
  type: 'player_joined';
  id: string;
  name: string;
}

export interface PlayerLeftMessage {
  type: 'player_left';
  id: string;
}

export interface GameStateMessage {
  type: 'state';
  players: PlayerData[];
}

export interface ServerFullMessage {
  type: 'server_full';
}

export type ServerMessage =
  | WelcomeMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStateMessage
  | ServerFullMessage;
