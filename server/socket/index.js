const { Server } = require('socket.io');
const roomManager = require('./roomManager');
const gameManager = require('./gameManager');

let io;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET","POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`👤 User Connected: ${socket.id}`);

        // Join Room
        socket.on('join_room', ({ roomID, username }) => {
            roomManager.joinRoom(io, socket, roomID, username);
        });

        // Start Game
        socket.on('start_game', ({ roomID }) => {
            gameManager.startGame(io, roomID);
        });

        // Play Card
        socket.on('play_card', (data) => {
            gameManager.playCard(io, socket, data);
        });

        // Trump selected
        socket.on('trump_selected', (data) => {
            gameManager.selectTrump(io, socket, data);
        });

        socket.on('disconnect', () => {
            roomManager.leaveRoom(io, socket.id);
            console.log(`❌ User Disconnected: ${socket.id}`);
        });
    });
}

module.exports = initSocket;
