function nextTurn(game) {

    game.currentTurnIndex =
        (game.currentTurnIndex + 1) % game.players.length;

    return game.players[game.currentTurnIndex];
}

function setTurnToWinner(game, winnerId) {

    game.currentTurnIndex =
        game.players.findIndex(
            p => p.socketId === winnerId
        );

    return game.players[game.currentTurnIndex];
}

module.exports = {
    nextTurn,
    setTurnToWinner
};