const gameManager =
    require('../../game/gameManager');

function registerTrumpHandler(
    io,
    socket
){

    socket.removeAllListeners(
        "trump_selected"
    );

    socket.on(
        "trump_selected",
        (data) => {

            console.log(
                "📥 EVENT: trump_selected FROM",
                socket.id
            );

            console.log("DATA:", data);

            gameManager.selectTrump(
                io,
                socket,
                data
            );
        }
    );
}

module.exports =
    registerTrumpHandler;