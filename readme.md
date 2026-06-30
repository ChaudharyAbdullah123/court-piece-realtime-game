# Court Piece (Double Sar) Real-Time Card Game Backend

[![Node.js CI](https://github.com/ChaudharyAbdullah123/court-piece-realtime-game/actions/workflows/test.yml/badge.svg)](https://github.com/ChaudharyAbdullah123/court-piece-realtime-game/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A highly professional, production-ready real-time multiplayer backend for the classic South Asian card game **Court Piece (Double Sar)**. Built using **Node.js**, **Express**, **Socket.io**, and **MongoDB**.

---

## 🚀 Features

- **Double Sar scoring rules**: Supports center trick accumulation, consecutive trick collections, and dealer rotation.
- **The Ace Rule**: Standardized rules where winning a trick with an Ace retains player seniority but does *not* claim the accumulated trick pile to the scoreboard.
- **13th Trick Resolution**: Auto-collection of all remaining center pile cards by the final trick's winner.
- **Heuristic AI Bots**: Automatic bot-takeover when players disconnect, custom bot trump selector (most abundant suit), and intelligent playing heuristics.
- **Private Rooms**: 6-character unique alphanumeric room codes with private matchmaking (similar to Teen Patti Gold).
- **Spectator Support**: Read-only game state synchronization.
- **JWT & Multi-Mode Authentication**: Only Facebook OAuth verification and Guest Login are permitted. Guests are restricted to private, bot-only single-player rooms.
- **Reconnection Engine**: 15-second grace period for disconnected players before bot takeover, with complete socket-to-state synchronization upon reconnection.
- **Active Turn Timers**: Enforces a 15-second timer per active card play. Automatically triggers bot-based auto-play if a user times out.
- **Production Hardening**: API rate-limiting, comprehensive system logs, ESLint static analysis, and Docker containerization.

---

## 📂 Codebase Directory Structure

```
├── .github/workflows/    # CI/CD Automated Test Pipelines
├── server/
│   ├── config/           # Database Connection Configuration
│   ├── game/             # ScoreManager, TurnManager, TrickManager, BotManager, GameManager
│   ├── models/           # Mongoose Database Schemas & In-Memory State Classes
│   ├── routes/           # REST API Authentication Controllers
│   ├── rules/            # Play Rules & Suit Validation Engines
│   ├── socket/           # Socket.io Lifecycle mapping, RoomManager, Handler registrations
│   ├── tests/            # Custom Testing Framework & Unit Tests
│   ├── utils/            # Helper files, Deck Creators, Custom loggers
│   └── server.js         # Backend Entry point & Express Setup
├── Dockerfile            # Container Build Specification
├── LICENSE               # MIT License File
└── package.json          # Dependency and Scripts Declaration
```

---

## 🛠️ REST API Endpoints

### Authentication `/api/auth`
- **`POST /guest`**: Generates a temporary guest profile and signs a session token.
- **`POST /facebook`**: Validates Facebook credentials, updates/creates profiles, and returns a session JWT.
- **`GET /friends`**: Retrieves registered friends who also play the game.
- **`GET /profile`**: Fetches user win/loss statistics and game records.

### System Diagnostics
- **`GET /api/health`**: Diagnostic payload with system uptime.

---

## 📡 Socket.io Events Reference

### Matchmaking & Room Management
- `create_private_room`: Emitted by client to create a private code-locked room.
- `private_room_created`: Broadcasts the generated 6-character room code to the owner.
- `join_by_code`: Enters a private room with a code.
- `join_spectator`: Connects to a room in read-only watcher mode.
- `leave_room`: Gracefully exits the lobby/room.
- `room_update`: Broadcasts updated player arrays and room settings to all sockets in the room.

### Gameplay Lifecycle
- `start_game`: Sent by the room owner to deal cards and begin.
- `choose_trump`: Prompts the selector to choose the trump suit.
- `trump_chosen`: Broadcasts the selected trump suit.
- `your_turn`: Notifies the current player to play a card.
- `play_card`: Sent by the current player with a card payload.
- `card_played_on_table`: Broadcasts the played card to all room occupants.
- `trick_winner`: Emitted on trick end, carrying the winning socket ID and the new scoreboard state.
- `round_ended`: Broadcasts team scores and round stats.
- `match_ended`: Finalizes the match when a team reaches 7 points.

### Active Reconnection
- `player_disconnected`: Starts the 15-second countdown timer.
- `bot_takeover`: Broadcasts bot takeover status when the grace period expires.
- `player_reconnected` / `reconnect_success`: RESTORES socket-to-game mappings, including hands, dealer state, score history, and active turns.

---

## 💻 Local Quickstart

### 1. Configure Environment Variables
Create a `server/.env` file:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/court_piece
JWT_SECRET=your_production_secret_key
```

### 2. Install and Run
```bash
# Install dependencies
npm install

# Run backend development server
npm run dev

# Run production build
npm start
```

### 3. Run Static Code Quality Checks & Unit Tests
```bash
# Run unit tests (29/29 suites)
npm test

# Run ESLint validation
npm run lint
```

---

## 🐳 Container Deployment (Docker)

To package and run the application in a lightweight container:

```bash
# Build the Docker image
docker build -t court-piece-backend .

# Run the container
docker run -p 5000:5000 --env-file server/.env court-piece-backend
```

---

## 📄 License
This project is licensed under the terms of the [MIT License](LICENSE).
