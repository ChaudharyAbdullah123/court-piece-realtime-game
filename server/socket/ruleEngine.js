function isCardPlayable(game, socketId, card) {
    const hand = game.hands[socketId];
    if (!hand.some(c => c.suit === card.suit && c.value === card.value)) return false;

    const leadSuit = game.leadSuit;
    if (!leadSuit) {
        game.leadSuit = card.suit;
        return true;
    }

    // Must follow suit if possible
    const hasLeadSuit = hand.some(c => c.suit === leadSuit);
    if (hasLeadSuit && card.suit !== leadSuit) return false;

    return true;
}

module.exports = { isCardPlayable };
