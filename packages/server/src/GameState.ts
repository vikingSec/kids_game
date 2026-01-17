import type { PlayerData, PlayerState, Vector3 } from '@kids-game/shared';

interface PlayerSession {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  state: PlayerState;
  swingAttachPoint?: Vector3;
  lastUpdate: number;
}

export class GameState {
  private players: Map<string, PlayerSession> = new Map();
  private readonly MAX_PLAYERS = 5;

  // Check if server can accept new players
  canJoin(): boolean {
    return this.players.size < this.MAX_PLAYERS;
  }

  // Add a new player
  addPlayer(id: string, name: string): PlayerSession {
    const player: PlayerSession = {
      id,
      name,
      x: 0,
      y: 1,
      z: 0,
      rotationY: 0,
      state: 'idle',
      lastUpdate: Date.now(),
    };
    this.players.set(id, player);
    return player;
  }

  // Remove a player
  removePlayer(id: string): boolean {
    return this.players.delete(id);
  }

  // Get a player by ID
  getPlayer(id: string): PlayerSession | undefined {
    return this.players.get(id);
  }

  // Get all connected player IDs and names
  getPlayerList(): Array<{ id: string; name: string }> {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
    }));
  }

  // Update player position
  updatePosition(
    id: string,
    x: number,
    y: number,
    z: number,
    rotationY: number,
    state: PlayerState
  ): void {
    const player = this.players.get(id);
    if (player) {
      player.x = x;
      player.y = y;
      player.z = z;
      player.rotationY = rotationY;
      player.state = state;
      player.lastUpdate = Date.now();
    }
  }

  // Update player swing state
  updateSwing(id: string, active: boolean, attachPoint?: Vector3): void {
    const player = this.players.get(id);
    if (player) {
      player.state = active ? 'swinging' : 'idle';
      player.swingAttachPoint = active ? attachPoint : undefined;
      player.lastUpdate = Date.now();
    }
  }

  // Get all player data for state broadcast
  getAllPlayerData(): PlayerData[] {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      x: p.x,
      y: p.y,
      z: p.z,
      rotationY: p.rotationY,
      state: p.state,
      swingAttachPoint: p.swingAttachPoint,
    }));
  }

  // Get player count
  get playerCount(): number {
    return this.players.size;
  }
}
