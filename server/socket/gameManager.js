const dealManager = require('./dealManager');
const trumpManager = require('./trumpManager');
const createDeck = require('../utils/createDeck');
const shuffle = require('../utils/shuffle');
const ruleEngine = require('./ruleEngine');
const trickEvaluator = require('./trickEvaluator');
const { rooms } = require('./roomManager');

const games = {}; // roomID -> game state

function startGame(io, roomID) {
    const room = rooms[roomID];

    if (!room || room.players.length !== 4) {
        console.log("❌ Need 4 players to start");
        return;
    }

    const deck = shuffle(createDeck());

    // Assign teams first
    room.players[0].team = 'A';
    room.players[2].team = 'A';
    room.players[1].team = 'B';
    room.players[3].team = 'B';

    // Initialize game object FIRST
    games[roomID] = {
        players: room.players,
        deck,
        hands: {},
        table: [],
        trump: null,
        trumpSelector: null,
        leadSuit: null,
        currentTurnIndex: 0,
        dealerIndex: 0,
        tricksWon: { A: 0, B: 0 },
        scores: { A: 0, B: 0 },
        phase: "initial_trump_selection"
    };

    console.log("🚀 Game initialized");

    // Now call trump manager
    const selector = trumpManager.handleInitialTrumpSelection(
        io,
        games[roomID],
        roomID
    );

    if(!selector){
        console.log("❌ Failed to determine trump selector");
        return;
    }
}

function selectTrump(io, socket, { roomID, suit }) {
    const game = games[roomID];

    if (!game || game.phase !== "choosing_trump") return;
    if (socket.id !== game.trumpSelector) return;

    game.trump = suit;

    io.to(roomID).emit("trump_chosen", { suit });
    // Put initial cards back into deck
    for (let socketId in game.initialCards) {
        game.deck.push(game.initialCards[socketId]);
    }
    
    // Shuffle again
    game.deck = shuffle(game.deck);
    
    // Remove initialCards memory
    delete game.initialCards;
    // Deal full cards
    dealManager.dealCards(game);
    dealManager.distributeHands(io, game, roomID);

    // First turn starts from selector
    game.currentTurnIndex = game.players.findIndex(
        p => p.socketId === game.trumpSelector
    );

    const firstPlayer = game.players[game.currentTurnIndex];

    console.log("First Turn:", firstPlayer.username);

    io.to(firstPlayer.socketId).emit("your_turn", {
        hand: game.hands[firstPlayer.socketId]
    });

    game.phase = "playing";
}

function playCard(io, socket, { roomID, card }) {
    const game = games[roomID];
    if (!game || game.phase !== "playing") return;

    const player = game.players[game.currentTurnIndex];
    if (socket.id !== player.socketId) {
        socket.emit('invalid_move', { msg: "Not your turn" });
        return;
    }

    // Validate card
    if (!ruleEngine.isCardPlayable(game, socket.id, card)) {
        socket.emit('invalid_move', { msg: "Card not allowed" });
        return;
    }

    // Remove card from hand & place on table
    game.hands[socket.id] = game.hands[socket.id].filter(c => !(c.suit===card.suit && c.value===card.value));
    game.table.push({ card, playerId: socket.id });

    // Broadcast played card
    io.to(roomID).emit('card_played_on_table', { card, playerId: socket.id });

    // Check if trick completed
    if (game.table.length === 4) {
        const winnerId = trickEvaluator.evaluateTrick(game);
        const winnerPlayer = game.players.find(p => p.socketId === winnerId);
        game.tricksWon[winnerPlayer.team] += 1;
        game.table = [];
        game.leadSuit = null;
        game.currentTurnIndex = game.players.findIndex(p => p.socketId === winnerId);

        io.to(roomID).emit('trick_winner', { winnerId, tricksWon: game.tricksWon });

        // Next turn
        const nextPlayer = game.players[game.currentTurnIndex];
        console.log("Next Turn Index:", game.currentTurnIndex);
        console.log("Next Player:", nextPlayer.username);
        io.to(nextPlayer.socketId).emit('your_turn', { hand: game.hands[nextPlayer.socketId] });
        onsole.log("Trick Completed");
        console.log("Tricks Won:", game.tricksWon);
    } else {
        // Move to next player
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
        const nextPlayer = game.players[game.currentTurnIndex];
        io.to(nextPlayer.socketId).emit('your_turn', { hand: game.hands[nextPlayer.socketId] });
    }

}

module.exports = { startGame, playCard, selectTrump, games };
