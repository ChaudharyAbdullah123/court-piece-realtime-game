function cardValue(card) {

    const order = [
        '02','03','04','05','06',
        '07','08','09','10',
        'J','Q','K','A'
    ];

    return order.indexOf(card.value);
}

function evaluateTrick(game) {

    const trumpSuit = game.trump;
    const leadSuit = game.leadSuit;

    let winningPlay = game.table[0];

    for (const play of game.table) {

        const current = play.card;
        const winning = winningPlay.card;

        // trump beats non trump
        if (
            current.suit === trumpSuit &&
            winning.suit !== trumpSuit
        ) {
            winningPlay = play;
            continue;
        }

        // both trump
        if (
            current.suit === trumpSuit &&
            winning.suit === trumpSuit
        ) {

            if (cardValue(current) > cardValue(winning)) {
                winningPlay = play;
            }

            continue;
        }

        // lead suit logic
        if (winning.suit !== trumpSuit) {

            if (
                current.suit === leadSuit &&
                winning.suit !== leadSuit
            ) {
                winningPlay = play;
                continue;
            }

            if (
                current.suit === winning.suit &&
                cardValue(current) > cardValue(winning)
            ) {
                winningPlay = play;
            }
        }
    }

    return winningPlay;
}

module.exports = { evaluateTrick };