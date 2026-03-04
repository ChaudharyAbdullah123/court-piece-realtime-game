function cardValue(card) {
    const order = ['02','03','04','05','06','07','08','09','10','J','Q','K','A'];
    return order.indexOf(card.value);
}

function evaluateTrick(game) {
    const leadSuit = game.leadSuit;
    const trump = game.trump;

    let winningCard = game.table[0];
    for (const play of game.table) {
        if (play.card.suit === trump && winningCard.card.suit !== trump) {
            winningCard = play;
        } else if (play.card.suit === winningCard.card.suit) {
            if (cardValue(play.card) > cardValue(winningCard.card)) {
                winningCard = play;
            }
        }
    }

    return winningCard.playerId;
}

module.exports = { evaluateTrick };
