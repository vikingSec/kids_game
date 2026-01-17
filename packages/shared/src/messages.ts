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

export interface SettingsUpdate {
  type: 'settings';
  name?: string; // Optional new name
  color?: string; // Optional new color (hex)
}

// WebRTC signaling messages
export interface RTCOfferMessage {
  type: 'rtc_offer';
  targetId: string;
  offer: RTCSessionDescriptionInit;
}

export interface RTCAnswerMessage {
  type: 'rtc_answer';
  targetId: string;
  answer: RTCSessionDescriptionInit;
}

export interface RTCIceCandidateMessage {
  type: 'rtc_ice';
  targetId: string;
  candidate: RTCIceCandidateInit;
}

export type ClientMessage =
  | JoinMessage
  | PositionUpdate
  | SwingUpdate
  | SettingsUpdate
  | RTCOfferMessage
  | RTCAnswerMessage
  | RTCIceCandidateMessage;

// ============================================
// Server -> Client Messages
// ============================================

export interface WelcomeMessage {
  type: 'welcome';
  yourId: string;
  players: Array<{ id: string; name: string; color: string }>;
}

export interface PlayerJoinedMessage {
  type: 'player_joined';
  id: string;
  name: string;
  color: string;
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

// Relayed WebRTC signaling messages (from another player)
export interface RTCOfferRelayMessage {
  type: 'rtc_offer';
  fromId: string;
  offer: RTCSessionDescriptionInit;
}

export interface RTCAnswerRelayMessage {
  type: 'rtc_answer';
  fromId: string;
  answer: RTCSessionDescriptionInit;
}

export interface RTCIceCandidateRelayMessage {
  type: 'rtc_ice';
  fromId: string;
  candidate: RTCIceCandidateInit;
}

export type ServerMessage =
  | WelcomeMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStateMessage
  | ServerFullMessage
  | RTCOfferRelayMessage
  | RTCAnswerRelayMessage
  | RTCIceCandidateRelayMessage;
