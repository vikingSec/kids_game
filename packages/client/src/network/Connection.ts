import type {
  ClientMessage,
  ServerMessage,
  PlayerData,
  PlayerState,
  Vector3,
  JoinMessage,
  PositionUpdate,
  SwingUpdate,
  SettingsUpdate,
} from '@kids-game/shared';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'full';

export interface ConnectionEvents {
  onStatusChange: (status: ConnectionStatus) => void;
  onWelcome: (yourId: string, existingPlayers: Array<{ id: string; name: string; color: string }>) => void;
  onPlayerJoined: (id: string, name: string, color: string) => void;
  onPlayerLeft: (id: string) => void;
  onGameState: (players: PlayerData[]) => void;
}

export class Connection {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private events: ConnectionEvents;
  private reconnectTimer: number | null = null;
  private serverUrl: string;
  private myId: string | null = null;

  constructor(serverUrl: string, events: ConnectionEvents) {
    this.serverUrl = serverUrl;
    this.events = events;
  }

  connect(playerName: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('[Network] Connected to server');
        // Send join message
        const joinMsg: JoinMessage = {
          type: 'join',
          name: playerName,
        };
        this.send(joinMsg);
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          this.handleMessage(message);
        } catch (err) {
          console.error('[Network] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[Network] Disconnected');
        this.setStatus('disconnected');
        this.myId = null;
        this.scheduleReconnect(playerName);
      };

      this.ws.onerror = (err) => {
        console.error('[Network] WebSocket error:', err);
      };
    } catch (err) {
      console.error('[Network] Failed to connect:', err);
      this.setStatus('disconnected');
      this.scheduleReconnect(playerName);
    }
  }

  private handleMessage(message: ServerMessage): void {
    switch (message.type) {
      case 'welcome':
        this.myId = message.yourId;
        this.setStatus('connected');
        this.events.onWelcome(message.yourId, message.players);
        break;

      case 'player_joined':
        this.events.onPlayerJoined(message.id, message.name, message.color);
        break;

      case 'player_left':
        this.events.onPlayerLeft(message.id);
        break;

      case 'state':
        // Filter out our own player from state updates
        const otherPlayers = message.players.filter((p: PlayerData) => p.id !== this.myId);
        this.events.onGameState(otherPlayers);
        break;

      case 'server_full':
        console.log('[Network] Server is full!');
        this.setStatus('full');
        break;
    }
  }

  private scheduleReconnect(playerName: string): void {
    if (this.reconnectTimer !== null) return;

    console.log('[Network] Reconnecting in 3 seconds...');
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(playerName);
    }, 3000);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.events.onStatusChange(status);
    }
  }

  private send(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Send position update to server
  sendPosition(x: number, y: number, z: number, rotationY: number, state: PlayerState): void {
    const msg: PositionUpdate = {
      type: 'position',
      x,
      y,
      z,
      rotationY,
      state,
    };
    this.send(msg);
  }

  // Send swing state update
  sendSwing(active: boolean, attachPoint?: Vector3): void {
    const msg: SwingUpdate = {
      type: 'swing',
      active,
      attachPoint,
    };
    this.send(msg);
  }

  // Send settings update (name, color)
  sendSettings(name?: string, color?: string): void {
    const msg: SettingsUpdate = {
      type: 'settings',
      name,
      color,
    };
    this.send(msg);
  }

  disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.myId = null;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getMyId(): string | null {
    return this.myId;
  }
}
