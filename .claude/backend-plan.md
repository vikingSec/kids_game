# Backend Implementation Plan

This document is a standalone plan for building the multiplayer game server. You can work on this independently of the frontend.

## Project Context

**Game:** Robot Spiderman - a multiplayer third-person game where players swing through a techno-jungle
**Repo:** https://github.com/vikingSec/kids_game
**Your Focus:** Build the Node.js WebSocket server in `packages/server/`

## Requirements

- WebSocket server for real-time multiplayer
- Maximum 5 concurrent players
- Local network only (no authentication, no security hardening needed)
- Server tick rate: 20Hz (broadcast state every 50ms)
- TypeScript with strict mode

## Workflow

For each task:
1. Create a GitHub issue using `gh issue create`
2. Create a feature branch: `feature/issue-{number}-{short-description}`
3. Implement the feature
4. Create a PR using `gh pr create`
5. The human will review and merge

## Dependencies to Use

```json
{
  "dependencies": {
    "ws": "^8.x",
    "express": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x",
    "@types/node": "^20.x",
    "@types/ws": "^8.x",
    "@types/express": "^4.x"
  }
}
```

## File Structure to Create

```
packages/server/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # Entry point - starts the server
    ├── Server.ts         # WebSocket server class
    ├── GameState.ts      # Manages all players and game state
    ├── Player.ts         # Individual player session
    └── messages/
        ├── types.ts      # Message type definitions
        └── handlers.ts   # Message handler functions
```

Also create shared types in:
```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── types.ts          # Shared type definitions
    └── messages.ts       # Message type definitions used by client AND server
```

## Message Protocol

### Client → Server Messages

```typescript
// Player wants to join the game
interface JoinMessage {
  type: 'join';
  name: string;  // Player display name
}

// Player position update (client sends ~20/sec)
interface PositionUpdate {
  type: 'position';
  x: number;
  y: number;
  z: number;
  rotationY: number;  // Facing direction
  state: 'idle' | 'walking' | 'running' | 'swinging';
}

// Player starts or stops web swinging
interface SwingUpdate {
  type: 'swing';
  active: boolean;
  attachPoint?: { x: number; y: number; z: number };  // Where web is attached
}
```

### Server → Client Messages

```typescript
// Sent when any player joins
interface PlayerJoined {
  type: 'player_joined';
  id: string;
  name: string;
}

// Sent when any player leaves
interface PlayerLeft {
  type: 'player_left';
  id: string;
}

// Full game state broadcast (sent at 20Hz)
interface GameStateUpdate {
  type: 'state';
  players: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    state: 'idle' | 'walking' | 'running' | 'swinging';
    swingAttachPoint?: { x: number; y: number; z: number };
  }>;
}

// Sent to a player when they first connect
interface Welcome {
  type: 'welcome';
  yourId: string;
  players: Array<{ id: string; name: string }>;  // Existing players
}

// Sent when server is full
interface ServerFull {
  type: 'server_full';
}
```

## Implementation Tasks

### Task 1: Monorepo Setup (if not done)
Create root `package.json` with workspaces:
```json
{
  "name": "kids-game",
  "private": true,
  "workspaces": ["packages/*"]
}
```

### Task 2: Shared Types Package
1. Create issue: "Shared types package for client-server communication"
2. Create `packages/shared/` with the message types above
3. Export all types from `index.ts`

### Task 3: Server Package Setup
1. Create issue: "Initialize server package with TypeScript"
2. Create `packages/server/package.json`
3. Create `tsconfig.json` extending from root if exists
4. Add scripts:
   - `dev`: `tsx watch src/index.ts`
   - `build`: `tsc`
   - `start`: `node dist/index.js`

### Task 4: WebSocket Server
1. Create issue: "WebSocket server with connection handling"
2. Implement `Server.ts`:
   - Create WebSocket server on port 3001 (configurable via PORT env)
   - Create Express server on same port for health check at `/health`
   - Handle `connection`, `message`, `close`, `error` events
   - Log connections/disconnections

### Task 5: Player Management
1. Create issue: "Player session management"
2. Implement `Player.ts`:
   - Store id, name, position, rotation, state, swingAttachPoint
   - Methods: `toJSON()` for serialization
3. Implement connection logic:
   - Generate unique ID (use `crypto.randomUUID()`)
   - Reject if 5 players already connected (send `ServerFull`)
   - Send `Welcome` message with player ID and existing players
   - Broadcast `PlayerJoined` to other players

### Task 6: Game State & Broadcasting
1. Create issue: "Game state management and broadcasting"
2. Implement `GameState.ts`:
   - Store Map of connected players
   - Methods: `addPlayer()`, `removePlayer()`, `updatePlayer()`, `getState()`
3. Start interval that broadcasts state every 50ms (20Hz)
4. Only send state if there are players connected

### Task 7: Message Handlers
1. Create issue: "Message handling for player updates"
2. Implement `handlers.ts`:
   - Parse incoming JSON messages
   - Handle `join`: Update player name
   - Handle `position`: Update player position/state
   - Handle `swing`: Update swing state

## Running the Server

```bash
cd packages/server
npm install
npm run dev
```

Server will log:
```
Server listening on port 3001
Health check available at http://localhost:3001/health
```

## Testing Manually

1. Use a WebSocket client (like `wscat` or browser console):
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({ type: 'join', name: 'TestPlayer' }));
```

2. Should receive `Welcome` message with your player ID

3. Send position updates:
```javascript
ws.send(JSON.stringify({ type: 'position', x: 0, y: 1, z: 0, rotationY: 0, state: 'idle' }));
```

4. Should start receiving `state` broadcasts every 50ms

## Notes

- No authentication needed - this is for local network play only
- No need to validate that positions are "legal" - trust the client
- Keep it simple - this is a learning project for kids
- The client will handle all rendering and physics, server just syncs state
