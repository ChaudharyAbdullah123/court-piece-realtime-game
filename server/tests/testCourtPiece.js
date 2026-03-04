// // testCourtPiece.js
// const io = require("socket.io-client");

// // Server URL
// const SERVER_URL = "http://localhost:5000";

// // Room ID for testing
// const ROOM_ID = "room1";

// // Player names
// const PLAYERS = ["Alice", "Bob", "Charlie", "David"];

// // Store player sockets
// const sockets = [];

// // Game state in test
// let playerHands = {};

// // Connect all players
// PLAYERS.forEach((name, index) => {
//   const socket = io(SERVER_URL);

//   sockets.push(socket);

//   socket.on("connect", () => {
//     console.log(`✅ ${name} connected, socket ID: ${socket.id}`);

//     // Join room
//     socket.emit("join_room", { roomID: ROOM_ID, username: name });
//   });

//   socket.on("room_joined", (data) => {
//     console.log(`📢 ${name} joined room: ${data.roomID}`);

//     // If all players joined, start game from first socket
//     if (index === 0) {
//       setTimeout(() => {
//         console.log("🚀 Starting game...");
//         socket.emit("start_game", ROOM_ID);
//       }, 1000);
//     }
//   });

//   // Receive hand
//   socket.on("receive_hand", (data) => {
//     console.log(`🃏 ${name} received hand:`, data.hand);
//     playerHands[socket.id] = data.hand;

//     // For first player, choose trump automatically
//     if (index === 0 && data.hand.length > 0 && data.trump === undefined) {
//       const suit = data.hand[0].suit; // pick first card suit
//       console.log(`🃏 ${name} selects trump: ${suit}`);
//       socket.emit("trump_selected", { roomID: ROOM_ID, suit });
//     }
//   });

//   // Notification: card played
//   socket.on("card_played_on_table", (data) => {
//     console.log(
//       `🃏 Card played: ${data.card.value} of ${data.card.suit} by ${data.playerId}`
//     );
//   });

//   // Notification: your turn
//   socket.on("your_turn", () => {
//     const hand = playerHands[socket.id];
//     if (!hand || hand.length === 0) return;

//     // Play first card in hand
//     const card = hand.shift();
//     console.log(`🎯 ${name} plays card: ${card.value} of ${card.suit}`);
//     socket.emit("play_card", { roomID: ROOM_ID, card });
//   });

//   // Clear table (end of trick)
//   socket.on("clear_table", () => {
//     console.log("🧹 Table cleared, next trick begins...");
//   });

//   socket.on("disconnect", () => {
//     console.log(`❌ ${name} disconnected`);
//   });
// });

























const trumpManager = require('./trumpManager');
const createDeck = require('../utils/createDeck');
const shuffle = require('../utils/shuffle');

const fakeGame = {
    players: [
        { socketId: "P1", username: "Alice", team: "A" },
        { socketId: "P2", username: "Bob", team: "B" },
        { socketId: "P3", username: "Charlie", team: "A" },
        { socketId: "P4", username: "David", team: "B" }
    ],
    deck: shuffle(createDeck()),
    dealerIndex: 0
};

// Fake IO object
const fakeIO = {
    to: () => ({
        emit: (event, data) => {
            console.log("EVENT:", event, data);
        }
    })
};

console.log("=== TESTING TRUMP MANAGER ===");

const selector = trumpManager.handleInitialTrumpSelection(
    fakeIO,
    fakeGame,
    "room1"
);

console.log("Trump Selector:", selector);