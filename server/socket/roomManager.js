const rooms = {}; // roomID -> { players: [{socketId, username, team}], status }

function joinRoom(io, socket, roomID, username) {
    if (!rooms[roomID]) {
        rooms[roomID] = { players: [], status: 'waiting' };
    }

    rooms[roomID].players.push({ socketId: socket.id, username, team: null });
    socket.join(roomID);

    console.log(`👤 ${username} joined room ${roomID}`);

    io.to(roomID).emit('room_update', rooms[roomID]);
}

function leaveRoom(io, socketId) {
    for (const roomID in rooms) {
        const room = rooms[roomID];
        const index = room.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            room.players.splice(index, 1);
            io.to(roomID).emit('room_update', room);
            console.log(`User ${socketId} left room ${roomID}`);
        }
        if (room.players.length === 0) delete rooms[roomID];
    }
}

module.exports = { joinRoom, leaveRoom, rooms };
