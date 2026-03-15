function isCardPlayable(game, socketId, card) {

    const hand = game.hands[socketId];

    // 1️⃣ Check if player actually has the card
    const hasCard = hand.some(
        c => c.suit === card.suit && c.value === card.value
    );

    if (!hasCard) return false;

    const leadSuit = game.leadSuit;

    // 2️⃣ First card of trick → set lead suit
    if (!leadSuit) {
        game.leadSuit = card.suit;
        return true;
    }

    // 3️⃣ Player must follow suit if possible
    const hasLeadSuit = hand.some(c => c.suit === leadSuit);

    if (hasLeadSuit && card.suit !== leadSuit) {
        return false;
    }

    return true;
}

module.exports = { isCardPlayable };