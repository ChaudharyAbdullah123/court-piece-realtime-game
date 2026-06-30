/**
 * MODULE TEST: roomManager (Room codes, private rooms, spectators, disconnect, reconnect)
 */

const { test, assert, assertEqual, summary } = require('./testRunner');

console.log('\n📋 TESTING: roomManager (Room Management System)');
console.log('='.repeat(50));

// We need a mock io object since roomManager uses io.to().emit()
const mockIo = {
    emitted: [],
    to: function(room) {
        return {
            emit: (_event, _data) => {
                mockIo.emitted.push({ room, event: _event, data: _data });
            }
        };
    },
    reset: function() { mockIo.emitted = []; }
};

// Mock socket
function makeSocket(id) {
    const joined = [];
    return {
        id,
        isGuest: false,
        joinedRooms: joined,
        join: (room) => joined.push(room),
        emit: (event, data) => {}
    };
}

// Fresh roomManager state each test
function freshRoomManager() {
    // Clear the rooms cache between tests by using a fresh require
    Object.keys(require.cache).forEach(key => {
        if (key.includes('roomManager')) delete require.cache[key];
    });
    return require('../socket/roomManager');
}

test('1. Create public room returns valid roomID and code', () => {
    const rm = freshRoomManager();
    const roomID = rm.createRoom(false);
    assert(roomID !== undefined && roomID !== null, 'RoomID should exist');
    const room = rm.rooms[roomID];
    assert(room !== undefined, 'Room should be stored in rooms object');
    assert(room.code && room.code.length === 6, 'Room code should be 6 characters');
    assert(room.isPrivate === false, 'Public room should not be private');
});

test('2. Create private room is marked as private', () => {
    const rm = freshRoomManager();
    const roomID = rm.createRoom(true);
    const room = rm.rooms[roomID];
    assert(room.isPrivate === true, 'Private room should be marked isPrivate');
});

test('3. Public join adds player to room', () => {
    const rm = freshRoomManager();
    mockIo.reset();
    const socket = makeSocket('socket_P1');
    const roomID = rm.joinRoom(mockIo, socket, 'Alice', false);
    const room = rm.rooms[roomID];
    assert(room !== undefined, 'Room should exist');
    assertEqual(room.players.length, 1, 'Room should have 1 player');
    assertEqual(room.players[0].username, 'Alice', 'Player username should be Alice');
});

test('4. Guest join creates isolated bot-only room', () => {
    const rm = freshRoomManager();
    mockIo.reset();
    const socket = makeSocket('socket_guest1');
    const roomID = rm.joinRoom(mockIo, socket, 'Guest_11111', true);
    const room = rm.rooms[roomID];
    assert(room !== undefined, 'Guest room should exist');
    assert(room.isGuestRoom === true, 'Room should be marked as guest room');
    // Should have bots filled in
    assert(room.players.length >= 1, 'Guest room should have at least the guest player');
});

test('5. Join by code finds correct private room', () => {
    const rm = freshRoomManager();
    mockIo.reset();

    // First add a player to create the room, THEN try to join by code
    const ownerSocket = makeSocket('socket_owner');
    const roomID = rm.createRoom(true);
    const room = rm.rooms[roomID];
    const code = room.code;

    // Manually add owner so the room is not empty (avoids deletion)
    room.players.push({
        socketId: ownerSocket.id,
        username: 'Owner',
        connected: true,
        joinedAt: Date.now(),
        team: null,
        isBot: false
    });
    ownerSocket.join(roomID);

    const socket = makeSocket('socket_P2');
    const joinedRoomID = rm.joinRoomByCode(mockIo, socket, code, 'Bob');
    assertEqual(joinedRoomID, roomID, 'Should join the correct room by code');
    assertEqual(room.players.length, 2, 'Room should have 2 players (Owner + Bob)');
});

test('6. Join by invalid code returns null', () => {
    const rm = freshRoomManager();
    mockIo.reset();
    const socket = makeSocket('socket_P3');
    const result = rm.joinRoomByCode(mockIo, socket, 'XXXXXX', 'Charlie');
    assert(result === null, 'Invalid code should return null');
});

test('7. Fill with bots fills room to 4 players', () => {
    const rm = freshRoomManager();
    mockIo.reset();
    const socket = makeSocket('socket_P1');
    const roomID = rm.joinRoom(mockIo, socket, 'Alice', false);
    rm.fillWithBots(mockIo, roomID);
    const room = rm.rooms[roomID];
    assertEqual(room.players.length, 4, 'Room should have 4 players after fillWithBots');
    const bots = room.players.filter(p => p.isBot);
    assertEqual(bots.length, 3, 'Should have 3 bots added');
});

test('8. Remove player cleans up empty room', () => {
    const rm = freshRoomManager();
    mockIo.reset();
    const socket = makeSocket('socket_P1');
    const roomID = rm.joinRoom(mockIo, socket, 'Alice', false);
    rm.removePlayerFromRooms(mockIo, socket.id);
    assert(rm.rooms[roomID] === undefined, 'Empty room should be deleted');
});

test('9. Room spectators array exists', () => {
    const rm = freshRoomManager();
    const roomID = rm.createRoom(true);
    const room = rm.rooms[roomID];
    assert(Array.isArray(room.spectators), 'Room should have spectators array');
});

summary();
