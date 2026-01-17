// Player state for network sync
export type PlayerState = 'idle' | 'walking' | 'running' | 'swinging';

// 3D position
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Player data sent in state updates
export interface PlayerData {
  id: string;
  name: string;
  color: string; // Hex color like "#ff0000"
  x: number;
  y: number;
  z: number;
  rotationY: number;
  state: PlayerState;
  swingAttachPoint?: Vector3;
}
