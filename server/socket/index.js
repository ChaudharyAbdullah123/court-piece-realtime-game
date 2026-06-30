const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const roomManager = require('./roomManager');
const registerCardHandler = require('./handlers/cardHandler');
const registerGameHandler = require('./handlers/gameHandler');
const registerTrumpHandler = require('./handlers/trumpHandler');
const registerReconnectHandler = require('./handlers/reconnectHandler');

let io;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // =========================
    // SOCKET JWT AUTH MIDDLEWARE
    // =========================
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            // Allow unauthenticated connections with a warning (for testing)
            socket.isGuest = true;
            socket.username = `Guest_${Math.floor(10000 + Math.random() * 90000)}`;
            return next();
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            socket.isGuest = decoded.isGuest || false;
            next();
        } catch {
            return next(new Error('Unauthorized: Invalid Token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`👤 Connected: ${socket.id} | Guest: ${socket.isGuest}`);

        // =========================
        // JOIN ROOM (Public matchmaking)
        // =========================
        socket.on('join_room', ({ username, isGuest }) => {
            const guestMode = isGuest || socket.isGuest || false;
            const roomID = roomManager.joinRoom(io, socket, username, guestMode);
            console.log(`✅ ${username} joined → Room: ${roomID} (Guest: ${guestMode})`);
            socket.emit('room_joined', { roomID });
        });

        // =========================
        // CREATE PRIVATE ROOM
        // =========================
        socket.on('create_private_room', ({ username }) => {
            const roomID = roomManager.createRoom(true);
            const room = roomManager.rooms[roomID];

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

            console.log(`🔒 ${username} created private room ${roomID} with code ${room.code}`);

            socket.emit('private_room_created', {
                roomID,
                roomCode: room.code
            });

            io.to(roomID).emit('room_update', room);
        });

        // =========================
        // JOIN PRIVATE ROOM BY CODE
        // =========================
        socket.on('join_by_code', ({ username, roomCode }) => {
            const roomID = roomManager.joinRoomByCode(io, socket, roomCode, username);
            if (roomID) {
                console.log(`✅ ${username} joined private room via code ${roomCode}`);
                socket.emit('room_joined', { roomID, roomCode });
            }
        });

        // =========================
        // JOIN AS SPECTATOR
        // =========================
        socket.on('join_spectator', ({ roomCode }) => {
            const roomID = roomManager.joinAsSpectator(io, socket, roomCode);
            if (roomID) {
                console.log(`👀 Spectator joined room ${roomID}`);
            }
        });

        // =========================
        // LEAVE ROOM
        // =========================
        socket.on('leave_room', () => {
            console.log(`🚪 Player ${socket.id} voluntarily left room`);
            roomManager.removePlayerFromRooms(io, socket.id);
            socket.emit('left_room');
        });

        // =========================
        // REGISTER HANDLERS
        // =========================
        registerGameHandler(io, socket);
        registerCardHandler(io, socket);
        registerTrumpHandler(io, socket);
        registerReconnectHandler(io, socket);

        // =========================
        // DISCONNECT
        // =========================
        socket.on('disconnect', () => {
            console.log(`❌ Disconnected: ${socket.id}`);
            roomManager.handleDisconnect(io, socket.id);
        });
    });
}

module.exports = initSocket;