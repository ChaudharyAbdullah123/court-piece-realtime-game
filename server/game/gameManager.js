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

const games = {};           // roomID -> game state
const turnTimers = {};      // roomID -> active turn setTimeout
const botTurnPending = {};  // prevent duplicate bot triggers
const WINNING_ROUNDS = 7;   // First team to win 7 rounds wins the match
const TURN_TIMEOUT_MS = 15000; // 15 seconds per turn

// =========================
// 🚀 START GAME
// =========================
function startGame(io, roomID) {
    const room = rooms[roomID];

    if (!room || room.players.length !== 4) {
        console.log("❌ Need 4 players to start");
        return;
    }

    rooms[roomID].gameStarted = true;
    const deck = shuffle(createDeck());

    // Team Assignment: players 0,2 = Team A  |  players 1,3 = Team B
    room.players[0].team = 'A';
    room.players[2].team = 'A';
    room.players[1].team = 'B';
    room.players[3].team = 'B';

    console.log("===== TEAM ASSIGNMENT =====");
    room.players.forEach((p, i) => console.log(`Player ${i}: ${p.username} → Team ${p.team}`));
    console.log("===========================");

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
        scores: { A: 0, B: 0 },
        sar: { A: 0, B: 0 },
        centerPileCount: 0,
        seniorPlayerId: null,
        tricksPlayed: 0,
        roundHistory: [],       // track round results for DB save
        roundNumber: 1,
        isGuestMatch: room.isGuestRoom || false,
        phase: "initial_trump_selection"
    };

    console.log("🚀 Game initialized");

    io.to(roomID).emit("teams_assigned", {
        players: games[roomID].players.map(p => ({
            socketId: p.socketId,
            username: p.username,
            team: p.team
        }))
    });

    const selector = trumpManager.handleInitialTrumpSelection(io, games[roomID], roomID);
    if (!selector) {
        console.log("❌ Failed to determine trump selector");
    }

    checkAndTriggerBotTurn(io, roomID);
}

// =========================
// 🃏 SELECT TRUMP
// =========================
function selectTrump(io, socket, { roomID, suit }) {
    const game = games[roomID];
    if (!game) return;
    if (game.phase !== "choosing_trump") return;
    if (game.trump) return;

    if (socket.id !== game.trumpSelector) {
        return socket.emit("invalid_move", { msg: "Only selector can choose trump" });
    }

    const validSuits = ["hearts", "spades", "clubs", "diamonds"];
    if (!validSuits.includes(suit)) {
        return socket.emit("invalid_move", { msg: "Invalid suit" });
    }

    game.trump = suit;
    console.log("✅ Trump Selected:", suit);

    io.to(roomID).emit("trump_chosen", { suit });

    dealManager.completeDeal(io, game);
    delete game.initialCards;

    game.currentTurnIndex = game.players.findIndex(p => p.socketId === game.trumpSelector);
    const firstPlayer = game.players[game.currentTurnIndex];
    console.log("🎯 First Turn:", firstPlayer.username);

    io.to(firstPlayer.socketId).emit("your_turn", { hand: game.hands[firstPlayer.socketId] });
    game.phase = "playing";

    // Start turn timer for first player
    startTurnTimer(io, roomID, game);

    checkAndTriggerBotTurn(io, roomID);
}

// =========================
// 🎴 PLAY CARD
// =========================
function playCard(io, socket, { roomID, card }) {
    const game = games[roomID];
    if (!game || game.phase !== "playing") return;

    const player = game.players[game.currentTurnIndex];

    if (socket.id !== player.socketId) {
        socket.emit('invalid_move', { msg: "Not your turn" });
        return;
    }

    if (!ruleEngine.isCardPlayable(game, socket.id, card)) {
        socket.emit('invalid_move', { msg: "Card not allowed" });
        return;
    }

    // Clear active turn timer when card is played
    clearTurnTimer(roomID);

    // Remove card from hand
    game.hands[socket.id] = game.hands[socket.id].filter(c => {
        if (!c) return false;
        return !(c.suit === card.suit && c.value === card.value);
    });

    game.table.push({ card, playerId: socket.id });
    io.to(roomID).emit('card_played_on_table', { card, playerId: socket.id });

    // =========================
    // 🏁 TRICK COMPLETE
    // =========================
    if (game.table.length === 4) {
        const winningPlay = trickEvaluator.evaluateTrick(game);
        const winnerId = winningPlay.playerId;
        const winningCard = winningPlay.card;
        const winnerPlayer = game.players.find(p => p.socketId === winnerId);

        game.tricksPlayed += 1;
        scoreManager.updateDoubleSar(game, winnerPlayer, winningCard);

        console.log("✅ Trick Completed. Tricks Played:", game.tricksPlayed);

        game.table = [];
        game.leadSuit = null;

        io.to(roomID).emit('trick_winner', { winnerId, sar: game.sar });

        if (game.tricksPlayed === 13) {
            return endRound(io, roomID, game);
        }

        game.currentTurnIndex = game.players.findIndex(p => p.socketId === winnerId);
        const nextPlayer = game.players[game.currentTurnIndex];
        io.to(nextPlayer.socketId).emit('your_turn', { hand: game.hands[nextPlayer.socketId] });
        startTurnTimer(io, roomID, game);
    } else {
        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.players.length;
        const nextPlayer = game.players[game.currentTurnIndex];
        io.to(nextPlayer.socketId).emit('your_turn', { hand: game.hands[nextPlayer.socketId] });
        startTurnTimer(io, roomID, game);
    }

    logGameState(game);
    checkAndTriggerBotTurn(io, roomID);
}

// =========================
// ⏱ TURN TIMER
// =========================
function startTurnTimer(io, roomID, game) {
    clearTurnTimer(roomID);

    const currentPlayer = game.players[game.currentTurnIndex];
    if (!currentPlayer || currentPlayer.isBot) return; // Bots handle their own timing

    console.log(`⏱ Turn timer started for ${currentPlayer.username}`);

    // Broadcast timer start to all clients
    io.to(roomID).emit("turn_timer_start", {
        playerId: currentPlayer.socketId,
        username: currentPlayer.username,
        seconds: TURN_TIMEOUT_MS / 1000
    });

    turnTimers[roomID] = setTimeout(() => {
        const g = games[roomID];
        if (!g || g.phase !== "playing") return;

        const idlePlayer = g.players[g.currentTurnIndex];
        if (!idlePlayer || idlePlayer.isBot) return;

        console.log(`⏰ Turn timeout! Auto-playing for ${idlePlayer.username}`);
        io.to(roomID).emit("turn_timeout", { username: idlePlayer.username });

        // Auto-play the first valid card from hand
        const hand = g.hands[idlePlayer.socketId];
        if (!hand || hand.length === 0) return;

        const autoCard = hand[0]; // simplest valid play
        const mockSocket = {
            id: idlePlayer.socketId,
            emit: (event, data) => console.log(`[Auto-play] ${event}:`, data)
        };
        playCard(io, mockSocket, { roomID, card: autoCard });
    }, TURN_TIMEOUT_MS);
}

function clearTurnTimer(roomID) {
    if (turnTimers[roomID]) {
        clearTimeout(turnTimers[roomID]);
        delete turnTimers[roomID];
    }
}

// =========================
// 🏁 END ROUND
// =========================
function endRound(io, roomID, game) {
    clearTurnTimer(roomID);
    console.log("🏁 ROUND COMPLETED");

    const winningTeam = scoreManager.getWinningTeam(game);
    scoreManager.updateMatchScore(game, winningTeam);

    console.log("Winner Team:", winningTeam, "| Scores:", game.scores);

    // Track round history for DB save
    game.roundHistory.push({
        roundNumber: game.roundNumber,
        trump: game.trump,
        trumpSelector: game.players.find(p => p.socketId === game.trumpSelector)?.username || 'Unknown',
        sar: { ...game.sar },
        winningTeam
    });

    io.to(roomID).emit("round_ended", {
        winningTeam,
        sar: game.sar,
        scores: game.scores
    });

    // Check match winner
    if (game.scores.A >= WINNING_ROUNDS || game.scores.B >= WINNING_ROUNDS) {
        const matchWinner = game.scores.A >= WINNING_ROUNDS ? 'A' : 'B';
        return endMatch(io, roomID, game, matchWinner);
    }

    // Determine next trump caller and dealer
    const prevSelectorId = game.trumpSelector;
    const prevSelectorIndex = game.players.findIndex(p => p.socketId === prevSelectorId);
    const prevSelectorTeam = game.players[prevSelectorIndex].team;

    let nextSelectorIndex;
    if (game.sar[prevSelectorTeam] === 13) {
        nextSelectorIndex = (prevSelectorIndex + 2) % 4;
        console.log("👑 FULL COURT! Partner of previous caller gets to choose trump.");
    } else if (game.sar[prevSelectorTeam === 'A' ? 'B' : 'A'] === 13) {
        nextSelectorIndex = (prevSelectorIndex + 1) % 4;
        console.log("💀 GOON COURT! Opponent clockwise gets to choose trump.");
    } else if (winningTeam === prevSelectorTeam) {
        nextSelectorIndex = prevSelectorIndex;
        console.log("🔁 Calling team won. Same player chooses trump.");
    } else {
        nextSelectorIndex = (prevSelectorIndex + 1) % 4;
        console.log("🔄 Opponents won. Trump selection rotates clockwise.");
    }

    const nextSelectorId = game.players[nextSelectorIndex].socketId;
    const dealerTeam = game.players[game.dealerIndex].team;
    let nextDealerIndex = game.dealerIndex;
    if (winningTeam !== dealerTeam) {
        nextDealerIndex = (game.dealerIndex + 1) % 4;
    }

    game.roundNumber++;
    resetRound(game, nextSelectorId, nextDealerIndex);
    startNextRound(io, roomID, game);
}

// =========================
// 🏆 END MATCH
// =========================
async function endMatch(io, roomID, game, matchWinner) {
    clearTurnTimer(roomID);
    console.log(`🏆 MATCH WON BY TEAM ${matchWinner}!`);

    io.to(roomID).emit("match_ended", {
        winnerTeam: matchWinner,
        scores: game.scores,
        roundHistory: game.roundHistory
    });

    // Persist to database
    try {
        const MatchHistory = require('../models/MatchHistory');
        await MatchHistory.create({
            roomID,
            players: game.players.map(p => ({
                username: p.username,
                team: p.team,
                isBot: p.isBot || false
            })),
            scores: game.scores,
            winnerTeam: matchWinner,
            rounds: game.roundHistory,
            isGuestMatch: game.isGuestMatch || false
        });
        console.log("💾 Match history saved to DB");
    } catch (err) {
        console.error("❌ Failed to save match history:", err.message);
    }

    // Clean up
    delete games[roomID];
    const room = rooms[roomID];
    if (room) {
        room.gameStarted = false;
        room.status = "waiting";
        io.to(roomID).emit("return_to_lobby", { roomID });
    }
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
    game.phase = "choosing_trump";
}

// =========================
// 🔄 START NEXT ROUND
// =========================
function startNextRound(io, roomID, game) {
    console.log(`🔄 Starting Round ${game.roundNumber}`);
    game.deck = shuffle(createDeck());
    dealManager.dealTrumpSelectorCards(io, game);

    io.to(game.trumpSelector).emit("choose_trump", {
        roomID,
        hand: game.hands[game.trumpSelector]
    });

    checkAndTriggerBotTurn(io, roomID);
}

// =========================
// 🤖 BOT MOVE INJECTOR
// =========================
function checkAndTriggerBotTurn(io, roomID) {
    const game = games[roomID];
    if (!game) return;
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
                const mockSocket = {
                    id: selector.socketId,
                    emit: (event, data) => {}
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
                    const mockSocket = {
                        id: player.socketId,
                        emit: (event, data) => {}
                    };
                    playCard(io, mockSocket, { roomID, card });
                }
            }, 1500);
        }
    }
}

module.exports = { startGame, playCard, selectTrump, games, checkAndTriggerBotTurn };