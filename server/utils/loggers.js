function logGameState(game) {

    console.log({
        phase: game.phase,
        trump: game.trump,
        table: game.table,
        leadSuit: game.leadSuit,
        currentTurnIndex: game.currentTurnIndex,
        sar: game.sar
    });
}

module.exports = {
    logGameState
};