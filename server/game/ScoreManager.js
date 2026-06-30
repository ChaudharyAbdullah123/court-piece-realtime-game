function updateDoubleSar(game, winnerPlayer, winningCard) {
    const winnerId = winnerPlayer.socketId;
    const team = winnerPlayer.team;

    // increment table cards in center pile
    game.centerPileCount = (game.centerPileCount || 0) + 1;

    console.log(`📊 Trick won by ${winnerPlayer.username} (Team ${team}) with ${winningCard.suit}-${winningCard.value}.`);
    console.log(`Accumulated tricks in center: ${game.centerPileCount}`);

    // If it's the 13th trick, the winner gets the entire pile automatically
    if (game.tricksPlayed === 13) {
        game.sar[team] += game.centerPileCount;
        console.log(`🏁 13th Trick! Team ${team} collects the remaining ${game.centerPileCount} tricks.`);
        game.centerPileCount = 0;
        game.seniorPlayerId = null;
        return;
    }

    if (!game.seniorPlayerId) {
        // No senior player yet (first trick)
        game.seniorPlayerId = winnerId;
        console.log(`👑 New Senior Player: ${winnerPlayer.username}`);
    } else if (game.seniorPlayerId === winnerId) {
        // Same player won consecutive tricks!
        if (winningCard.value === 'A') {
            // Ace Rule: Cannot collect the pile with an Ace
            console.log(`🃏 Ace Rule: ${winnerPlayer.username} won again but with an Ace. Pile stays in center.`);
        } else {
            // Consecutive win (not with Ace) -> Collect the pile!
            game.sar[team] += game.centerPileCount;
            console.log(`🎉 Consecutive Win! Team ${team} collects ${game.centerPileCount} tricks.`);
            game.centerPileCount = 0;
            game.seniorPlayerId = null; // reset senior
        }
    } else {
        // Different player won
        game.seniorPlayerId = winnerId;
        console.log(`👑 Senior Player changed to: ${winnerPlayer.username}`);
    }

    console.log('Current Round Scores (Collected Tricks):', game.sar);
}

function getWinningTeam(game) {
    if (game.sar.A > game.sar.B) {
        return 'A';
    } else if (game.sar.B > game.sar.A) {
        return 'B';
    }
    return null; // Tie
}

function updateMatchScore(game, winningTeam) {
    if (winningTeam) {
        game.scores[winningTeam] += 1;
    }
}

module.exports = {
    updateDoubleSar,
    getWinningTeam,
    updateMatchScore
};