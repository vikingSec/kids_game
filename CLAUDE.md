# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Robot Spiderman: A multiplayer third-person game where players swing through a techno-jungle. Built as a learning project with kids.

- **Client:** ThreeJS + TypeScript + Vite (port 5173)
- **Server:** Node.js + WebSocket using `ws` (port 3001)
- **Monorepo:** npm workspaces with `packages/client`, `packages/server`, `packages/shared`

## Development Commands

```bash
# Install all dependencies
npm install

# Run client dev server
npm run dev:client

# Run server with hot reload
npm run dev:server

# Run both (if configured)
npm run dev
```

## Architecture

### Client (`packages/client`)
- `src/game/` - Game loop, scene, camera
- `src/player/` - Player controller, movement, input
- `src/abilities/` - Web swinging and other abilities
- `src/world/` - Terrain, vegetation, environment
- `src/network/` - WebSocket connection to server

### Server (`packages/server`)
- `src/Server.ts` - WebSocket server setup
- `src/GameState.ts` - Authoritative player state
- `src/Player.ts` - Player session management
- `src/messages/` - Message parsing and handlers

### Shared (`packages/shared`)
- Message type definitions for client-server communication
- Shared constants

## Workflow

1. Create GitHub issue for each feature
2. Create feature branch: `feature/issue-{number}-{description}`
3. Implement and create PR
4. Human reviews and merges

## Design Constraints

- Local network only - no authentication, no security hardening
- Maximum 5 concurrent players
- Server broadcasts state at 20Hz (every 50ms)
- Browser-only client (no mobile)
