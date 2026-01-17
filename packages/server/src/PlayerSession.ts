import type { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type {
  ClientMessage,
  ServerMessage,
  WelcomeMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  ServerFullMessage,
} from '@kids-game/shared';
import { GameState } from './GameState';

export class PlayerSession {
  readonly id: string;
  private ws: WebSocket;
  private gameState: GameState;
  private broadcast: (message: ServerMessage, excludeId?: string) => void;
  private onDisconnect: (id: string) => void;
  private name: string = 'Player';
  private joined: boolean = false;

  constructor(
    ws: WebSocket,
    gameState: GameState,
    broadcast: (message: ServerMessage, excludeId?: string) => void,
    onDisconnect: (id: string) => void
  ) {
    this.id = uuidv4();
    this.ws = ws;
    this.gameState = gameState;
    this.broadcast = broadcast;
    this.onDisconnect = onDisconnect;

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        this.handleMessage(message);
      } catch (err) {
        console.error(`[${this.id}] Invalid message:`, err);
      }
    });

    this.ws.on('close', () => {
      this.handleDisconnect();
    });

    this.ws.on('error', (err) => {
      console.error(`[${this.id}] WebSocket error:`, err);
    });
  }

  private handleMessage(message: ClientMessage): void {
    switch (message.type) {
      case 'join':
        this.handleJoin(message.name);
        break;
      case 'position':
        if (this.joined) {
          this.gameState.updatePosition(
            this.id,
            message.x,
            message.y,
            message.z,
            message.rotationY,
            message.state
          );
        }
        break;
      case 'swing':
        if (this.joined) {
          this.gameState.updateSwing(this.id, message.active, message.attachPoint);
        }
        break;
    }
  }

  private handleJoin(name: string): void {
    if (this.joined) return;

    if (!this.gameState.canJoin()) {
      this.send({ type: 'server_full' } as ServerFullMessage);
      this.ws.close();
      return;
    }

    this.name = name || `Player ${this.id.slice(0, 4)}`;
    this.gameState.addPlayer(this.id, this.name);
    this.joined = true;

    console.log(`[${this.id}] ${this.name} joined (${this.gameState.playerCount} players)`);

    // Send welcome message with current players
    const welcome: WelcomeMessage = {
      type: 'welcome',
      yourId: this.id,
      players: this.gameState.getPlayerList().filter(p => p.id !== this.id),
    };
    this.send(welcome);

    // Notify other players
    const joinMsg: PlayerJoinedMessage = {
      type: 'player_joined',
      id: this.id,
      name: this.name,
    };
    this.broadcast(joinMsg, this.id);
  }

  private handleDisconnect(): void {
    if (this.joined) {
      console.log(`[${this.id}] ${this.name} disconnected (${this.gameState.playerCount - 1} players)`);

      this.gameState.removePlayer(this.id);

      // Notify other players
      const leftMsg: PlayerLeftMessage = {
        type: 'player_left',
        id: this.id,
      };
      this.broadcast(leftMsg, this.id);
    }

    this.onDisconnect(this.id);
  }

  send(message: ServerMessage): void {
    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  get isJoined(): boolean {
    return this.joined;
  }
}
