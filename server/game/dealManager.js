function getDealOrder(game) {

    return game.players
        .slice(game.dealerIndex)
        .concat(game.players.slice(0, game.dealerIndex));
}

// =========================
// 🃏 STEP 1 → ONE CARD EACH
// =========================

function dealInitialCards(io, game) {

    const dealOrder = getDealOrder(game);

    game.initialCards = {};

    for (const player of dealOrder) {

        const card = game.deck.shift();

        game.initialCards[player.socketId] = card;

        io.to(player.socketId).emit(
            "initial_card",
            {
                card
            }

        );
    }
}

// =========================
// 🃏 STEP 2 → SELECTOR GETS 5
// =========================

function dealTrumpSelectorCards(io, game) {

    const selector = game.players.find(
        p => p.socketId === game.trumpSelector
    );

    if (!selector) {
        console.log("❌ Trump selector not found");
        return;
    }

    // create hands object
    if (!game.hands) {
        game.hands = {};
    }

    game.hands[selector.socketId] = [];

    for (let i = 0; i < 5; i++) {

        game.hands[selector.socketId]
            .push(game.deck.shift());
    }

    io.to(selector.socketId).emit(
        "receive_hand",
        {
            hand: game.hands[selector.socketId]
        }
    );

    game.phase = "choosing_trump";
}

// =========================
// 🃏 STEP 3 → COMPLETE DEAL
// =========================

function completeDeal(io, game) {

    const dealOrder = getDealOrder(game);

    // =========================
    // CREATE HANDS
    // =========================

    for (const player of dealOrder) {

        if (!game.hands[player.socketId]) {
            game.hands[player.socketId] = [];
        }
    }

    // =========================
    // OTHER PLAYERS GET 5
    // =========================

    for (const player of dealOrder) {

        if (player.socketId === game.trumpSelector)
            continue;

        for (let i = 0; i < 5; i++) {
            if (game.deck.length === 0) {
                console.log("❌ Deck Empty");
                return;
            }
            game.hands[player.socketId]
                .push(game.deck.shift());
        }
    }

    // =========================
    // ALL PLAYERS GET +4
    // =========================

    for (let round = 0; round < 4; round++) {

        for (const player of dealOrder) {

            game.hands[player.socketId]
                .push(game.deck.shift());
        }
    }

    // =========================
    // ALL PLAYERS GET +4 AGAIN
    // =========================

    for (let round = 0; round < 4; round++) {

        for (const player of dealOrder) {

            game.hands[player.socketId]
                .push(game.deck.shift());
        }
    }

    // =========================
    // SEND FINAL HANDS
    // =========================

    for (const player of dealOrder) {

        io.to(player.socketId).emit(
            "receive_hand",
            {
                hand: game.hands[player.socketId]
            }
        );
    }

    game.phase = "playing";
}

module.exports = {
    dealInitialCards,
    dealTrumpSelectorCards,
    completeDeal
};