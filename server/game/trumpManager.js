const dealManager = require('./dealManager');
const { getRank } = require('../utils/rankHelper');

function getDealOrder(game) {
    return game.players
        .slice(game.dealerIndex)
        .concat(game.players.slice(0, game.dealerIndex));
}

function handleInitialTrumpSelection(io, game, roomID) {
    let selector = null;
    let safetyCounter = 0;

    // Deal 1 card each to start
    dealManager.dealInitialCards(io, game);

    while (safetyCounter < 10) {
        safetyCounter++;
        console.log(`🃏 Evaluating Initial Cards (Attempt ${safetyCounter}):`, game.initialCards);

        let maxRank = -1;
        let candidates = [];

        for (const player of game.players) {
            const card = game.initialCards[player.socketId];
            if (card) {
                const rank = getRank(card.value);
                if (rank > maxRank) {
                    maxRank = rank;
                    candidates = [player];
                } else if (rank === maxRank) {
                    candidates.push(player);
                }
            }
        }

        if (candidates.length === 1) {
            selector = candidates[0].socketId;
            console.log("🎯 Single winner found:", candidates[0].username);
            break;
        }

        // Tie case: candidates.length > 1
        const firstTeam = candidates[0].team;
        const sameTeam = candidates.every(c => c.team === firstTeam);

        if (sameTeam) {
            // Same team tie: select the one who is clockwise (closest to dealer)
            const dealOrder = getDealOrder(game);
            const winner = dealOrder.find(p => candidates.some(c => c.socketId === p.socketId));
            selector = winner.socketId;
            console.log("✅ Same team tie → Selecting by deal order:", winner.username);
            break;
        } else {
            // Different teams tie: redraw for all 4 players
            console.log("🔁 Opponent tie → Redrawing 1 card each for all players...");
            dealManager.dealInitialCards(io, game);
        }
    }

    if (!selector) {
        console.log("❌ Trump selection failed after retries");
        return null;
    }

    game.trumpSelector = selector;
    console.log("🎯 Trump Selector determined:", selector);

    // Re-create and shuffle the deck so we deal from a full 52-card deck
    const createDeck = require('../utils/createDeck');
    const shuffle = require('../utils/shuffle');
    game.deck = shuffle(createDeck());

    // Give 5 cards to selector
    dealManager.dealTrumpSelectorCards(io, game);

    // Ask for trump (pass hand and roomID)
    io.to(selector).emit("choose_trump", {
        roomID,
        hand: game.hands[selector]
    });

    game.phase = "choosing_trump";

    return selector;
}

module.exports = {
    handleInitialTrumpSelection
};