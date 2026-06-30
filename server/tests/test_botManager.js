/**
 * MODULE TEST: botManager (AI Bot Playing logic)
 */

const { test, assert, assertEqual, summary } = require('./testRunner');
const botManager = require('../game/botManager');

console.log('\n📋 TESTING: botManager (AI Player Logic)');
console.log('='.repeat(50));

test('1. selectBotTrump: Selects the most abundant suit', () => {
    const hand = [
        { suit: 'diamonds', value: '10' },
        { suit: 'hearts', value: 'K' },
        { suit: 'diamonds', value: 'A' },
        { suit: 'spades', value: '05' },
        { suit: 'diamonds', value: '07' }
    ];
    const trump = botManager.selectBotTrump(hand);
    assertEqual(trump, 'diamonds', 'Should select diamonds since there are 3 diamonds');
});

test('2. selectBotCard: Leading - plays highest card', () => {
    const game = {
        table: [], // Leading!
        leadSuit: null,
        trump: 'hearts',
        hands: {
            'bot1': [
                { suit: 'clubs', value: '02' },
                { suit: 'clubs', value: 'A' },
                { suit: 'clubs', value: '10' }
            ]
        },
        players: [
            { socketId: 'bot1', team: 'A', username: 'Bot1' }
        ]
    };
    const card = botManager.selectBotCard(game, 'bot1');
    assert(card, 'Should select a card');
    assertEqual(card.suit, 'clubs', 'Should play clubs');
    assertEqual(card.value, 'A', 'Should play the highest card (Ace) when leading');
});

test('3. selectBotCard: Partner is winning - discards lowest card', () => {
    const game = {
        table: [
            { playerId: 'partner', card: { suit: 'clubs', value: 'A' } }
        ],
        leadSuit: 'clubs',
        trump: 'hearts',
        hands: {
            'bot1': [
                { suit: 'clubs', value: '03' },
                { suit: 'clubs', value: 'K' },
                { suit: 'clubs', value: '05' }
            ]
        },
        players: [
            { socketId: 'bot1', team: 'A', username: 'Bot1' },
            { socketId: 'partner', team: 'A', username: 'Partner' }
        ]
    };
    const card = botManager.selectBotCard(game, 'bot1');
    assert(card, 'Should select a card');
    assertEqual(card.suit, 'clubs', 'Should follow lead suit');
    assertEqual(card.value, '03', 'Should discard the lowest card (03) since partner is winning');
});

test('4. selectBotCard: Opponent is winning - beats opponent with lowest possible winning card', () => {
    const game = {
        table: [
            { playerId: 'opponent', card: { suit: 'clubs', value: '10' } }
        ],
        leadSuit: 'clubs',
        trump: 'hearts',
        hands: {
            'bot1': [
                { suit: 'clubs', value: '03' }, // lower than 10
                { suit: 'clubs', value: 'Q' },  // wins, higher than 10
                { suit: 'clubs', value: 'K' }   // wins, higher than 10 but higher than Q
            ]
        },
        players: [
            { socketId: 'bot1', team: 'A', username: 'Bot1' },
            { socketId: 'opponent', team: 'B', username: 'Opponent' }
        ]
    };
    const card = botManager.selectBotCard(game, 'bot1');
    assert(card, 'Should select a card');
    assertEqual(card.suit, 'clubs', 'Should follow suit');
    assertEqual(card.value, 'Q', 'Should win efficiently with Q (lowest winning card in hand)');
});

test('5. selectBotCard: Opponent is winning, bot cannot beat - discards lowest card', () => {
    const game = {
        table: [
            { playerId: 'opponent', card: { suit: 'clubs', value: 'A' } }
        ],
        leadSuit: 'clubs',
        trump: 'hearts',
        hands: {
            'bot1': [
                { suit: 'clubs', value: '03' },
                { suit: 'clubs', value: '10' },
                { suit: 'clubs', value: 'Q' }
            ]
        },
        players: [
            { socketId: 'bot1', team: 'A', username: 'Bot1' },
            { socketId: 'opponent', team: 'B', username: 'Opponent' }
        ]
    };
    const card = botManager.selectBotCard(game, 'bot1');
    assert(card, 'Should select a card');
    assertEqual(card.suit, 'clubs', 'Should follow suit');
    assertEqual(card.value, '03', 'Should discard lowest card (03) since winning is impossible');
});

test('6. selectBotCard: Bot is out of lead suit - trumps to win', () => {
    const game = {
        table: [
            { playerId: 'opponent', card: { suit: 'clubs', value: 'K' } }
        ],
        leadSuit: 'clubs',
        trump: 'hearts', // hearts is trump
        hands: {
            'bot1': [
                { suit: 'hearts', value: '02' }, // trump card
                { suit: 'diamonds', value: 'A' }
            ]
        },
        players: [
            { socketId: 'bot1', team: 'A', username: 'Bot1' },
            { socketId: 'opponent', team: 'B', username: 'Opponent' }
        ]
    };
    const card = botManager.selectBotCard(game, 'bot1');
    assert(card, 'Should select a card');
    assertEqual(card.suit, 'hearts', 'Should trump');
    assertEqual(card.value, '02', 'Should play trump 02 to win');
});

summary();
