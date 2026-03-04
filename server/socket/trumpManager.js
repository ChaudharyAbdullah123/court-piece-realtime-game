const { getRank } = require('../utils/rankHelper');

function dealInitialCards(game) {

    game.initialCards = {};

    for (let i = 0; i < 4; i++) {
        const index = (game.dealerIndex + i) % 4;
        const player = game.players[index];

        game.initialCards[player.socketId] = game.deck.shift();
    }
}

function findHighestCandidates(game) {

    let highestRank = -1;
    let candidates = [];

    for (let socketId in game.initialCards) {

        const card = game.initialCards[socketId];
        const rank = getRank(card.value);

        if (rank > highestRank) {
            highestRank = rank;
            candidates = [socketId];
        }
        else if (rank === highestRank) {
            candidates.push(socketId);
        }
    }

    return candidates;
}

function getDealOrder(game) {
    return game.players
        .slice(game.dealerIndex)
        .concat(game.players.slice(0, game.dealerIndex));
}

function resolveTie(game, candidates) {

    const dealOrder = getDealOrder(game);

    const tiedPlayers = dealOrder.filter(p =>
        candidates.includes(p.socketId)
    );

    // Same team tie
    const firstTeam = tiedPlayers[0].team;
    const sameTeam = tiedPlayers.every(p => p.team === firstTeam);

    if (sameTeam) {
        return tiedPlayers[0].socketId;
    }

    // Opponent tie → redeal only tied players
    for (let socketId of candidates) {

        if (game.deck.length === 0) {
            console.log("❌ Deck empty during trump selection");
            return null;
        }

        game.initialCards[socketId] = game.deck.shift();
    }

    return null; // force re-evaluation
}

function determineTrumpSelector(game) {

    let safetyCounter = 0;

    while (safetyCounter < 20) {   // prevent infinite loop
        safetyCounter++;

        const candidates = findHighestCandidates(game);

        if (candidates.length === 1) {
            return candidates[0];
        }

        const resolved = resolveTie(game, candidates);

        if (resolved) {
            return resolved;
        }
    }

    console.log("❌ Trump selection failed after too many retries");
    return null;
}

function handleInitialTrumpSelection(io, game, roomID) {

    dealInitialCards(game);

    for (let socketId in game.initialCards) {
    io.to(socketId).emit("your_initial_card", {
        card: game.initialCards[socketId]
    });
}

    console.log("Initial Cards:");
for (let id in game.initialCards) {
    console.log(id, game.initialCards[id]);
}

    const selector = determineTrumpSelector(game);

    game.trumpSelector = selector;
    game.phase = "choosing_trump";

    io.to(selector).emit("choose_trump", {
        card: game.initialCards[selector],
        roomID
    });

    return selector;
}

module.exports = {
    handleInitialTrumpSelection
};