const { getRank } = require('../utils/rankHelper');
const trickEvaluator = require('./TrickManager');

// Helper to check card values
function getCardValueIndex(card) {
    const order = ['02','03','04','05','06','07','08','09','10','J','Q','K','A'];
    return order.indexOf(card.value);
}

// Check if card A beats card B (under current lead suit and trump suit)
function cardABeatsB(cardA, cardB, leadSuit, trumpSuit) {
    if (cardA.suit === trumpSuit && cardB.suit !== trumpSuit) {
        return true;
    }
    if (cardA.suit === trumpSuit && cardB.suit === trumpSuit) {
        return getCardValueIndex(cardA) > getCardValueIndex(cardB);
    }
    if (cardB.suit === trumpSuit) {
        return false;
    }
    if (cardA.suit === leadSuit && cardB.suit !== leadSuit) {
        return true;
    }
    if (cardA.suit === leadSuit && cardB.suit === leadSuit) {
        return getCardValueIndex(cardA) > getCardValueIndex(cardB);
    }
    return false;
}

// Bot selects trump based on maximum suit count in 5 cards
function selectBotTrump(hand) {
    const counts = { hearts: 0, spades: 0, clubs: 0, diamonds: 0 };
    hand.forEach(c => {
        if (counts[c.suit] !== undefined) {
            counts[c.suit]++;
        }
    });

    let maxSuit = "hearts";
    let maxCount = -1;
    for (const suit in counts) {
        if (counts[suit] > maxCount) {
            maxCount = counts[suit];
            maxSuit = suit;
        }
    }
    return maxSuit;
}

// Bot selects card to play
function selectBotCard(game, botSocketId) {
    const hand = game.hands[botSocketId];
    if (!hand || hand.length === 0) return null;

    const leadSuit = game.leadSuit;
    const trumpSuit = game.trump;

    // Filter playable cards according to lead suit rules
    let playableCards = hand;
    if (leadSuit) {
        const hasLeadSuit = hand.some(c => c.suit === leadSuit);
        if (hasLeadSuit) {
            playableCards = hand.filter(c => c.suit === leadSuit);
        }
    }

    if (playableCards.length === 0) {
        playableCards = hand; // Fallback
    }

    // 1. Bot is leading the trick (first card)
    if (game.table.length === 0) {
        // Play the highest value card
        let bestCard = playableCards[0];
        playableCards.forEach(c => {
            if (getCardValueIndex(c) > getCardValueIndex(bestCard)) {
                bestCard = c;
            }
        });
        return bestCard;
    }

    // 2. Bot is following
    // Find who is currently winning the trick
    const currentWinningPlay = trickEvaluator.evaluateTrick(game);
    const winningPlayerId = currentWinningPlay.playerId;
    const winningCard = currentWinningPlay.card;

    const botPlayer = game.players.find(p => p.socketId === botSocketId);
    const botTeam = botPlayer.team;
    const winningPlayer = game.players.find(p => p.socketId === winningPlayerId);
    const winningTeam = winningPlayer.team;

    // Is partner winning?
    if (winningTeam === botTeam) {
        // Partner is winning. Discard/sluff the lowest value card.
        let lowestCard = playableCards[0];
        playableCards.forEach(c => {
            if (getCardValueIndex(c) < getCardValueIndex(lowestCard)) {
                lowestCard = c;
            }
        });
        return lowestCard;
    }

    // Opponent is winning. Try to beat the current winning card.
    let winningOptions = playableCards.filter(c => cardABeatsB(c, winningCard, leadSuit, trumpSuit));

    if (winningOptions.length > 0) {
        // Play the lowest card among winning options to win efficiently
        let optimalCard = winningOptions[0];
        winningOptions.forEach(c => {
            if (getCardValueIndex(c) < getCardValueIndex(optimalCard)) {
                optimalCard = c;
            }
        });
        return optimalCard;
    } else {
        // Cannot win. Discard the lowest value card.
        let lowestCard = playableCards[0];
        playableCards.forEach(c => {
            if (getCardValueIndex(c) < getCardValueIndex(lowestCard)) {
                lowestCard = c;
            }
        });
        return lowestCard;
    }
}

module.exports = {
    selectBotTrump,
    selectBotCard
};
