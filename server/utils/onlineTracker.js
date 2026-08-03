const onlineUsers = new Map(); // userId -> Set of socketIds

module.exports = {
    add: (userId, socketId) => {
        const uid = userId.toString();
        if (!onlineUsers.has(uid)) {
            onlineUsers.set(uid, new Set());
        }
        onlineUsers.get(uid).add(socketId);
    },
    remove: (userId, socketId) => {
        const uid = userId.toString();
        if (onlineUsers.has(uid)) {
            const sockets = onlineUsers.get(uid);
            sockets.delete(socketId);
            if (sockets.size === 0) {
                onlineUsers.delete(uid);
            }
        }
    },
    has: (userId) => {
        if (!userId) return false;
        return onlineUsers.has(userId.toString());
    },
    getSocketIds: (userId) => {
        const uid = userId.toString();
        return onlineUsers.has(uid) ? Array.from(onlineUsers.get(uid)) : [];
    },
    listOnlineUserIds: () => {
        return Array.from(onlineUsers.keys());
    }
};
