const rooms = {};
let roomCounter = 1;
const disconnectTimers = {};

// =========================
// CREATE ROOM
// =========================
function createRoom() {
    const roomID = `room${roomCounter++}`;
    rooms[roomID] = {
        roomID,
        players: [],
        status: "waiting",
        gameStarted: false,
        createdAt: Date.now()
    };
    console.log(`🆕 Room Created: ${roomID}`);
    return roomID;
}

// =========================
// FIND AVAILABLE ROOM
// =========================
function findAvailableRoom() {
    for (const roomID in rooms) {
        const room = rooms[roomID];
        if (room.players.length < 4 && room.gameStarted === false) {
            return roomID;
        }
    }
    return null;
}

// =========================
// JOIN ROOM
// =========================
function joinRoom(io, socket, username) {
    removePlayerFromRooms(io, socket.id);

    let roomID = findAvailableRoom();
    if (!roomID) {
        roomID = createRoom();
    }

    const room = rooms[roomID];
    const player = {
        socketId: socket.id,
        username,
        connected: true,
        joinedAt: Date.now(),
        team: null,
        isBot: false
    };

    room.players.push(player);

    if (room.players.length === 1) {
        room.owner = socket.id;
    }

    socket.join(roomID);
    console.log(`Player ${username} joined ${roomID}`);

    io.to(roomID).emit("room_update", room);
    return roomID;
}

// =========================
// FILL WITH BOTS
// =========================
function fillWithBots(io, roomID) {
    const room = rooms[roomID];
    if (!room) return;

    let botCounter = 1;
    while (room.players.length < 4) {
        const botId = `bot_${roomID}_${botCounter++}`;
        const botPlayer = {
            socketId: botId,
            username: `Bot_${botCounter - 1}`,
            connected: true,
            joinedAt: Date.now(),
            team: null,
            isBot: true
        };
        room.players.push(botPlayer);
        console.log(`🤖 Spawning Bot: ${botPlayer.username}`);
    }

    io.to(roomID).emit("room_update", room);
}

// =========================
// REMOVE PLAYER FROM ROOMS
// =========================
function removePlayerFromRooms(io, socketId) {
    for (const roomID in rooms) {
        const room = rooms[roomID];
        const index = room.players.findIndex(p => p.socketId === socketId);

        if (index !== -1) {
            const removedPlayer = room.players[index];
            room.players.splice(index, 1);
            console.log(`🚪 ${removedPlayer.username} removed from ${roomID}`);

            io.to(roomID).emit("room_update", room);

            // pause game if player leaves and there are not enough players/bots
            const activeCount = room.players.filter(p => p.connected || p.isBot).length;
            if (room.gameStarted && activeCount < 4) {
                room.gameStarted = false;
                room.status = "paused";
                io.to(roomID).emit("game_paused", { msg: "Not enough active players" });
                console.log(`⏸ Game paused in ${roomID}`);
            }

            // delete empty room
            if (room.players.length === 0) {
                console.log(`🗑 Room Deleted: ${roomID}`);
                delete rooms[roomID];
            }
        }
    }
}

// =========================
// DISCONNECT HANDLER
// =========================
function handleDisconnect(io, socketId) {
    for (const roomID in rooms) {
        const room = rooms[roomID];
        const player = room.players.find(p => p.socketId === socketId);
        if (player) {
            console.log(`❌ Disconnected player: ${player.username} from room ${roomID}`);

            if (room.gameStarted) {
                // If game is active, mark offline and start 15s grace timer
                player.connected = false;
                io.to(roomID).emit("player_disconnected", {
                    username: player.username,
                    graceTime: 15
                });

                const timerKey = `${roomID}_${player.username}`;
                if (disconnectTimers[timerKey]) {
                    clearTimeout(disconnectTimers[timerKey]);
                }

                disconnectTimers[timerKey] = setTimeout(() => {
                    console.log(`⏰ Grace period expired for ${player.username} in room ${roomID}. Bot taking over.`);
                    player.isBot = true;
                    io.to(roomID).emit("bot_takeover", { username: player.username });

                    // Trigger bot turn if it is currently their turn
                    const gameManager = require('../game/gameManager');
                    gameManager.checkAndTriggerBotTurn(io, roomID);

                    delete disconnectTimers[timerKey];
                }, 15000); // 15-second grace period
            } else {
                // Game not started, just remove player immediately
                removePlayerFromRooms(io, socketId);
            }
        }
    }
}

// =========================
// RECONNECT PLAYER
// =========================
function reconnectPlayer(io, socket, { roomID, username }) {
    const room = rooms[roomID];
    if (!room) return false;

    const player = room.players.find(p => p.username === username);
    if (!player) return false;

    const oldSocketId = player.socketId;
    const newSocketId = socket.id;

    // Clear disconnect timer
    const timerKey = `${roomID}_${username}`;
    if (disconnectTimers[timerKey]) {
        clearTimeout(disconnectTimers[timerKey]);
        delete disconnectTimers[timerKey];
    }

    // Update socketId
    player.socketId = newSocketId;
    player.connected = true;
    player.isBot = false; // Player is back

    socket.join(roomID);
    console.log(`♻️ Player ${username} reconnected with socket ID ${newSocketId}`);

    // Update game state references
    const gameManager = require('../game/gameManager');
    const game = gameManager.games[roomID];
    if (game) {
        // Update player list socket IDs
        const gp = game.players.find(p => p.username === username);
        if (gp) {
            gp.socketId = newSocketId;
            gp.connected = true;
        }

        // Update hands map
        if (game.hands[oldSocketId]) {
            game.hands[newSocketId] = game.hands[oldSocketId];
            delete game.hands[oldSocketId];
        }

        // Update trump selector
        if (game.trumpSelector === oldSocketId) {
            game.trumpSelector = newSocketId;
        }

        // Update table plays
        if (game.table) {
            game.table.forEach(play => {
                if (play.playerId === oldSocketId) {
                    play.playerId = newSocketId;
                }
            });
        }

        // Update senior player ID
        if (game.seniorPlayerId === oldSocketId) {
            game.seniorPlayerId = newSocketId;
        }

        // Notify room
        io.to(roomID).emit("player_reconnected", { username });

        // Send full sync state to reconnected player
        socket.emit("reconnect_success", {
            roomID,
            gameState: {
                players: game.players.map(p => ({
                    socketId: p.socketId,
                    username: p.username,
                    team: p.team,
                    connected: p.connected,
                    isBot: p.isBot
                })),
                hand: game.hands[newSocketId] || [],
                table: game.table,
                trump: game.trump,
                trumpRevealed: game.trumpRevealed,
                trumpSelector: game.trumpSelector,
                leadSuit: game.leadSuit,
                scores: game.scores,
                sar: game.sar,
                tricksPlayed: game.tricksPlayed,
                phase: game.phase,
                isYourTurn: (game.phase === "playing" && game.players[game.currentTurnIndex].socketId === newSocketId) ||
                            (game.phase === "choosing_trump" && game.trumpSelector === newSocketId)
            }
        });

        // Trigger turn if it's their turn
        const currentTurnPlayer = game.players[game.currentTurnIndex];
        if (game.phase === "playing" && currentTurnPlayer.socketId === newSocketId) {
            socket.emit("your_turn", { hand: game.hands[newSocketId] });
        } else if (game.phase === "choosing_trump" && game.trumpSelector === newSocketId) {
            socket.emit("choose_trump", { roomID, hand: game.hands[newSocketId] });
        }
    }

    io.to(roomID).emit("room_update", room);
    return true;
}

// =========================
// LEAVE ROOM
// =========================
function leaveRoom(io, socketId) {
    removePlayerFromRooms(io, socketId);
}

// =========================
// EXPORTS
// =========================
module.exports = {
    rooms,
    joinRoom,
    fillWithBots,
    leaveRoom,
    removePlayerFromRooms,
    handleDisconnect,
    reconnectPlayer
};