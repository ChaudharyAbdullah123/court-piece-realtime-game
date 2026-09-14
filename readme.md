# Court Piece Pro (Double Sar) — Real-Time Multiplayer Card Game

[![Node.js CI](https://github.com/ChaudharyAbdullah123/court-piece-realtime-game/actions/workflows/test.yml/badge.svg)](https://github.com/ChaudharyAbdullah123/court-piece-realtime-game/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: >=18.x](https://img.shields.io/badge/Node.js-%3E%3D18.x-brightgreen)](https://nodejs.org/)
[![React: 19](https://img.shields.io/badge/React-19.x-blue)](https://react.dev/)
[![Phaser: 3.90](https://img.shields.io/badge/Phaser-3.90-red)](https://phaser.io/)

A full-stack, production-ready real-time multiplayer implementation of the classic South Asian card game **Court Piece (Double Sar / Rang / Hokm)**. Built with a high-performance **React + Phaser 3** gaming canvas frontend and a scalable **Node.js, Express, Socket.io, and MongoDB** backend.

---

## 🌟 Key Highlights

- **Full-Stack Architecture**: React 19 single-page UI with embedded Phaser 3 canvas for hardware-accelerated 60fps animations.
- **Double Sar Rules Engine**: Authentic Court Piece rules including center trick accumulation, consecutive trick claims, and dealer rotations.
- **The Ace Rule**: Winning a trick with an Ace retains senior player status without claiming accumulated center tricks.
- **Teen Patti Gold-Style Visual Experience**:
  - Interactive player profile badges with avatar frames, initial icons, team pills (`TEAM A` / `TEAM B`), and online status.
  - Interactive profile modals on avatar click to view stats and send buddy requests.
  - Real-time emoji reaction bar (`👍 ❤️ 🔥 😂 👑 👏`) with animated floating speech bubbles over sender avatars.
  - Dynamic room-wide turn indicator banner and pulsing golden turn ring around the active player.
  - Directional card throw animations from the player's exact seat position.
- **Heuristic AI Bots**: High-level bot logic for solo mode and automatic bot takeover during player timeouts or disconnections.
- **Private Room Matchmaking**: 6-character unique alphanumeric room codes, shareable via direct copy or WhatsApp.
- **Flexible Player Modes**:
  - **Solo Play with Bots**: Instant start with 3 AI bots.
  - **2 Players + 2 Bots**: Host can start the match with 2 human players; missing seats are seamlessly filled with bots.
  - **Full 4-Player Friends Match**: 4 human players in a private lobby.
- **Dual Authentication**:
  - **Firebase Facebook OAuth**: Real profile pictures, persistent accounts, buddy lists, and match stats.
  - **Guest Login**: Instant gameplay in isolated rooms with bot companions.
- **Robust Reconnection Engine**: 15-second grace period on disconnect with complete state rehydration (hands, tricks, trump, current turn).
- **Automated CI/CD**: GitHub Actions workflow testing matrix across Node.js 18.x, 20.x, and 21.x with 100% test pass rate (29/29 tests).

---

## 🏗️ Architecture & Technology Stack

```
                                  ┌───────────────────────────────┐
                                  │      Client (Port 3000)       │
                                  │  React 19 + React Router v7   │
                                  │   Phaser 3 Canvas Engine      │
                                  │   Firebase Auth Client SDK    │
                                  └──────────────┬────────────────┘
                                                 │
                                     HTTP REST / WebSocket (WSS)
                                                 │
                                  ┌──────────────┴────────────────┐
                                  │      Server (Port 5000)       │
                                  │  Express 5 + Socket.io v4     │
                                  │  JWT + Firebase Admin Auth    │
                                  │  Rule Engine & AI Bot System  │
                                  └──────────────┬────────────────┘
                                                 │
                                      Mongoose ODM Driver
                                                 │
                                  ┌──────────────┴────────────────┐
                                  │      MongoDB Database         │
                                  │  Users, Match History, Stats  │
                                  └───────────────────────────────┘
```

### Frontend (`client/`)
- **Framework**: React 19, React Router v7
- **Game Engine**: Phaser 3 (HTML5 Canvas / WebGL)
- **Styling & UI**: Custom CSS Glassmorphism + Felt Table aesthetics, Lucide React icons
- **Networking**: `socket.io-client`, Axios
- **Authentication**: Firebase Client SDK (Facebook Popup OAuth)

### Backend (`server/`)
- **Runtime**: Node.js (ES6+ CommonJS modules)
- **Web Framework**: Express 5
- **Real-Time Communication**: Socket.io 4 (with namespace rooms and JWT handshake authentication)
- **Database & ODM**: MongoDB with Mongoose 9
- **Security**: JWT session tokens, `express-rate-limit`, `cors`, Firebase Admin token verification
- **Static Code Analysis**: ESLint 9 Flat Config

---

## 📂 Project Structure

```
court-piece-realtime-game/
├── .github/
│   └── workflows/
│       └── test.yml           # CI workflow (Node 18.x, 20.x, 21.x, lint + 29 unit tests)
├── client/                    # React 19 Frontend
│   ├── public/
│   │   ├── assets/png/cards/  # Card sprite sheets and SVG/PNG decks
│   │   └── court_piece_logo.png
│   ├── src/
│   │   ├── api/               # Axios REST endpoints (auth, profile, stats)
│   │   ├── components/        # UI components (Lobby, Navbar, SplashScreen, Overlays)
│   │   ├── game/
│   │   │   └── GameScene.js   # Phaser 3 Core Scene (Table, Animations, Avatars, Emojis)
│   │   ├── pages/             # Route pages (Home, Login, GameRoom, Profile, MatchHistory)
│   │   ├── utils/             # Sound effects (sfx.js), Facebook auth helpers
│   │   ├── App.js             # Client routing & ProtectedRoute wrappers
│   │   └── socket.js          # Singleton Socket.io client instance
│   └── package.json
├── server/                    # Node.js Backend
│   ├── config/
│   │   └── db.js              # MongoDB connection with retry logic
│   ├── game/                  # Core game logic
│   │   ├── botManager.js      # AI bot decision heuristic algorithms
│   │   ├── dealManager.js     # Card distribution & deck dealing
│   │   ├── gameManager.js     # Master game loop & turn orchestration
│   │   ├── ScoreManager.js    # Double Sar rules & point tracking
│   │   ├── TrickManager.js    # Trick evaluation & card comparison
│   │   └── trumpManager.js    # Trump selection & highest initial card tie-breakers
│   ├── models/                # Mongoose schemas (User, MatchHistory)
│   ├── routes/                # REST API routes (auth.js, matchHistory.js)
│   ├── rules/
│   │   └── ruleEngine.js      # Card play legality & lead suit validation
│   ├── socket/
│   │   ├── handlers/          # Modular Socket event handlers (card, game, trump, reconnect)
│   │   ├── index.js           # Socket authentication middleware & event router
│   │   └── roomManager.js     # Room lifecycle, codes, spectator & bot seating
│   ├── tests/                 # Master test suite (29 tests)
│   │   ├── runAllTests.js     # Test runner CLI
│   │   ├── test_botManager.js
│   │   ├── test_DoubleSar.js
│   │   ├── test_ruleEngine.js
│   │   └── test_roomManager.js
│   ├── utils/                 # Deck generation, shuffling, rank helpers, loggers
│   └── server.js              # Server entry point, rate limiters, graceful shutdown
├── Dockerfile                 # Production Docker container specification
├── package.json               # Root scripts (test, lint, dev)
└── README.md
```

---

## 🎮 Game Rules: Court Piece (Double Sar)

1. **Players & Teams**: 4 players seated in two opposing partnerships:
   - **Team A**: Seats `Me` (Bottom) & `Top`
   - **Team B**: Seats `Left` & `Right`
2. **Trump Selection (Rang)**:
   - 5 cards are dealt first to the designated Trump Selector.
   - The selector chooses the trump suit (Hearts, Diamonds, Clubs, or Spades).
   - Once declared, remaining 8 cards are dealt to all players (total 13 cards each).
3. **Leading and Following**:
   - The Trump Selector leads the very first trick.
   - Players must follow the lead suit if they hold one.
   - If void of the lead suit, a player may play any card, including a Trump card.
4. **Double Sar Scoring**:
   - Single tricks won are **accumulated in the center** pile and are not scored immediately.
   - A team collects the entire center pile only upon winning **two consecutive tricks** (by the same team).
   - **The Ace Exception**: Winning a consecutive trick with an Ace keeps the pile in the center—the team must win another trick with a non-Ace card to pick up the pile.
   - **13th Trick Resolution**: The winner of the final (13th) trick automatically collects all remaining cards in the center pile.
5. **Winning the Match**: The first team to win **7 rounds** wins the match.

---

## 📡 Socket.io Real-Time Protocol

### Room & Matchmaking Events
| Event Name | Direction | Payload Description |
|---|---|---|
| `play_with_bots` | Client ➔ Server | `{ username }` — Spawns instant solo room with 3 AI bots |
| `play_with_friends` | Client ➔ Server | `{ username }` — Creates a private 4-seat room with a 6-character code |
| `join_by_code` | Client ➔ Server | `{ username, roomCode }` — Joins an existing private room |
| `start_friends_game` | Client ➔ Server | `{ roomID }` — Host starts game; auto-fills empty seats with bots |
| `room_update` | Server ➔ Room | Full room state including seated players, owner, and game status |
| `teams_assigned` | Server ➔ Room | Player seating order, team designations (`A`/`B`), and avatar URLs |

### Gameplay Events
| Event Name | Direction | Payload Description |
|---|---|---|
| `choose_trump` | Server ➔ Selector | `{ hand, roomID }` — Prompts selector to pick trump from 5 cards |
| `trump_selected` | Client ➔ Server | `{ roomID, suit }` — Submits selected trump |
| `trump_chosen` | Server ➔ Room | `{ suit, selectorName }` — Broadcasts declared trump suit |
| `receive_hand` | Server ➔ Client | `{ hand: Card[] }` — Deals full 13-card hand |
| `turn_changed` | Server ➔ Room | `{ activePlayerId, username, isBot, team }` — Updates active turn banner |
| `your_turn` | Server ➔ Client | `{ hand }` — Prompts client that it is their turn to play |
| `play_card` | Client ➔ Server | `{ card, roomID }` — Client plays a card from their hand |
| `card_played_on_table` | Server ➔ Room | `{ card, playerId }` — Animates card moving to table center |
| `trick_winner` | Server ➔ Room | `{ winnerId, sar }` — Announces trick winner and updated scores |
| `round_ended` | Server ➔ Room | `{ winningTeam, sar, scores }` — Round summary |
| `match_ended` | Server ➔ Room | `{ winnerTeam, scores }` — Match conclusion overlay |
| `send_emoji` | Client ➔ Server | `{ roomID, emoji }` — Sends emoji reaction |
| `player_emoji` | Server ➔ Room | `{ senderId, emoji }` — Displays animated speech bubble |

---

## 🛠️ REST API Reference

### Authentication (`/api/auth`)
- **`POST /api/auth/guest`**:
  - Request: `{ username?: string }`
  - Response: `{ token, username, userId, isGuest: true }`
- **`POST /api/auth/firebase-facebook`**:
  - Request: `{ idToken, uid, displayName, photoURL }`
  - Response: `{ token, username, userId, photoURL, isGuest: false }`
- **`GET /api/auth/friends`** (Requires Bearer token):
  - Response: `{ friends: [ { _id, username, photoURL, stats, online } ] }`
- **`GET /api/auth/profile`** (Requires Bearer token):
  - Response: User profile data including games played, win rate, and total points.

---

## 💻 Local Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Running locally on `mongodb://localhost:27017` or a MongoDB Atlas URI

---

### 1. Clone the Repository
```bash
git clone https://github.com/ChaudharyAbdullah123/court-piece-realtime-game.git
cd court-piece-realtime-game
```

### 2. Configure Backend Environment
Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/court_piece
JWT_SECRET=your_super_secret_jwt_key_here
```

### 3. Install Dependencies
```bash
# Root & backend dependencies
npm install

# Client dependencies
cd client
npm install
cd ..
```

### 4. Run Automated Test Suite
Verify backend logic and rule engines:
```bash
# Runs ESLint static analysis
npm run lint

# Runs all 29 automated unit tests
npm test
```
Expected output:
```
==================================================
🏁 GRAND TOTAL: 29 passed, 0 failed
✅ ALL BACKEND MODULES VERIFIED — READY FOR FRONTEND!
==================================================
```

### 5. Launch the Application
Open two terminal windows:

**Terminal 1 — Backend Server**:
```bash
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 — Frontend Client**:
```bash
cd client
npm start
# React app opens on http://localhost:3000
```

---

## 🐳 Docker Deployment

To build and run the entire production container:

```bash
# Build Docker image
docker build -t court-piece-pro .

# Run container
docker run -p 5000:5000 \
  -e MONGO_URI="mongodb://host.docker.internal:27017/court_piece" \
  -e JWT_SECRET="production_jwt_secret" \
  court-piece-pro
```

---

## 🧪 Testing Coverage

The backend includes a zero-dependency test suite covering:
- **`ruleEngine` (6 tests)**: Lead suit obedience, trumping rules, illegal plays, ownership validation.
- **`roomManager` (9 tests)**: Public/private room creation, 6-character code uniqueness, guest isolation, spectator arrays, bot population, disconnect cleanup.
- **`ScoreManager` (8 tests)**: Consecutive win accumulation, Ace rule exemption, 13th trick capture, streak collections, match scoring.
- **`botManager` (6 tests)**: Abundance-based trump selection, winning card minimization, partner win-detection, defensive trumping.

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
