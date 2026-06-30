const { evaluateTrick } = require('../game/TrickManager');

function runTest(testName, game) {

    const winner = evaluateTrick(game);

    console.log('===== ' + testName + ' =====');
    console.log('Winner:', winner);
    console.log('----------------------------\n');
}


/*
TEST 1
No trump involved
Lead suit = spades
*/

runTest('Test 1 - Lead Suit Winner', {

    trump: 'hearts',
    leadSuit: 'spades',

    table: [
        { playerId: 'P1', card: { suit: 'spades', value: '10' } },
        { playerId: 'P2', card: { suit: 'spades', value: 'K' } },
        { playerId: 'P3', card: { suit: 'spades', value: '03' } },
        { playerId: 'P4', card: { suit: 'spades', value: 'A' } }
    ]

});


/*
TEST 2
Trump beats lead suit
*/

runTest('Test 2 - Trump Wins', {

    trump: 'hearts',
    leadSuit: 'spades',

    table: [
        { playerId: 'P1', card: { suit: 'spades', value: '10' } },
        { playerId: 'P2', card: { suit: 'spades', value: 'K' } },
        { playerId: 'P3', card: { suit: 'hearts', value: '02' } },
        { playerId: 'P4', card: { suit: 'spades', value: 'A' } }
    ]

});


/*
TEST 3
Multiple trump cards
*/

runTest('Test 3 - Highest Trump Wins', {

    trump: 'hearts',
    leadSuit: 'spades',

    table: [
        { playerId: 'P1', card: { suit: 'hearts', value: '05' } },
        { playerId: 'P2', card: { suit: 'hearts', value: 'K' } },
        { playerId: 'P3', card: { suit: 'hearts', value: '03' } },
        { playerId: 'P4', card: { suit: 'spades', value: 'A' } }
    ]

});


/*
TEST 4
Lead suit only
*/

runTest('Test 4 - Lead Suit Only', {

    trump: 'clubs',
    leadSuit: 'spades',

    table: [
        { playerId: 'P1', card: { suit: 'spades', value: '05' } },
        { playerId: 'P2', card: { suit: 'diamonds', value: 'A' } },
        { playerId: 'P3', card: { suit: 'spades', value: '10' } },
        { playerId: 'P4', card: { suit: 'clubs', value: '02' } }
    ]

});