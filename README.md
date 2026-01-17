# Robot Spiderman: Techno-Jungle Adventure

A multiplayer third-person game where players control Robot Spiderman, swinging through a techno-jungle filled with glowing plants and circuit-patterned trees.

## About This Project

This game is a learning project built with kids to teach them about coding and AI. It's designed to be:
- **Fun first** - gameplay decisions made by kids
- **Educational** - built with AI assistance to demonstrate modern development
- **Simple** - local network only, no complex infrastructure

> **Note:** This game is designed for local network play only. It is NOT designed for internet deployment and lacks security hardening. Maximum 5 players.

## Tech Stack

- **Client:** ThreeJS + TypeScript + Vite
- **Server:** Node.js + WebSocket (ws)
- **Monorepo:** npm workspaces

## Getting Started

```bash
# Install dependencies
npm install

# Start the server (in one terminal)
npm run dev:server

# Start the client (in another terminal)
npm run dev:client
```

Open http://localhost:5173 in your browser. For multiplayer, open multiple browser windows or have other devices on your network connect.

## Project Structure

```
packages/
├── client/     # ThreeJS game client
├── server/     # WebSocket multiplayer server
└── shared/     # Shared TypeScript types
```

## Game Features

### MVP
- Robot Spiderman character
- Third-person camera
- Ground movement (WASD)
- Web swinging mechanic
- Multiplayer synchronization

### Planned
- Wall climbing
- Super jump
- Speed boost
- Race courses
- Collectibles and secrets
- Cooperative puzzles

## Contributing

This is a family learning project. Issues and PRs are managed by the family with AI assistance.
