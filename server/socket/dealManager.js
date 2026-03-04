function getDealOrder(game) {
    return game.players
        .slice(game.dealerIndex)
        .concat(game.players.slice(0, game.dealerIndex));
}

function dealCards(game) {

    const dealOrder = getDealOrder(game);

    game.hands = {};
    dealOrder.forEach(p => {
        game.hands[p.socketId] = [];
    });

    const selectorIndex = dealOrder.findIndex(
        p => p.socketId === game.trumpSelector
    );

    const selector = dealOrder[selectorIndex];

    /* ===============================
       STEP 1: 5 cards to selector
    ================================ */
    for (let i = 0; i < 5; i++) {
        game.hands[selector.socketId].push(game.deck.shift());
    }

    /* ===============================
       STEP 2: 5 cards to other 3
    ================================ */
    for (let i = 1; i < 4; i++) {
        const player = dealOrder[(selectorIndex + i) % 4];

        for (let j = 0; j < 5; j++) {
            game.hands[player.socketId].push(game.deck.shift());
        }
    }

    /* ===============================
       STEP 3: 4 cards to all (round 1)
    ================================ */
    for (let round = 0; round < 4; round++) {
        for (let p of dealOrder) {
            game.hands[p.socketId].push(game.deck.shift());
        }
    }

    /* ===============================
       STEP 4: 4 cards to all (round 2)
    ================================ */
    for (let round = 0; round < 4; round++) {
        for (let p of dealOrder) {
            game.hands[p.socketId].push(game.deck.shift());
        }
    }
}

function distributeHands(io, game, roomID) {

    for (let player of game.players) {
        io.to(player.socketId).emit("receive_hand", {
            hand: game.hands[player.socketId]
        });
    }

    game.phase = "playing";
}

module.exports = {
    dealCards,
    distributeHands
};