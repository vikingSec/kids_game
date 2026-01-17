import type { PlayerData, PlayerState, Vector3 } from '@kids-game/shared';

interface PlayerSession {
  id: string;
  name: string;
  color: string;
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

  // Generate a random vibrant color for new players
  private generateRandomColor(): string {
    const colors = [
      '#ff4444', // Red
      '#44ff44', // Green
      '#4444ff', // Blue
      '#ffff44', // Yellow
      '#ff44ff', // Magenta
      '#44ffff', // Cyan
      '#ff8800', // Orange
      '#8844ff', // Purple
      '#ff4488', // Pink
      '#44ff88', // Mint
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Add a new player
  addPlayer(id: string, name: string): PlayerSession {
    const player: PlayerSession = {
      id,
      name,
      color: this.generateRandomColor(),
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

  // Get all connected player IDs, names, and colors
  getPlayerList(): Array<{ id: string; name: string; color: string }> {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
    }));
  }

  // Update player settings (name, color)
  updateSettings(id: string, name?: string, color?: string): void {
    const player = this.players.get(id);
    if (player) {
      if (name !== undefined && name.length > 0 && name.length <= 20) {
        player.name = name;
      }
      if (color !== undefined && /^#[0-9a-fA-F]{6}$/.test(color)) {
        player.color = color;
      }
      player.lastUpdate = Date.now();
    }
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
      color: p.color,
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
