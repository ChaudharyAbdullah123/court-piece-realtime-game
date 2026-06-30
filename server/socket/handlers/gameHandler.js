const roomManager =
    require('../roomManager');

const gameManager =
    require('../../game/gameManager');

function registerGameHandler(io, socket) {

    socket.removeAllListeners(
        'start_game'
    );

    socket.on(
        'start_game',
        ({ roomID }) => {

            console.log(
                '📥 EVENT: start_game FROM',
                socket.id
            );

            console.log('DATA:', {
                roomID
            });

            if(!roomID){

                return socket.emit(
                    'error',
                    {
                        msg: 'RoomID missing'
                    }
                );
            }

            const room =
                roomManager.rooms[roomID];

            if(!room){

                return socket.emit(
                    'error',
                    {
                        msg: 'Room not found'
                    }
                );
            }

            if(room.players.length < 4){
                roomManager.fillWithBots(io, roomID);
            }

            if(room.gameStarted){

                return socket.emit(
                    'error',
                    {
                        msg: 'Game already started'
                    }
                );
            }

            room.gameStarted = true;

            console.log(
                '🚀 GAME STARTING'
            );

            gameManager.startGame(
                io,
                roomID
            );
        }
    );
}

module.exports =
    registerGameHandler;