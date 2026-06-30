/**
 * TEST RUNNER UTILITY
 * Simple test framework - no external dependencies needed
 */

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ PASS: ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ❌ FAIL: ${name}`);
        console.log(`     → ${err.message}`);
        failed++;
        failures.push({ name, error: err.message });
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
    if (a !== b) throw new Error(message || `Expected ${JSON.stringify(a)} to equal ${JSON.stringify(b)}`);
}

function assertDeepEqual(a, b, message) {
    const aStr = JSON.stringify(a);
    const bStr = JSON.stringify(b);
    if (aStr !== bStr) throw new Error(message || `Expected ${aStr} to deep equal ${bStr}`);
}

function summary() {
    console.log('\n' + '='.repeat(50));
    console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
    if (failures.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        failures.forEach(f => console.log(`   • ${f.name}: ${f.error}`));
    } else {
        console.log('🎉 ALL TESTS PASSED!');
    }
    console.log('='.repeat(50));
    return failed === 0;
}

module.exports = { test, assert, assertEqual, assertDeepEqual, summary };
