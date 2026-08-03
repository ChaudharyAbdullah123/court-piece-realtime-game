const { Server } = require('socket.io');
const jwt         = require('jsonwebtoken');
const roomManager = require('./roomManager');
const registerCardHandler      = require('./handlers/cardHandler');
const registerGameHandler      = require('./handlers/gameHandler');
const registerTrumpHandler     = require('./handlers/trumpHandler');
const registerReconnectHandler = require('./handlers/reconnectHandler');

let io;

function initSocket(server) {
    io = new Server(server, {
        cors: { origin: '*', methods: ['GET', 'POST'] }
    });

    // ──────────────────────────────────────────────────────────────
    // AUTH MIDDLEWARE
    // ──────────────────────────────────────────────────────────────
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            socket.isGuest   = true;
            socket.username  = `Guest_${Math.floor(10000 + Math.random() * 90000)}`;
            socket.photoURL  = '';
            return next();
        }
        try {
            const decoded    = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId    = decoded.id;
            socket.isGuest   = decoded.isGuest || false;
            socket.username  = decoded.username || '';
            socket.photoURL  = decoded.photoURL || '';

            if (!socket.photoURL && socket.userId && !socket.isGuest) {
                try {
                    const User = require('../models/User');
                    const u = await User.findById(socket.userId).select('photoURL username');
                    if (u) {
                        socket.photoURL = u.photoURL || '';
                        if (!socket.username) socket.username = u.username;
                    }
                } catch (e) {}
            }
            next();
        } catch {
            return next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`👤 Connected: ${socket.id} | Guest: ${socket.isGuest}`);

        // Register in online tracker
        if (socket.userId && !socket.isGuest) {
            const onlineTracker = require('../utils/onlineTracker');
            onlineTracker.add(socket.userId, socket.id);
            io.emit('user_status_changed', { userId: socket.userId, online: true });
        }

        // ──────────────────────────────────────────────────────────
        // MODE A — PLAY WITH BOTS (instant, auto-filled)
        // ──────────────────────────────────────────────────────────
        socket.on('play_with_bots', ({ username }) => {
            const roomID = roomManager.createBotRoom(io, socket, username);
            console.log(`✅ Bot room created: ${roomID} for ${username}`);
        });

        // ──────────────────────────────────────────────────────────
        // MODE B — PLAY WITH FRIENDS (private, 4 humans)
        // ──────────────────────────────────────────────────────────
        socket.on('play_with_friends', ({ username }) => {
            const roomID = roomManager.createFriendsRoom(io, socket, username);
            console.log(`✅ Friends room created: ${roomID} for ${username}`);
        });

        // ──────────────────────────────────────────────────────────
        // START FRIENDS GAME (room owner only)
        // ──────────────────────────────────────────────────────────
        socket.on('start_friends_game', ({ roomID }) => {
            roomManager.startFriendsGame(io, socket, roomID);
        });

        // ──────────────────────────────────────────────────────────
        // JOIN PRIVATE ROOM BY CODE
        // ──────────────────────────────────────────────────────────
        socket.on('join_by_code', ({ username, roomCode }) => {
            const roomID = roomManager.joinRoomByCode(io, socket, roomCode, username);
            if (roomID) console.log(`✅ ${username} joined via code ${roomCode} → ${roomID}`);
        });

        // ──────────────────────────────────────────────────────────
        // JOIN AS SPECTATOR
        // ──────────────────────────────────────────────────────────
        socket.on('join_spectator', ({ roomCode }) => {
            const roomID = roomManager.joinAsSpectator(io, socket, roomCode);
            if (roomID) console.log(`👀 Spectator joined room ${roomID}`);
        });

        // ──────────────────────────────────────────────────────────
        // CHALLENGE FACEBOOK FRIEND
        // ──────────────────────────────────────────────────────────
        socket.on('challenge_friend', ({ friendId }) => {
            if (!socket.userId) return;
            const onlineTracker = require('../utils/onlineTracker');
            if (onlineTracker.has(friendId)) {
                const roomID = roomManager.createFriendsRoom(io, socket, socket.username);
                const room   = roomManager.rooms[roomID];
                const roomCode = room.code;

                // Send invite to friend
                const targetSockets = onlineTracker.getSocketIds(friendId);
                targetSockets.forEach(sId => {
                    io.to(sId).emit('friend_challenge_received', {
                        challengerName: socket.username,
                        challengerId:   socket.userId,
                        roomCode,
                        roomID
                    });
                });
                console.log(`📩 Challenge sent from ${socket.username} to friend ${friendId} (Room Code: ${roomCode})`);
            } else {
                socket.emit('error', { msg: 'Friend is offline' });
            }
        });

        // ──────────────────────────────────────────────────────────
        // LEAVE ROOM
        // ──────────────────────────────────────────────────────────
        socket.on('leave_room', () => {
            roomManager.removePlayerFromRooms(io, socket.id);
            socket.emit('left_room');
        });

        // ──────────────────────────────────────────────────────────
        // EMOJI REACTION (Teen Patti style quick chat)
        // ──────────────────────────────────────────────────────────
        socket.on('send_emoji', ({ roomID, emoji }) => {
            const room = roomManager.rooms[roomID];
            if (!room) return;
            io.to(roomID).emit('player_emoji', {
                senderId: socket.id,
                emoji
            });
        });

        // ──────────────────────────────────────────────────────────
        // GAME EVENT HANDLERS
        // ──────────────────────────────────────────────────────────
        registerGameHandler(io, socket);
        registerCardHandler(io, socket);
        registerTrumpHandler(io, socket);
        registerReconnectHandler(io, socket);

        // ──────────────────────────────────────────────────────────
        // DISCONNECT
        // ──────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            console.log(`❌ Disconnected: ${socket.id}`);
            if (socket.userId && !socket.isGuest) {
                const onlineTracker = require('../utils/onlineTracker');
                onlineTracker.remove(socket.userId, socket.id);
                if (!onlineTracker.has(socket.userId)) {
                    io.emit('user_status_changed', { userId: socket.userId, online: false });
                }
            }
            roomManager.handleDisconnect(io, socket.id);
        });
    });
}

module.exports = initSocket;