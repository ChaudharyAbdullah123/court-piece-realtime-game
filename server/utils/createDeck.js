function createDeck() {
    const suits = ['clubs','diamonds','hearts','spades'];
    const values = ['02','03','04','05','06','07','08','09','10','J','Q','K','A'];
    const deck = [];
    for (const suit of suits) {
        for (const value of values) {
            deck.push({ suit, value });
        }
    }
    return deck;
}

module.exports = createDeck;
