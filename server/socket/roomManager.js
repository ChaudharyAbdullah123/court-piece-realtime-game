const rooms = {};
let roomCounter = 1;
const disconnectTimers = {};

const BOT_NAMES = ['Ahmad 🤖', 'Bilal 🤖', 'Tariq 🤖', 'Kamran 🤖'];

// ===============================================================
// GENERATE UNIQUE ROOM CODE
// ===============================================================
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code, unique = false;
    while (!unique) {
        code = '';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        unique = !Object.values(rooms).some(r => r.code === code);
    }
    return code;
}

// ===============================================================
// BASE ROOM FACTORY
// ===============================================================
function createBaseRoom(isPrivate = false, mode = 'friends') {
    const roomID   = `room${roomCounter++}`;
    const roomCode = generateRoomCode();
    rooms[roomID]  = {
        roomID,
        code:        roomCode,
        players:     [],
        spectators:  [],
        status:      'waiting',
        gameStarted: false,
        isPrivate,
        mode,            // 'bots' | 'friends'
        createdAt:   Date.now()
    };
    console.log(`🆕 Room ${roomID} | Code: ${roomCode} | Mode: ${mode}`);
    return roomID;
}

// ===============================================================
// CREATE ROOM (generic, kept for backward-compat with createRoom(true))
// ===============================================================
function createRoom(isPrivate = false) {
    return createBaseRoom(isPrivate, 'friends');
}

// ===============================================================
// MODE A — PLAY WITH BOTS (instant, 1-2 humans + bots)
// ===============================================================
function createBotRoom(io, socket, username) {
    removePlayerFromRooms(io, socket.id);

    const roomID = createBaseRoom(true, 'bots');
    const room   = rooms[roomID];
    room.isGuestRoom = true; // marks room as guest-isolated (no friend requests allowed)

    // Add the real player
    room.players.push({
        socketId:  socket.id,
        userId:    socket.userId   || null,
        username:  username        || socket.username,
        photoURL:  socket.photoURL || '',
        isGuest:   socket.isGuest  !== false,
        connected: true,
        joinedAt:  Date.now(),
        team:      null,
        isBot:     false
    });
    room.owner = socket.id;
    socket.join(roomID);

    console.log(`🎮 Bot Room created: ${roomID} for ${username}`);

    // Fill remaining seats with bots immediately
    _fillWithBots(room);
    io.to(roomID).emit('room_update', room);
    socket.emit('room_joined', { roomID, roomCode: room.code, mode: 'bots' });

    // Auto-start game after 2 seconds
    setTimeout(() => {
        if (!rooms[roomID]) return;
        const gameManager = require('../game/gameManager');
        room.gameStarted  = true;
        gameManager.startGame(io, roomID);
    }, 2000);

    return roomID;
}

// ===============================================================
// MODE B — PLAY WITH FRIENDS (4 humans, no bots at start)
// ===============================================================
function createFriendsRoom(io, socket, username) {
    removePlayerFromRooms(io, socket.id);

    const roomID = createBaseRoom(true, 'friends');
    const room   = rooms[roomID];

    room.players.push({
        socketId:  socket.id,
        userId:    socket.userId   || null,
        username:  username        || socket.username,
        photoURL:  socket.photoURL || '',
        isGuest:   socket.isGuest  !== false,
        connected: true,
        joinedAt:  Date.now(),
        team:      null,
        isBot:     false
    });
    room.owner = socket.id;
    socket.join(roomID);

    console.log(`👥 Friends Room created: ${roomID} | Code: ${room.code} | Owner: ${username}`);

    io.to(roomID).emit('room_update', room);
    socket.emit('private_room_created', { roomID, roomCode: room.code, mode: 'friends' });
    socket.emit('room_joined', { roomID, roomCode: room.code, mode: 'friends' });

    return roomID;
}

// ===============================================================
// JOIN ROOM BY CODE (both modes)
// ===============================================================
function joinRoomByCode(io, socket, roomCode, username) {
    removePlayerFromRooms(io, socket.id);

    const entry = Object.values(rooms).find(r => r.code === roomCode);
    if (!entry) {
        socket.emit('error', { msg: 'Room not found: ' + roomCode });
        return null;
    }
    if (entry.players.length >= 4) {
        socket.emit('error', { msg: 'Room is full' });
        return null;
    }
    if (entry.gameStarted) {
        socket.emit('error', { msg: 'Game already started' });
        return null;
    }

    entry.players.push({
        socketId:  socket.id,
        userId:    socket.userId   || null,
        username:  username        || socket.username,
        photoURL:  socket.photoURL || '',
        isGuest:   socket.isGuest  !== false,
        connected: true,
        joinedAt:  Date.now(),
        team:      null,
        isBot:     false
    });

    socket.join(entry.roomID);
    console.log(`🔑 ${username} joined room ${entry.roomID} via code`);

    io.to(entry.roomID).emit('room_update', entry);
    socket.emit('room_joined', { roomID: entry.roomID, roomCode: entry.code, mode: entry.mode });

    return entry.roomID;
}

// ===============================================================
// START FRIENDS GAME (owner calls this when all 4 seats filled)
// ===============================================================
function startFriendsGame(io, socket, roomID) {
    const room = rooms[roomID];
    if (!room) return;
    if (room.owner !== socket.id) {
        socket.emit('error', { msg: 'Only the room owner can start the game' });
        return;
    }

    // Fill any empty seats with bots if < 4 players
    _fillWithBots(room);

    const gameManager = require('../game/gameManager');
    room.gameStarted  = true;
    io.to(roomID).emit('room_update', room);
    gameManager.startGame(io, roomID);
    console.log(`🚀 Friends game started in room ${roomID}`);
}

// ===============================================================
// JOIN AS SPECTATOR
// ===============================================================
function joinAsSpectator(io, socket, roomCode) {
    removePlayerFromRooms(io, socket.id);

    const entry = Object.values(rooms).find(r => r.code === roomCode);
    if (!entry) { socket.emit('error', { msg: 'Room not found' }); return null; }

    if (!entry.spectators) entry.spectators = [];
    entry.spectators.push(socket.id);
    socket.join(entry.roomID);

    console.log(`👀 Spectator ${socket.id} joined room ${entry.roomID}`);

    const gameManager = require('../game/gameManager');
    const game = gameManager.games[entry.roomID];

    socket.emit('spectator_joined', {
        roomID: entry.roomID,
        gameState: game ? {
            players:          game.players.map(p => ({ socketId: p.socketId, username: p.username, team: p.team, connected: p.connected, isBot: p.isBot })),
            table:            game.table,
            trump:            game.trump,
            trumpRevealed:    game.trumpRevealed,
            trumpSelector:    game.trumpSelector,
            leadSuit:         game.leadSuit,
            scores:           game.scores,
            sar:              game.sar,
            tricksPlayed:     game.tricksPlayed,
            phase:            game.phase,
            currentTurnIndex: game.currentTurnIndex
        } : null
    });

    io.to(entry.roomID).emit('room_update', entry);
    return entry.roomID;
}

// ===============================================================
// INTERNAL: FILL WITH BOTS
// ===============================================================
function _fillWithBots(room) {
    let botIdx = 0;
    while (room.players.length < 4) {
        room.players.push({
            socketId:  `bot_${room.roomID}_${botIdx}`,
            username:  BOT_NAMES[botIdx % BOT_NAMES.length],
            connected: true,
            joinedAt:  Date.now(),
            team:      null,
            isBot:     true
        });
        botIdx++;
    }
}

// Public wrapper kept for existing callers
function fillWithBots(io, roomID) {
    const room = rooms[roomID];
    if (!room) return;
    _fillWithBots(room);
    io.to(roomID).emit('room_update', room);
}

// ===============================================================
// REMOVE PLAYER FROM ROOMS
// ===============================================================
function removePlayerFromRooms(io, socketId) {
    for (const roomID in rooms) {
        const room = rooms[roomID];

        const idx = room.players.findIndex(p => p.socketId === socketId);
        if (idx !== -1) {
            const removed = room.players.splice(idx, 1)[0];
            console.log(`🚪 ${removed.username} removed from ${roomID}`);
            io.to(roomID).emit('room_update', room);

            const active = room.players.filter(p => p.connected || p.isBot).length;
            if (room.gameStarted && active < 4) {
                room.status = 'paused';
                io.to(roomID).emit('game_paused', { msg: 'A player left the game' });
            }
        }

        if (room.spectators) {
            const si = room.spectators.indexOf(socketId);
            if (si !== -1) room.spectators.splice(si, 1);
        }

        if (room.players.length === 0 && (!room.spectators || room.spectators.length === 0)) {
            delete rooms[roomID];
        }
    }
}

// ===============================================================
// DISCONNECT HANDLER
// ===============================================================
function handleDisconnect(io, socketId) {
    for (const roomID in rooms) {
        const room   = rooms[roomID];
        const player = room.players.find(p => p.socketId === socketId);

        if (player) {
            console.log(`❌ Disconnected: ${player.username} from ${roomID}`);

            if (room.gameStarted) {
                player.connected = false;
                io.to(roomID).emit('player_disconnected', { username: player.username, graceTime: 15 });

                const key = `${roomID}_${player.username}`;
                if (disconnectTimers[key]) clearTimeout(disconnectTimers[key]);

                disconnectTimers[key] = setTimeout(() => {
                    console.log(`🤖 Bot takeover for ${player.username} in ${roomID}`);
                    player.isBot = true;
                    io.to(roomID).emit('bot_takeover', { username: player.username });
                    const gameManager = require('../game/gameManager');
                    gameManager.checkAndTriggerBotTurn(io, roomID);
                    delete disconnectTimers[key];
                }, 15000);
            } else {
                removePlayerFromRooms(io, socketId);
            }
        }

        if (room.spectators?.includes(socketId)) {
            removePlayerFromRooms(io, socketId);
        }
    }
}

// ===============================================================
// RECONNECT PLAYER
// ===============================================================
function reconnectPlayer(io, socket, { roomID, username }) {
    const room = rooms[roomID];
    if (!room) return false;

    const player = room.players.find(p => p.username === username);
    if (!player) return false;

    const oldSocketId = player.socketId;
    const newSocketId = socket.id;

    const key = `${roomID}_${username}`;
    if (disconnectTimers[key]) { clearTimeout(disconnectTimers[key]); delete disconnectTimers[key]; }

    player.socketId  = newSocketId;
    player.connected = true;
    player.isBot     = false;

    socket.join(roomID);
    console.log(`♻️ ${username} reconnected → ${newSocketId}`);

    const gameManager = require('../game/gameManager');
    const game = gameManager.games[roomID];
    if (game) {
        const gp = game.players.find(p => p.username === username);
        if (gp) { gp.socketId = newSocketId; gp.connected = true; }

        if (game.hands[oldSocketId]) { game.hands[newSocketId] = game.hands[oldSocketId]; delete game.hands[oldSocketId]; }
        if (game.trumpSelector === oldSocketId)  game.trumpSelector = newSocketId;
        if (game.seniorPlayerId === oldSocketId) game.seniorPlayerId = newSocketId;
        game.table?.forEach(play => { if (play.playerId === oldSocketId) play.playerId = newSocketId; });

        io.to(roomID).emit('player_reconnected', { username });

        socket.emit('reconnect_success', {
            roomID,
            gameState: {
                players:          game.players.map(p => ({ socketId: p.socketId, username: p.username, team: p.team, connected: p.connected, isBot: p.isBot })),
                hand:             game.hands[newSocketId] || [],
                table:            game.table,
                trump:            game.trump,
                trumpRevealed:    game.trumpRevealed,
                trumpSelector:    game.trumpSelector,
                leadSuit:         game.leadSuit,
                scores:           game.scores,
                sar:              game.sar,
                tricksPlayed:     game.tricksPlayed,
                phase:            game.phase,
                isYourTurn:       (game.phase === 'playing' && game.players[game.currentTurnIndex]?.socketId === newSocketId) ||
                                  (game.phase === 'choosing_trump' && game.trumpSelector === newSocketId)
            }
        });

        const cur = game.players[game.currentTurnIndex];
        if (game.phase === 'playing'        && cur?.socketId === newSocketId) socket.emit('your_turn',     { hand: game.hands[newSocketId] });
        if (game.phase === 'choosing_trump' && game.trumpSelector === newSocketId) socket.emit('choose_trump', { roomID, hand: game.hands[newSocketId] });
    }

    io.to(roomID).emit('room_update', room);
    return true;
}

// ===============================================================
// JOIN ROOM — backward-compat wrapper used by tests & old callers
// Routes: guests → bot room, non-guests → friends room
// ===============================================================
function joinRoom(io, socket, username, isGuest) {
    if (isGuest) {
        return createBotRoom(io, socket, username);
    } else {
        return createFriendsRoom(io, socket, username);
    }
}

module.exports = {
    rooms,
    createRoom,
    joinRoom,
    createBotRoom,
    createFriendsRoom,
    startFriendsGame,
    joinRoomByCode,
    joinAsSpectator,
    fillWithBots,
    removePlayerFromRooms,
    handleDisconnect,
    reconnectPlayer
};