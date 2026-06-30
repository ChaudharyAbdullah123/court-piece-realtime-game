const dealManager = require('./dealManager');
const trumpManager = require('./trumpManager');
const scoreManager = require('./ScoreManager');
const turnManager = require('./TurnManager');
const botManager = require('./botManager');
const createDeck = require('../utils/createDeck');
const shuffle = require('../utils/shuffle');
const ruleEngine = require('../rules/ruleEngine');
const trickEvaluator = require('./TrickManager');
const { rooms } = require('../socket/roomManager');
const { logGameState } = require('../utils/loggers');

const games = {}; // roomID -> game state

function startGame(io, roomID) {
    const room = rooms[roomID];

    if (!room || room.players.length !== 4) {
        console.log("❌ Need 4 players to start");
        return;
    }

    rooms[roomID].gameStarted = true;

    const deck = shuffle(createDeck());

    // =========================
    // ✅ TEAM ASSIGNMENT
    // =========================
    room.players[0].team = 'A';
    room.players[2].team = 'A';
    room.players[1].team = 'B';
    room.players[3].team = 'B';

    // 🔍 DEBUG LOG (IMPORTANT)
    console.log("===== TEAM ASSIGNMENT =====");
    room.players.forEach((p, i) => {
        console.log(`Player ${i}: ${p.username} → Team ${p.team}`);
    });
    console.log("===========================");

    // =========================
    // 🎮 GAME STATE
    // =========================
    games[roomID] = {
        players: room.players,
        deck,

        hands: {},
        table: [],

        trump: null,
        trumpRevealed: false,

        trumpSelector: null,

        leadSuit: null,

        currentTurnIndex: 0,
        dealerIndex: 0,

        scores: {
            A: 0,
            B: 0
        },

        sar: {
            A: 0,
            B: 0
        },

        centerPileCount: 0,
        seniorPlayerId: null,

        tricksPlayed: 0,

        phase: "initial_trump_selection"
    };

    console.log("🚀 Game initialized");

    // =========================
    // 📡 SEND TEAM INFO TO FRONTEND
    // =========================
    io.to(roomID).emit("teams_assigned", {
        players: games[roomID].players.map(p => ({
            socketId: p.socketId,
            username: p.username,
            team: p.team
        }))
    });

    // =========================
    // 🎯 TRUMP SELECTION START
    // =========================
    const selector = trumpManager.handleInitialTrumpSelection(
        io,
        games[roomID],
        roomID
    );

    if (!selector) {
        console.log("❌ Failed to determine trump selector");
    }

    // Auto-trigger bot if selector is a bot
    checkAndTriggerBotTurn(io, roomID);
}

function selectTrump(io, socket, { roomID, suit }) {
    const game = games[roomID];
    if (!game) return;

    if (game.phase !== "choosing_trump") {
        return;
    }

    if (game.trump) {
        return;
    }

    if (socket.id !== game.trumpSelector) {
        return socket.emit("invalid_move", {
            msg: "Only selector can choose trump"
        });
    }

    const validSuits = ["hearts", "spades", "clubs", "diamonds"];
    if (!validSuits.includes(suit)) {
        return socket.emit("invalid_move", {
            msg: "Invalid suit"
        });
    }

    game.trump = suit;
    console.log("✅ Trump Selected:", suit);

    io.to(roomID).emit("trump_chosen", {
        suit
    });

    // ✅ complete dealing
    dealManager.completeDeal(io, game);

    // cleanup initial cards if any
    delete game.initialCards;

    // first turn = trump selector
    game.currentTurnIndex = game.players.findIndex(
        p => p.socketId === game.trumpSelector
    );

    const firstPlayer = game.players[game.currentTurnIndex];
    console.log("🎯 First Turn:", firstPlayer.username);

    io.to(firstPlayer.socketId).emit("your_turn", {
        hand: game.hands[firstPlayer.socketId]
    });

    game.phase = "playing";

    // Auto-trigger bot turn if first player is bot
    checkAndTriggerBotTurn(io, roomID);
}

function playCard(io, socket, { roomID, card }) {
    const game = games[roomID];
    if (!game || game.phase !== "playing") return;

    const player = game.players[game.currentTurnIndex];

    // ❌ Not your turn
    if (socket.id !== player.socketId) {
        socket.emit('invalid_move', { msg: "Not your turn" });
        return;
    }

    // ❌ Invalid card
    if (!ruleEngine.isCardPlayable(game, socket.id, card)) {
        socket.emit('invalid_move', { msg: "Card not allowed" });
        return;
    }

    // ✅ Remove card from hand
    game.hands[socket.id] = game.hands[socket.id].filter(c => {
        if (!c) return false;
        return !(c.suit === card.suit && c.value === card.value);
    });

    // ✅ Add to table
    game.table.push({ card, playerId: socket.id });

    // Broadcast play
    io.to(roomID).emit('card_played_on_table', {
        card,
        playerId: socket.id
    });

    // =========================
    // 🏁 TRICK COMPLETE
    // =========================
    if (game.table.length === 4) {
        const winningPlay = trickEvaluator.evaluateTrick(game);
        const winnerId = winningPlay.playerId;
        const winningCard = winningPlay.card;
        const winnerPlayer = game.players.find(p => p.socketId === winnerId);

        game.tricksPlayed += 1;

        // Double Sar Scoring logic
        scoreManager.updateDoubleSar(game, winnerPlayer, winningCard);

        console.log("✅ Trick Completed. Tricks Played:", game.tricksPlayed);

        // Reset table
        game.table = [];
        game.leadSuit = null;

        // Send winner event
        io.to(roomID).emit('trick_winner', {
            winnerId,
            sar: game.sar
        });

        // =========================
        // 🏁 ROUND COMPLETE
        // =========================
        if (game.tricksPlayed === 13) {
            return endRound(io, roomID, game);
        }

        // Next turn = winner of the trick
        game.currentTurnIndex = game.players.findIndex(
            p => p.socketId === winnerId
        );

        const nextPlayer = game.players[game.currentTurnIndex];
        io.to(nextPlayer.socketId).emit('your_turn', {
            hand: game.hands[nextPlayer.socketId]
        });

    } else {
        // Next player turn clockwise
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
        const nextPlayer = game.players[game.currentTurnIndex];

        io.to(nextPlayer.socketId).emit('your_turn', {
            hand: game.hands[nextPlayer.socketId]
        });
    }
    logGameState(game);

    // Auto-trigger bot if next player is bot
    checkAndTriggerBotTurn(io, roomID);
}

// =========================
// 🏁 END ROUND
// =========================
function endRound(io, roomID, game) {
    console.log("🏁 ROUND COMPLETED");

    const winningTeam = scoreManager.getWinningTeam(game);
    scoreManager.updateMatchScore(game, winningTeam);

    console.log("Winner Team:", winningTeam);
    console.log("Scores:", game.scores);

    io.to(roomID).emit("round_ended", {
        winningTeam,
        sar: game.sar,
        scores: game.scores
    });

    // Dealer & Trump Selector Rotation logic
    const prevSelectorId = game.trumpSelector;
    const prevSelectorIndex = game.players.findIndex(p => p.socketId === prevSelectorId);
    const prevSelectorTeam = game.players[prevSelectorIndex].team;

    let nextSelectorIndex = prevSelectorIndex;

    // Check for Full Court or Goon Court
    if (game.sar[prevSelectorTeam] === 13) {
        // Full Court: Caller's partner calls next
        nextSelectorIndex = (prevSelectorIndex + 2) % 4;
        console.log("👑 FULL COURT! Partner of previous caller gets to choose trump.");
    } else if (game.sar[prevSelectorTeam === 'A' ? 'B' : 'A'] === 13) {
        // Goon Court: Opponent clockwise calls next
        nextSelectorIndex = (prevSelectorIndex + 1) % 4;
        console.log("💀 GOON COURT! Opponent clockwise gets to choose trump.");
    } else if (winningTeam === prevSelectorTeam) {
        // Normal win for calling team: same caller calls again
        nextSelectorIndex = prevSelectorIndex;
        console.log("🔁 Calling team won. Same player chooses trump.");
    } else {
        // Normal win for opponents: call privilege rotates clockwise
        nextSelectorIndex = (prevSelectorIndex + 1) % 4;
        console.log("🔄 Opponents won. Trump selection rotates clockwise.");
    }

    const nextSelectorId = game.players[nextSelectorIndex].socketId;

    // Rotate dealer if dealer's team lost
    const dealerTeam = game.players[game.dealerIndex].team;
    let nextDealerIndex = game.dealerIndex;
    if (winningTeam !== dealerTeam) {
        nextDealerIndex = (game.dealerIndex + 1) % 4;
        console.log(`🔄 Dealer rotates to: ${game.players[nextDealerIndex].username}`);
    } else {
        console.log(`🔁 Dealer's team won. Dealer remains: ${game.players[nextDealerIndex].username}`);
    }

    resetRound(game, nextSelectorId, nextDealerIndex);

    startNextRound(io, roomID, game);
}

// =========================
// 🔄 RESET ROUND
// =========================
function resetRound(game, nextSelectorId, nextDealerIndex) {
    game.sar = { A: 0, B: 0 };
    game.centerPileCount = 0;
    game.seniorPlayerId = null;
    game.tricksPlayed = 0;
    game.table = [];
    game.leadSuit = null;
    game.trump = null;
    game.trumpRevealed = false;
    game.trumpSelector = nextSelectorId;
    game.dealerIndex = nextDealerIndex;
    game.phase = "choosing_trump"; // since trump caller is pre-determined
}

// =========================
// 🔄 START NEXT ROUND
// =========================
function startNextRound(io, roomID, game) {
    console.log("🔄 Starting Next Round");

    game.deck = shuffle(createDeck());

    // Because the next selector is pre-determined, we skip handling initial selection
    // and directly deal cards.
    dealManager.dealTrumpSelectorCards(io, game);

    // Ask for trump selection
    io.to(game.trumpSelector).emit("choose_trump", {
        roomID,
        hand: game.hands[game.trumpSelector]
    });

    // Auto-trigger bot if new trump selector is bot
    checkAndTriggerBotTurn(io, roomID);
}

// =========================
// 🤖 BOT MOVE INJECTOR
// =========================
const botTurnPending = {}; // prevent duplicate bot triggers

function checkAndTriggerBotTurn(io, roomID) {
    const game = games[roomID];
    if (!game) return;

    // Prevent duplicate triggers
    if (botTurnPending[roomID]) return;

    if (game.phase === "choosing_trump") {
        const selector = game.players.find(p => p.socketId === game.trumpSelector);
        if (selector && selector.isBot) {
            botTurnPending[roomID] = true;
            console.log(`🤖 Bot ${selector.username} is choosing trump...`);
            setTimeout(() => {
                botTurnPending[roomID] = false;
                const hand = game.hands[selector.socketId];
                if (!hand || hand.length === 0) return;
                const suit = botManager.selectBotTrump(hand);
                console.log(`🤖 Bot ${selector.username} chose trump: ${suit}`);

                // Call selectTrump with a mock socket
                const mockSocket = {
                    id: selector.socketId,
                    emit: (event, data) => console.log(`[Mock Bot Socket Emit] ${event}:`, data)
                };
                selectTrump(io, mockSocket, { roomID, suit });
            }, 1500);
        }
    } else if (game.phase === "playing") {
        const player = game.players[game.currentTurnIndex];
        if (player && player.isBot) {
            botTurnPending[roomID] = true;
            console.log(`🤖 Bot ${player.username} is thinking...`);
            setTimeout(() => {
                botTurnPending[roomID] = false;
                const card = botManager.selectBotCard(game, player.socketId);
                if (card) {
                    console.log(`🤖 Bot ${player.username} plays card: ${card.suit}-${card.value}`);
                    // Call playCard with a mock socket
                    const mockSocket = {
                        id: player.socketId,
                        emit: (event, data) => console.log(`[Mock Bot Socket Emit] ${event}:`, data)
                    };
                    playCard(io, mockSocket, { roomID, card });
                }
            }, 1500);
        }
    }
}

module.exports = { startGame, playCard, selectTrump, games, checkAndTriggerBotTurn };