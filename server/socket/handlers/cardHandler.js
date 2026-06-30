const gameManager = require('../../game/gameManager');
const botManager = require('../../game/botManager');

function registerCardHandler(io, socket) {
    socket.on('play_card', (data) => {
        gameManager.playCard(io, socket, data);
    });

    socket.on('request_hint', ({ roomID }) => {
        const game = gameManager.games[roomID];
        if (!game || game.phase !== 'playing') return;

        // Verify it is this player's turn
        const currentTurnPlayer = game.players[game.currentTurnIndex];
        if (currentTurnPlayer.socketId !== socket.id) {
            return socket.emit('invalid_move', { msg: 'Can only ask for a hint on your turn' });
        }

        const suggestedCard = botManager.selectBotCard(game, socket.id);
        if (suggestedCard) {
            socket.emit('hint_response', { card: suggestedCard });
            console.log(`💡 Sent hint recommendation: ${suggestedCard.suit}-${suggestedCard.value} to ${socket.id}`);
        }
    });
}

module.exports = registerCardHandler;