// const rooms = {}; // roomID -> { players: [], status, gameStarted }

// let roomCounter = 1;

// // ------------------ CREATE NEW ROOM ------------------
// function createRoom() {
//     const roomID = "room" + roomCounter++;

//     rooms[roomID] = {
//         players: [],
//         status: "waiting",
//         gameStarted: false
//     };

//     console.log("🆕 New Room Created:", roomID);

//     return roomID;
// }

// // ------------------ FIND AVAILABLE ROOM ------------------
// function findAvailableRoom() {
//     for (let roomID in rooms) {
//         const room = rooms[roomID];

//         if (
//             room.players.length < 4 &&
//             room.gameStarted === false
//         ) {
//             return roomID;
//         }
//     }
//     return null;
// }

// // ------------------ REMOVE PLAYER FROM ALL ROOMS ------------------
// function removePlayerFromRooms(io, socket) {
//     for (const roomID in rooms) {
//         const room = rooms[roomID];

//         const index = room.players.findIndex(p => p.socketId === socket.id);

//         if (index !== -1) {
//             const removedPlayer = room.players[index];

//             room.players.splice(index, 1);

//             socket.leave(roomID);

//             console.log(`🚪 ${removedPlayer.username} removed from ${roomID}`);

//             // Notify remaining players
//             io.to(roomID).emit('room_update', room);

//             // 🚨 If game was started → pause it
//             if (room.gameStarted && room.players.length < 4) {
//                 room.status = "waiting";
//                 room.gameStarted = false;

//                 console.log(`⚠️ Game paused in ${roomID} (player left)`);

//                 io.to(roomID).emit("game_paused", {
//                     msg: "A player left. Waiting for players..."
//                 });
//             }

//             // Delete empty room
//             if (room.players.length === 0) {
//                 console.log(`🗑 Room deleted: ${roomID}`);
//                 delete rooms[roomID];
//             }
//         }
//     }
// }

// // ------------------ JOIN ROOM ------------------
// function joinRoom(io, socket, username) {

//     // 🔥 STEP 1: REMOVE FROM OLD ROOM FIRST
//     removePlayerFromRooms(io, socket);

//     // 🔍 STEP 2: FIND AVAILABLE ROOM
//     let roomID = findAvailableRoom();

//     // If no room → create new
//     if (!roomID) {
//         roomID = createRoom();
//     }

//     const room = rooms[roomID];

//     // Safety check
//     if (room.players.length >= 4 || room.gameStarted) {
//         roomID = createRoom();
//     }

//     const player = {
//         socketId: socket.id,
//         username,
//         team: null
//     };

//     rooms[roomID].players.push(player);

//     socket.join(roomID);

//     console.log(`👤 ${username} joined room ${roomID}`);

//     io.to(roomID).emit('room_update', rooms[roomID]);

//     return roomID;
// }

// // ------------------ LEAVE ROOM ------------------
// function leaveRoom(io, socketId) {
//     for (const roomID in rooms) {
//         const room = rooms[roomID];

//         const index = room.players.findIndex(p => p.socketId === socketId);

//         if (index !== -1) {
//             const removedPlayer = room.players[index];

//             room.players.splice(index, 1);

//             console.log(`👤 ${removedPlayer.username} left room ${roomID}`);

//             io.to(roomID).emit('room_update', room);

//             // Pause game if needed
//             if (room.gameStarted && room.players.length < 4) {
//                 room.status = "waiting";
//                 room.gameStarted = false;

//                 io.to(roomID).emit("game_paused", {
//                     msg: "A player left. Waiting..."
//                 });
//             }
//         }

//         // Delete empty room
//         if (room.players.length === 0) {
//             console.log(`🗑 Room deleted: ${roomID}`);
//             delete rooms[roomID];
//         }
//     }
// }

// module.exports = { joinRoom, leaveRoom, rooms };