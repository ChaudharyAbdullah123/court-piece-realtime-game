/**
 * MODULE TEST: ruleEngine (Card playability validation)
 */

const { test, assert, assertEqual, summary } = require('./testRunner');
const { isCardPlayable } = require('../rules/ruleEngine');

console.log('\n📋 TESTING: ruleEngine (Play Rules & Lead Suit Validation)');
console.log('='.repeat(50));

function makeGame(leadSuit, trump, hands, trumpRevealed = false) {
    return {
        leadSuit,
        trump,
        trumpRevealed,
        hands
    };
}

test('1. First card of trick - always playable (sets lead suit)', () => {
    const game = makeGame(null, 'hearts', {
        P1: [{ suit: 'spades', value: 'A' }]
    });
    const result = isCardPlayable(game, 'P1', { suit: 'spades', value: 'A' });
    assert(result === true, 'First card should always be playable');
    assertEqual(game.leadSuit, 'spades', 'Lead suit should be set to spades');
});

test('2. Player follows lead suit - valid', () => {
    const game = makeGame('clubs', 'hearts', {
        P2: [{ suit: 'clubs', value: '10' }, { suit: 'spades', value: 'K' }]
    });
    const result = isCardPlayable(game, 'P2', { suit: 'clubs', value: '10' });
    assert(result === true, 'Following lead suit should be valid');
});

test('3. Player has lead suit but plays different suit - invalid', () => {
    const game = makeGame('clubs', 'hearts', {
        P2: [{ suit: 'clubs', value: '10' }, { suit: 'spades', value: 'K' }]
    });
    const result = isCardPlayable(game, 'P2', { suit: 'spades', value: 'K' });
    assert(result === false, 'Must follow suit if you have lead suit');
});

test('4. Player has no lead suit - can play any card (including trump)', () => {
    const game = makeGame('clubs', 'hearts', {
        P2: [{ suit: 'hearts', value: '02' }, { suit: 'spades', value: 'K' }]
    });
    const result = isCardPlayable(game, 'P2', { suit: 'hearts', value: '02' });
    assert(result === true, 'No lead suit in hand means any card is playable');
});

test('5. Player plays trump when out of lead suit - reveals trump', () => {
    const game = makeGame('clubs', 'hearts', {
        P2: [{ suit: 'hearts', value: '05' }, { suit: 'spades', value: 'Q' }]
    }, false);
    const result = isCardPlayable(game, 'P2', { suit: 'hearts', value: '05' });
    assert(result === true, 'Playing trump when out of lead suit is valid');
    assert(game.trumpRevealed === true, 'Trump should be marked as revealed');
});

test('6. Player plays card they do not own - invalid', () => {
    const game = makeGame('clubs', 'hearts', {
        P2: [{ suit: 'clubs', value: '10' }]
    });
    const result = isCardPlayable(game, 'P2', { suit: 'clubs', value: 'A' });
    assert(result === false, 'Cannot play a card not in hand');
});

summary();
