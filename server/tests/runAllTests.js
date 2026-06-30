/**
 * MASTER TEST RUNNER
 * Runs all test modules and prints a combined summary
 */

const { execSync } = require('child_process');
const path = require('path');

const tests = [
    'test_ruleEngine.js',
    'test_roomManager.js',
    'test_ScoreManager.js',
    'test_botManager.js',
    'testTrumpManager.js',
    'testTrickEvaluator.js'
];

let totalPassed = 0;
let totalFailed = 0;

console.log('\n' + '🎮'.repeat(25));
console.log('   COURT PIECE BACKEND — FULL TEST SUITE');
console.log('🎮'.repeat(25) + '\n');

tests.forEach(testFile => {
    const fullPath = path.join(__dirname, testFile);
    try {
        const output = execSync(`node "${fullPath}"`, { encoding: 'utf8' });
        process.stdout.write(output);

        const passedMatch = output.match(/(\d+) passed/);
        const failedMatch = output.match(/(\d+) failed/);
        if (passedMatch) totalPassed += parseInt(passedMatch[1]);
        if (failedMatch) totalFailed += parseInt(failedMatch[1]);
    } catch (err) {
        console.log(`\n❌ ERROR running ${testFile}:`);
        console.log(err.stdout || err.message);
        totalFailed++;
    }
});

console.log('\n' + '='.repeat(50));
console.log(`🏁 GRAND TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
if (totalFailed === 0) {
    console.log('✅ ALL BACKEND MODULES VERIFIED — READY FOR FRONTEND!');
} else {
    console.log('❌ Some tests failed. Fix issues before moving to frontend.');
}
console.log('='.repeat(50) + '\n');
process.exit(totalFailed === 0 ? 0 : 1);
