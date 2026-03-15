function cardValue(card) {
    const order = ['02','03','04','05','06','07','08','09','10','J','Q','K','A'];
    return order.indexOf(card.value);
}

function evaluateTrick(game) {

    const trumpSuit = game.trump;
    const leadSuit = game.leadSuit;
    const table = game.table;

    let winningPlay = table[0];

    for (const play of table) {

        const currentCard = play.card;
        const winningCard = winningPlay.card;

        // 1️⃣ Trump beats non-trump
        if (currentCard.suit === trumpSuit && winningCard.suit !== trumpSuit) {
            winningPlay = play;
            continue;
        }

        // 2️⃣ Both trump → higher value wins
        if (currentCard.suit === trumpSuit && winningCard.suit === trumpSuit) {
            if (cardValue(currentCard) > cardValue(winningCard)) {
                winningPlay = play;
            }
            continue;
        }

        // 3️⃣ No trump involved → compare lead suit
        if (winningCard.suit !== trumpSuit) {

            if (currentCard.suit === leadSuit && winningCard.suit !== leadSuit) {
                winningPlay = play;
                continue;
            }

            if (currentCard.suit === winningCard.suit) {
                if (cardValue(currentCard) > cardValue(winningCard)) {
                    winningPlay = play;
                }
            }
        }
    }

    return winningPlay.playerId;
}

module.exports = { evaluateTrick };