const rooms = {};
let roomCounter = 1;
const disconnectTimers = {};

// =========================
// GENERATE UNIQUE ROOM CODE
// =========================
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let unique = false;
    while (!unique) {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        unique = true;
        for (const roomID in rooms) {
            if (rooms[roomID].code === code) {
                unique = false;
                break;
            }
        }
    }
    return code;
}

// =========================
// CREATE ROOM
// =========================
function createRoom(isPrivate = false) {
    const roomID = `room${roomCounter++}`;
    const roomCode = generateRoomCode();
    rooms[roomID] = {
        roomID,
        code: roomCode,
        players: [],
        spectators: [],
        status: "waiting",
        gameStarted: false,
        isPrivate,
        isGuestRoom: false,
        createdAt: Date.now()
    };
    console.log(`🆕 Room Created: ${roomID} (Code: ${roomCode}, Private: ${isPrivate})`);
    return roomID;
}

// =========================
// JOIN ROOM (MATCHMAKING)
// =========================
function joinRoom(io, socket, username, isGuest = false) {
    removePlayerFromRooms(io, socket.id);

    // If player is a guest, force them into an isolated bot-only room immediately
    if (isGuest) {
        const roomID = `room${roomCounter++}`;
        const roomCode = generateRoomCode();
        rooms[roomID] = {
            roomID,
            code: roomCode,
            players: [],
            spectators: [],
            status: "waiting",
            gameStarted: false,
            isPrivate: true,
            isGuestRoom: true,
            createdAt: Date.now()
        };

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
        room.owner = socket.id;
        socket.join(roomID);

        console.log(`👤 Guest ${username} joined guest-only room ${roomID}`);

        // Auto fill with bots and start the game after a small delay
        fillWithBots(io, roomID);
        io.to(roomID).emit("room_update", room);

        setTimeout(() => {
            const gameManager = require('../game/gameManager');
            room.gameStarted = true;
            gameManager.startGame(io, roomID);
        }, 1000);

        return roomID;
    }

    // For registered players, find a public, non-guest room
    let roomID = null;
    for (const id in rooms) {
        const room = rooms[id];
        if (room.players.length < 4 && !room.gameStarted && !room.isPrivate && !room.isGuestRoom) {
            roomID = id;
            break;
        }
    }

    if (!roomID) {
        roomID = createRoom(false);
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
    console.log(`Player ${username} joined public room ${roomID}`);

    io.to(roomID).emit("room_update", room);
    return roomID;
}

// =========================
// JOIN ROOM BY CODE (PRIVATE)
// =========================
function joinRoomByCode(io, socket, roomCode, username) {
    removePlayerFromRooms(io, socket.id);

    let foundRoom = null;
    for (const id in rooms) {
        if (rooms[id].code === roomCode) {
            foundRoom = rooms[id];
            break;
        }
    }

    if (!foundRoom) {
        socket.emit("error", { msg: "Room not found with code: " + roomCode });
        return null;
    }

    if (foundRoom.players.length >= 4) {
        socket.emit("error", { msg: "Room is full" });
        return null;
    }

    if (foundRoom.gameStarted) {
        socket.emit("error", { msg: "Game already started in this room" });
        return null;
    }

    const player = {
        socketId: socket.id,
        username,
        connected: true,
        joinedAt: Date.now(),
        team: null,
        isBot: false
    };

    foundRoom.players.push(player);

    if (foundRoom.players.length === 1) {
        foundRoom.owner = socket.id;
    }

    socket.join(foundRoom.roomID);
    console.log(`Player ${username} joined private room ${foundRoom.roomID} via code`);

    io.to(foundRoom.roomID).emit("room_update", foundRoom);
    return foundRoom.roomID;
}

// =========================
// JOIN AS SPECTATOR
// =========================
function joinAsSpectator(io, socket, roomCode) {
    removePlayerFromRooms(io, socket.id);

    let foundRoom = null;
    for (const id in rooms) {
        if (rooms[id].code === roomCode) {
            foundRoom = rooms[id];
            break;
        }
    }

    if (!foundRoom) {
        socket.emit("error", { msg: "Room not found with code: " + roomCode });
        return null;
    }

    if (!foundRoom.spectators) {
        foundRoom.spectators = [];
    }

    foundRoom.spectators.push(socket.id);
    socket.join(foundRoom.roomID);

    console.log(`👀 Spectator ${socket.id} joined room ${foundRoom.roomID}`);

    const gameManager = require('../game/gameManager');
    const game = gameManager.games[foundRoom.roomID];
    
    socket.emit("spectator_joined", { 
        roomID: foundRoom.roomID, 
        gameState: game ? {
            players: game.players.map(p => ({
                socketId: p.socketId,
                username: p.username,
                team: p.team,
                connected: p.connected,
                isBot: p.isBot
            })),
            table: game.table,
            trump: game.trump,
            trumpRevealed: game.trumpRevealed,
            trumpSelector: game.trumpSelector,
            leadSuit: game.leadSuit,
            scores: game.scores,
            sar: game.sar,
            tricksPlayed: game.tricksPlayed,
            phase: game.phase,
            currentTurnIndex: game.currentTurnIndex
        } : null 
    });

    io.to(foundRoom.roomID).emit("room_update", foundRoom);
    return foundRoom.roomID;
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
        
        // Clean up from players list
        const index = room.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            const removedPlayer = room.players[index];
            room.players.splice(index, 1);
            console.log(`🚪 Player ${removedPlayer.username} removed from ${roomID}`);

            io.to(roomID).emit("room_update", room);

            const activeCount = room.players.filter(p => p.connected || p.isBot).length;
            if (room.gameStarted && activeCount < 4) {
                room.gameStarted = false;
                room.status = "paused";
                io.to(roomID).emit("game_paused", { msg: "Not enough active players" });
                console.log(`⏸ Game paused in ${roomID}`);
            }
        }

        // Clean up from spectators list
        if (room.spectators) {
            const specIndex = room.spectators.indexOf(socketId);
            if (specIndex !== -1) {
                room.spectators.splice(specIndex, 1);
                console.log(`👀 Spectator ${socketId} left room ${roomID}`);
                io.to(roomID).emit("room_update", room);
            }
        }

        // Delete empty room
        if (room.players.length === 0 && (!room.spectators || room.spectators.length === 0)) {
            console.log(`🗑 Room Deleted: ${roomID}`);
            delete rooms[roomID];
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

                    const gameManager = require('../game/gameManager');
                    gameManager.checkAndTriggerBotTurn(io, roomID);

                    delete disconnectTimers[timerKey];
                }, 15000);
            } else {
                removePlayerFromRooms(io, socketId);
            }
        }

        // Disconnecting spectator
        if (room.spectators && room.spectators.includes(socketId)) {
            removePlayerFromRooms(io, socketId);
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

    const timerKey = `${roomID}_${username}`;
    if (disconnectTimers[timerKey]) {
        clearTimeout(disconnectTimers[timerKey]);
        delete disconnectTimers[timerKey];
    }

    player.socketId = newSocketId;
    player.connected = true;
    player.isBot = false;

    socket.join(roomID);
    console.log(`♻️ Player ${username} reconnected with socket ID ${newSocketId}`);

    const gameManager = require('../game/gameManager');
    const game = gameManager.games[roomID];
    if (game) {
        const gp = game.players.find(p => p.username === username);
        if (gp) {
            gp.socketId = newSocketId;
            gp.connected = true;
        }

        if (game.hands[oldSocketId]) {
            game.hands[newSocketId] = game.hands[oldSocketId];
            delete game.hands[oldSocketId];
        }

        if (game.trumpSelector === oldSocketId) {
            game.trumpSelector = newSocketId;
        }

        if (game.table) {
            game.table.forEach(play => {
                if (play.playerId === oldSocketId) {
                    play.playerId = newSocketId;
                }
            });
        }

        if (game.seniorPlayerId === oldSocketId) {
            game.seniorPlayerId = newSocketId;
        }

        io.to(roomID).emit("player_reconnected", { username });

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

function leaveRoom(io, socketId) {
    removePlayerFromRooms(io, socketId);
}

// =========================
// EXPORTS
// =========================
module.exports = {
    rooms,
    createRoom,
    joinRoom,
    joinRoomByCode,
    joinAsSpectator,
    fillWithBots,
    leaveRoom,
    removePlayerFromRooms,
    handleDisconnect,
    reconnectPlayer
};