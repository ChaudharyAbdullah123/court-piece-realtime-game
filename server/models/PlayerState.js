class PlayerState {
    constructor(socketId, username) {

        this.socketId = socketId;

        this.username = username;

        this.team = null;

        this.connected = true;

        this.hand = [];
    }
}

module.exports = PlayerState;