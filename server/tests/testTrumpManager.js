const trumpManager = require('../game/trumpManager');

// Fake 4 players
const fakeGame = {
    players: [
        { socketId: "P1", username: "Alice", team: "A" },
        { socketId: "P2", username: "Bob", team: "B" },
        { socketId: "P3", username: "Charlie", team: "A" },
        { socketId: "P4", username: "David", team: "B" }
    ],

    // 🔥 FORCE OPPONENT TIE (P1 & P2 both A)
    deck: [
        { suit: 'spades', value: 'A' },   // P1
        { suit: 'hearts', value: 'A' },   // P2  ← opponent tie
        { suit: 'clubs', value: '05' },   // P3
        { suit: 'diamonds', value: '06' },// P4

        // 🔥 redeal cards for P1 & P2
        { suit: 'spades', value: 'K' },
        { suit: 'hearts', value: 'Q' },
        { suit: 'clubs', value: '02' },
        { suit: 'diamonds', value: '03' }
    ],

    dealerIndex: 0,
    phase: "initial_trump_selection"
};

// Fake io object
const fakeIO = {
    to: (id) => ({
        emit: (event, data) => {
            console.log("EMIT →", event, "→", id);
            console.log(data);
            console.log("-------------");
        }
    })
};

console.log("===== TESTING TRUMP MODULE (OPPONENT TIE) =====");

const selector = trumpManager.handleInitialTrumpSelection(
    fakeIO,
    fakeGame,
    "room1"
);

console.log("Trump Selector:", selector);