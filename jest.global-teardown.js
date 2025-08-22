const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧪 Cleaning up global test environment...');
  
  // Generate final test report metadata
  const testResultsDir = path.join(__dirname, 'test-results');
  const metadataPath = path.join(testResultsDir, 'test-metadata.json');
  
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      metadata.endTime = new Date().toISOString();
      metadata.duration = new Date(metadata.endTime) - new Date(metadata.startTime);
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.warn('Warning: Could not update test metadata:', error.message);
    }
  }
  
  // Clean up test database if needed
  try {
    const { testDb } = require('./__tests__/utils/test-database');
    if (testDb && typeof testDb.globalTeardown === 'function') {
      await testDb.globalTeardown();
    }
  } catch (error) {
    console.warn('Warning: Test database cleanup failed:', error.message);
  }
  
  // Generate coverage summary if available
  const coverageSummaryPath = path.join(__dirname, 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coverageSummaryPath)) {
    try {
      const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
      const total = coverageSummary.total;
      
      console.log('
📈 Coverage Summary:');
      console.log(`Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
      console.log(`Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
      console.log(`Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
      console.log(`Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
      
      // Check if we met our coverage goals
      const targetCoverage = 80;
      const overallCoverage = Math.min(total.lines.pct, total.functions.pct, total.branches.pct, total.statements.pct);
      
      if (overallCoverage >= targetCoverage) {
        console.log(`✅ Coverage goal achieved! (${overallCoverage}% >= ${targetCoverage}%)`);
      } else {
        console.log(`⚠️  Coverage goal not met (${overallCoverage}% < ${targetCoverage}%)`);
      }
      
      // Write simplified coverage report
      const simpleCoverageReport = {
        timestamp: new Date().toISOString(),
        overall: overallCoverage,
        target: targetCoverage,
        goalAchieved: overallCoverage >= targetCoverage,
        details: {
          lines: total.lines.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
          statements: total.statements.pct,
        }
      };
      
      fs.writeFileSync(
        path.join(testResultsDir, 'coverage-report.json'),
        JSON.stringify(simpleCoverageReport, null, 2)
      );
      
    } catch (error) {
      console.warn('Warning: Could not process coverage summary:', error.message);
    }
  }
  
  console.log('✅ Global test environment cleanup complete');
};
