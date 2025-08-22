const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * Select tests for shard requested via --shard=shardIndex/shardCount
   * Sharding is applied before sorting
   */
  shard(tests, { shardIndex, shardCount }) {
    const shardSize = Math.ceil(tests.length / shardCount);
    const shardStart = shardSize * (shardIndex - 1);
    const shardEnd = shardSize * shardIndex;

    return [...tests]
      .sort((a, b) => (a.path > b.path ? 1 : -1))
      .slice(shardStart, shardEnd);
  }

  /**
   * Sort test to determine order of execution
   * Serialize setup and teardown tests, and prioritize fast tests
   */
  sort(tests) {
    const copyTests = Array.from(tests);
    
    return copyTests.sort((testA, testB) => {
      // Run setup tests first
      if (testA.path.includes('setup') && !testB.path.includes('setup')) {
        return -1;
      }
      if (!testA.path.includes('setup') && testB.path.includes('setup')) {
        return 1;
      }
      
      // Run teardown tests last
      if (testA.path.includes('teardown') && !testB.path.includes('teardown')) {
        return 1;
      }
      if (!testA.path.includes('teardown') && testB.path.includes('teardown')) {
        return -1;
      }
      
      // Prioritize unit tests over integration tests
      const aIsUnit = testA.path.includes('/unit/');
      const bIsUnit = testB.path.includes('/unit/');
      
      if (aIsUnit && !bIsUnit) {
        return -1;
      }
      if (!aIsUnit && bIsUnit) {
        return 1;
      }
      
      // Prioritize fast tests (components, hooks) over slow tests (integration)
      const fastPatterns = ['/components/', '/hooks/', '/utils/'];
      const slowPatterns = ['/integration/', '/e2e/', '/performance/'];
      
      const aIsFast = fastPatterns.some(pattern => testA.path.includes(pattern));
      const bIsFast = fastPatterns.some(pattern => testB.path.includes(pattern));
      const aIsSlow = slowPatterns.some(pattern => testA.path.includes(pattern));
      const bIsSlow = slowPatterns.some(pattern => testB.path.includes(pattern));
      
      if (aIsFast && bIsSlow) {
        return -1;
      }
      if (aIsSlow && bIsFast) {
        return 1;
      }
      
      // Default alphabetical sort
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = CustomSequencer;
