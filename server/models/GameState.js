class GameState {
    constructor(roomID, players, deck) {

        this.roomID = roomID;

        this.players = players;

        this.deck = deck;

        this.hands = {};

        this.table = [];

        this.trump = null;

        this.trumpHidden = true;

        this.trumpSelector = null;

        this.leadSuit = null;

        this.currentTurnIndex = 0;

        this.dealerIndex = 0;

        this.phase = "waiting";

        this.scores = {
            A: 0,
            B: 0
        };

        this.sar = {
            A: 0,
            B: 0
        };

        this.tricksPlayed = 0;

        this.seniorTeam = null;

        this.initialCards = {};

        this.locked = false;

    }
}

module.exports = GameState;