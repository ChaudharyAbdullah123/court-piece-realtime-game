/**
 * MODULE TEST: ScoreManager (Double Sar Rules)
 * Tests: Ace Rule, Consecutive Wins, 13th Trick, 
 *        Same team wins, Opponent team breaks streak
 */

const { test, assert, assertEqual, summary } = require('./testRunner');
const { updateDoubleSar, getWinningTeam, updateMatchScore } = require('../game/ScoreManager');

console.log('\n📋 TESTING: ScoreManager (Double Sar Rules)');
console.log('='.repeat(50));

// ─── Helpers ──────────────────────────────────────────────
function makeGame() {
    return {
        sar: { A: 0, B: 0 },
        centerPileCount: 0,
        seniorPlayerId: null,
        tricksPlayed: 0
    };
}

function makePlayer(socketId, team, username) {
    return { socketId, team, username };
}

// ─── TESTS ────────────────────────────────────────────────

test('1. First trick: No pile collected, senior player set', () => {
    const game = makeGame();
    game.tricksPlayed = 1;
    const player = makePlayer('P1', 'A', 'Alice');
    const card = { suit: 'spades', value: 'K' };

    updateDoubleSar(game, player, card);

    assertEqual(game.sar.A, 0, 'Team A should have 0 sar (no consecutive win yet)');
    assertEqual(game.centerPileCount, 1, 'Center pile should have 1 trick');
    assertEqual(game.seniorPlayerId, 'P1', 'Senior player should be P1');
});

test('2. Consecutive win (non-Ace): Pile collected', () => {
    const game = makeGame();
    game.tricksPlayed = 2;
    game.centerPileCount = 1;
    game.seniorPlayerId = 'P1'; // Already senior from first trick

    const player = makePlayer('P1', 'A', 'Alice');
    const card = { suit: 'spades', value: 'Q' }; // Not an Ace

    updateDoubleSar(game, player, card);

    assertEqual(game.sar.A, 2, 'Team A should collect 2 tricks');
    assertEqual(game.centerPileCount, 0, 'Center pile should be empty after collection');
    assert(game.seniorPlayerId === null, 'Senior player should reset after pile collected');
});

test('3. ACE RULE: Consecutive win with Ace does NOT collect pile', () => {
    const game = makeGame();
    game.tricksPlayed = 2;
    game.centerPileCount = 1;
    game.seniorPlayerId = 'P1'; // Already senior

    const player = makePlayer('P1', 'A', 'Alice');
    const card = { suit: 'spades', value: 'A' }; // ACE

    updateDoubleSar(game, player, card);

    assertEqual(game.sar.A, 0, 'Team A should NOT collect (Ace Rule)');
    assertEqual(game.centerPileCount, 2, 'Center pile should grow (Ace adds to pile)');
    assertEqual(game.seniorPlayerId, 'P1', 'Senior player remains P1 (still senior)');
});

test('4. Different player wins: Senior changes, pile stays', () => {
    const game = makeGame();
    game.tricksPlayed = 2;
    game.centerPileCount = 1;
    game.seniorPlayerId = 'P1'; // P1 was senior

    const player = makePlayer('P2', 'B', 'Bob'); // Different player wins
    const card = { suit: 'hearts', value: 'K' };

    updateDoubleSar(game, player, card);

    assertEqual(game.sar.A, 0, 'Team A should have 0 sar');
    assertEqual(game.sar.B, 0, 'Team B should have 0 sar (no consecutive win)');
    assertEqual(game.centerPileCount, 2, 'Center pile grows');
    assertEqual(game.seniorPlayerId, 'P2', 'Senior player should change to P2');
});

test('5. 13th Trick: Winner collects all remaining tricks regardless', () => {
    const game = makeGame();
    game.tricksPlayed = 13; // This IS the 13th trick
    game.centerPileCount = 5; // 5 tricks in center pile
    game.seniorPlayerId = 'P3'; // Someone else was senior

    const player = makePlayer('P1', 'A', 'Alice'); // Different player wins 13th
    const card = { suit: 'clubs', value: '07' };

    updateDoubleSar(game, player, card);

    assertEqual(game.sar.A, 6, 'Team A should collect all 5 + 1 (the 13th itself)');
    assertEqual(game.centerPileCount, 0, 'Center pile should be empty');
});

test('6. 3-trick streak: Pile collected on 2nd consecutive, then 3rd also collected', () => {
    const game = makeGame();
    const p1 = makePlayer('P1', 'A', 'Alice');

    // Trick 1 - P1 wins (becomes senior)
    game.tricksPlayed = 1;
    updateDoubleSar(game, p1, { suit: 'spades', value: 'K' });
    assertEqual(game.sar.A, 0, 'After trick 1: no sar yet');
    assertEqual(game.seniorPlayerId, 'P1', 'P1 is senior');

    // Trick 2 - P1 wins again (consecutive! collect 2)
    game.tricksPlayed = 2;
    updateDoubleSar(game, p1, { suit: 'hearts', value: 'Q' });
    assertEqual(game.sar.A, 2, 'After trick 2: Team A collects 2');
    assertEqual(game.seniorPlayerId, null, 'Senior resets');
    assertEqual(game.centerPileCount, 0, 'Pile empty');

    // Trick 3 - P1 wins again (new streak starts)
    game.tricksPlayed = 3;
    updateDoubleSar(game, p1, { suit: 'clubs', value: 'J' });
    assertEqual(game.sar.A, 2, 'After trick 3: still 2 (new streak started)');
    assertEqual(game.centerPileCount, 1, 'New pile of 1');
    assertEqual(game.seniorPlayerId, 'P1', 'P1 is senior again');
});

test('7. getWinningTeam: Returns correct winner', () => {
    const game = makeGame();
    game.sar = { A: 8, B: 5 };
    assertEqual(getWinningTeam(game), 'A', 'Team A should win with more sar');

    game.sar = { A: 4, B: 9 };
    assertEqual(getWinningTeam(game), 'B', 'Team B should win with more sar');
});

test('8. updateMatchScore: Increments correctly', () => {
    const game = makeGame();
    game.scores = { A: 0, B: 0 };
    updateMatchScore(game, 'A');
    assertEqual(game.scores.A, 1, 'Team A score should be 1');
    updateMatchScore(game, 'B');
    updateMatchScore(game, 'B');
    assertEqual(game.scores.B, 2, 'Team B score should be 2');
});

summary();
