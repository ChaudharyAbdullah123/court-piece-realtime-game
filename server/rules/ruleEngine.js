function isCardPlayable(game, socketId, card) {

    const hand = game.hands[socketId];

    // player owns card?
    const hasCard = hand.some(
        c => c.suit === card.suit &&
             c.value === card.value
    );

    if (!hasCard) {
        return false;
    }

    // first card
    if (!game.leadSuit) {
        game.leadSuit = card.suit;
        return true;
    }

    // player has lead suit?
    const hasLeadSuit = hand.some(
        c => c.suit === game.leadSuit
    );

    // must follow suit
    if (hasLeadSuit && card.suit !== game.leadSuit) {
        return false;
    }

    // reveal trump
    if (
        !hasLeadSuit &&
        card.suit === game.trump &&
        !game.trumpRevealed
    ) {

        game.trumpRevealed = true;
    }

    return true;
}

module.exports = { isCardPlayable };