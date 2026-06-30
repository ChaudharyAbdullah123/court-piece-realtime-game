const { Server } = require('socket.io');

const roomManager = require('./roomManager');

const registerCardHandler =
    require('./handlers/cardHandler');

const registerGameHandler =
    require('./handlers/gameHandler');

const registerTrumpHandler =
    require('./handlers/trumpHandler');

const registerReconnectHandler =
    require('./handlers/reconnectHandler');

let io;

function initSocket(server) {

    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {

        console.log(`👤 Connected: ${socket.id}`);

        // =========================
        // GLOBAL LOGGER
        // =========================

        // Uncomment below to enable verbose event logging during development
        // socket.onAny((event, data) => {
        //     console.log(`📥 EVENT: ${event} FROM ${socket.id}`);
        //     console.log("DATA:", data);
        // });

        // =========================
        // JOIN ROOM
        // =========================

        socket.on('join_room', ({ username }) => {

            const roomID = roomManager.joinRoom(io, socket, username);

            console.log(`✅ ${username} joined → Room: ${roomID}`);

            socket.emit("room_joined", { roomID });
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

            roomManager.handleDisconnect(
                io,
                socket.id
            );
        });
    });
}

module.exports = initSocket;