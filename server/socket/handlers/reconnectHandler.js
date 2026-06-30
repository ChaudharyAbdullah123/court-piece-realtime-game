const roomManager = require('../roomManager');

function registerReconnectHandler(io, socket) {
    socket.on('reconnect_player', ({ roomID, username }) => {
        console.log(`♻️ Player reconnect requested: ${username} in ${roomID}`);
        
        const success = roomManager.reconnectPlayer(io, socket, { roomID, username });
        if (!success) {
            socket.emit('reconnect_failed', { msg: 'Unable to reconnect to room' });
        }
    });
}

module.exports = registerReconnectHandler;