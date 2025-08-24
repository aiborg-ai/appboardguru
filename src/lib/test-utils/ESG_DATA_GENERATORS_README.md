# ESG Sample Data Generators

This directory contains comprehensive sample data generators for the ESG (Environmental, Social, Governance) scorecard system. These tools help with testing, development, and demonstration of ESG functionality.

## 📁 Files Overview

### Core Data Files
- **`esg-seed-data.ts`** - Base seed data with realistic ESG metrics, risks, opportunities, and recommendations
- **`esg-data-generators.ts`** - Advanced data generators with trend simulation and industry variations
- **`esg-dev-utils.ts`** - Development utilities for quick data generation and testing

### Test Factories
- **`../tests/factories/esg.factory.ts`** - Jest-compatible factories for unit testing

### Scripts
- **`../scripts/seed-esg-data.ts`** - Database seeding script
- **`../scripts/demo-esg.js`** - Interactive demo script

## 🚀 Quick Start

### 1. Generate Sample Data (In Code)

```typescript
import { generateSampleESGData } from '@/lib/test-utils/esg-data-generators'

// Quick dataset for tech company
const dataset = generateSampleESGData.fullDataset(
  'org_123',
  'user_456', 
  'technology'
)

console.log('Generated:', {
  metrics: dataset.metrics.length,
  dataPoints: dataset.dataPoints.length,
  scorecard: dataset.scorecard.overallRating
})
```

### 2. Use Development Utils

```typescript
import esgDevUtils from '@/lib/dev/esg-dev-utils'

// Generate quick test data
const data = esgDevUtils.generateQuickDataset()

// Generate high-performing scorecard
const highPerformer = esgDevUtils.generateScenarioScorecard.highPerformer()

// Log formatted summary
esgDevUtils.dev.logScorecardSummary(data.scorecard)
```

### 3. Run Demo Script

```bash
node src/scripts/demo-esg.js
```

### 4. Seed Database

```bash
# Seed demo data for multiple organizations
npm run seed:esg --demo

# Seed specific organization
npm run seed:esg --org-id org_123 --industry technology

# Clean and reseed
npm run seed:esg --clean --demo --verbose
```

## 🏭 Industry Types

The generators support realistic data for different industries:

- **`technology`** - Higher renewable energy, lower emissions, focus on data privacy
- **`manufacturing`** - Higher emissions and waste, strong safety focus
- **`finance`** - Strong governance scores, lower environmental impact
- **`healthcare`** - High social scores, regulatory compliance focus
- **`energy`** - Mixed environmental performance, high safety requirements

## 📊 Data Generated

### ESG Metrics (20+ Standard Metrics)
- **Environmental**: GHG Emissions, Energy Consumption, Water Usage, Waste Generation
- **Social**: Employee Satisfaction, Diversity Ratios, Safety Metrics, Training Hours
- **Governance**: Board Independence, Ethics Training, Risk Coverage, Compliance Scores

### Data Points (24 months historical data)
- Realistic trends (improving/declining based on metric type)
- Seasonal variations for energy and emissions
- Random variation within realistic bounds
- Multiple verification levels

### Scorecards
- Overall ESG rating (A+ to F scale)
- Category breakdowns (E, S, G scores)
- Multiple framework support (GRI, SASB, TCFD, CDP, etc.)
- Risk and opportunity identification
- Automated recommendations

### Supporting Data
- **Benchmarks**: Industry averages, medians, top quartiles
- **Trends**: 12-month historical performance analysis  
- **Risks**: Categorized by impact and likelihood
- **Opportunities**: Mapped by impact vs effort
- **Analytics**: Performance summaries and comparisons

## 🧪 Testing Usage

### Unit Tests

```typescript
import { ESGScorecardFactory, ESGDataPointFactory } from '@/__tests__/factories/esg.factory'

// Generate test scorecard
const scorecard = ESGScorecardFactory.buildHighPerforming()

// Generate time series data
const dataPoints = ESGDataPointFactory.buildTimeSeries(
  'carbon-emissions',
  'org_test',
  'user_test',
  12
)
```

### Integration Tests

```typescript
import { ESGDatasetFactory } from '@/__tests__/factories/esg.factory'

// Generate complete test dataset
const testData = ESGDatasetFactory.build(
  'test_org',
  'test_user',
  'manufacturing'
)

// Use in API tests
const response = await fetch('/api/esg/scorecard', {
  method: 'POST',
  body: JSON.stringify({
    organizationId: testData.scorecard.organizationId
  })
})
```

## 🎯 Realistic Data Features

### Intelligent Trends
- Environmental metrics generally improving over time
- Social metrics with gradual improvements
- Governance metrics showing steady progress
- Seasonal variations for energy-related metrics

### Industry-Specific Baselines
- Technology: 65% renewable energy, low emissions
- Manufacturing: Higher waste and emissions, strong safety focus
- Finance: Excellent governance, moderate environmental impact

### Validation & Quality
- All generated values within realistic bounds
- Percentage metrics capped at 0-100%
- Consistent relationships between related metrics
- Proper data verification statuses

## 🔧 Configuration Options

### ESGDataGenerator Options
```typescript
const generator = new ESGDataGenerator(
  organizationId,
  userId,
  baseDate,        // Date to generate from
  industryType,    // Industry-specific baselines
)

// Generate with custom parameters
const dataPoints = generator.generateDataPoints(
  metricIds,       // Specific metrics to generate
  monthsBack,      // Historical period length
  variability      // Random variation level (0.0-1.0)
)
```

### Seeding Script Options
```bash
--org-id <id>          # Specific organization
--user-id <id>         # User for data creation
--industry <type>      # Industry type
--periods <number>     # Historical periods (1-60)
--demo                 # Multi-org demo data
--clean                # Clean before seeding
--verbose              # Detailed logging
```

## 📈 Sample Data Statistics

**Per Organization:**
- 20+ standard ESG metrics
- 500+ historical data points (24 months × 20+ metrics)
- 1 comprehensive scorecard
- 10+ benchmark comparisons
- 6+ identified risks
- 6+ improvement opportunities
- 3+ detailed recommendations

**Demo Dataset (3 Organizations):**
- 1,500+ total data points
- 3 industry variations
- 18+ risks across categories
- 18+ opportunities
- 9+ recommendations
- Complete trend analysis

## 💡 Development Tips

### Browser Console
```javascript
// ESG dev utils are available in browser console
esgDev.generateQuickDataset()
esgDev.dev.logScorecardSummary(scorecard)
esgDev.generateTestScenarios()
```

### Custom Scenarios
```typescript
// Generate specific test scenarios
const scenarios = {
  improving: esgDevUtils.generateScenarioScorecard.improving(),
  highRisk: ESGScorecardFactory.build({ /* risk config */ }),
  multiFramework: generator.generateScorecard(period, 'TCFD')
}
```

### Data Validation
```typescript
// Validate generated data
const isValid = esgDevUtils.dev.validateData(dataset)

// Compare performance
esgDevUtils.dev.compareScorecards(scorecard1, scorecard2)
```

## 🎨 Customization

### Adding New Metrics
```typescript
// Add to esg-seed-data.ts
export const CUSTOM_METRICS: Omit<ESGMetric, 'id'>[] = [
  {
    category: 'Environmental',
    name: 'Biodiversity Impact Score',
    // ... metric configuration
  }
]
```

### Industry-Specific Adjustments
```typescript
// Modify baselines in esg-data-generators.ts
const industryBaselines = {
  yourIndustry: {
    'Metric Name': baselineValue,
    // ... other metrics
  }
}
```

This comprehensive data generation system provides realistic, validated ESG data for all testing and development needs, from unit tests to full system demonstrations.