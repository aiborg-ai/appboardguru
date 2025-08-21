# Predictive Intelligence Testing Guide

This document outlines the comprehensive testing strategy for the BoardGuru Predictive Intelligence system, including ML models, pattern recognition, and predictive notifications.

## Overview

The testing suite validates the following components:
- **Pattern Recognition Engine**: ML algorithms for behavioral analysis
- **Anomaly Detection**: Statistical models for identifying unusual patterns
- **Predictive Notifications**: Smart notification optimization
- **User Engagement Profiling**: AI-powered user segmentation
- **External Intelligence Integration**: Data source validation
- **API Endpoints**: REST API testing with realistic scenarios

## Test Structure

```
__tests__/
├── ml-models/
│   ├── pattern-recognition.test.ts      # Core ML algorithm tests
│   └── predictive-notifications.test.ts # Smart notification tests
├── api/
│   └── notifications-predictions.test.ts # API endpoint tests
└── integration/                         # End-to-end tests (future)

src/lib/test-utils/
└── sample-data-generators.ts           # Realistic test data generation

scripts/
└── test-ml-predictions.ts              # Interactive testing script
```

## Sample Data Generation

The test suite uses sophisticated data generators that create realistic scenarios:

### User Activity Patterns
- **Heavy Users**: 15-40 daily activities, work hours 8-18
- **Moderate Users**: 5-15 daily activities, standard business hours
- **Light Users**: 1-8 daily activities, limited engagement
- **Weekend Workers**: Extended hours including weekends
- **Early Birds**: Active 6-14 hours
- **Night Owls**: Active 12-22 hours with weekend work

### Notification Engagement
- **Meeting Reminders**: 85% open rate, 70% click rate
- **Document Sharing**: 65% open rate, 45% click rate
- **Comment Mentions**: 75% open rate, 60% click rate
- **Deadline Alerts**: 90% open rate, 80% click rate
- **Approval Requests**: 95% open rate, 85% click rate

### Seasonal Patterns
- **Weekly**: Higher mid-week activity, lower weekends
- **Monthly**: Peaks at month start/end (reporting periods)
- **Quarterly**: Increased activity in quarter-end months

### Anomaly Injection
- **Volume Spikes**: Unusual bursts of activity
- **Timing Anomalies**: Activities at 3 AM
- **Sequence Anomalies**: Unusual event patterns
- **Velocity Anomalies**: Rapid-fire actions

## Test Categories

### 1. Pattern Recognition Tests

**Timing Pattern Detection**
```typescript
test('should detect timing patterns in user activity', async () => {
  const patterns = await patternRecognitionEngine.analyzePatterns('test-org-123', {
    userId: 'user-001',
    patternTypes: ['timing'],
    minConfidence: 0.6
  })
  
  expect(patterns[0]).toMatchObject({
    pattern_type: 'timing',
    confidence: expect.any(Number),
    pattern_data: expect.objectContaining({
      peak_hours: expect.any(Array)
    })
  })
})
```

**Engagement Pattern Analysis**
- Average engagement scoring
- Peak engagement time identification
- Content preference analysis
- Response rate patterns

**Frequency Pattern Detection**
- Daily activity variance
- Weekly/monthly cycles
- Seasonal trends
- Usage consistency

### 2. Anomaly Detection Tests

**Volume Anomaly Detection**
```typescript
test('should detect volume anomalies', async () => {
  const anomalies = await patternRecognitionEngine.detectAnomalies('test-org-123', {
    sensitivity: 'medium'
  })
  
  expect(anomalies).toEqual(expect.arrayContaining([
    expect.objectContaining({
      anomaly_type: 'volume',
      severity: expect.stringMatching(/low|medium|high|critical/),
      confidence_score: expect.any(Number)
    })
  ]))
})
```

**Sensitivity Calibration**
- High sensitivity: More anomalies detected
- Medium sensitivity: Balanced detection
- Low sensitivity: Only critical anomalies

**Anomaly Types Validated**
- Volume: Unusual activity bursts
- Timing: Off-hours activity
- Sequence: Atypical event chains
- Velocity: Rapid successive actions

### 3. User Profiling Tests

**Behavioral Segmentation**
```typescript
test('should segment users correctly', async () => {
  const profiles = await patternRecognitionEngine.generateUserEngagementProfiles(
    'test-org-123',
    ['user-001', 'user-002']
  )
  
  expect(profiles[0]).toMatchObject({
    behaviorSegment: expect.stringMatching(/highly_engaged|moderately_engaged|low_engagement|at_risk/),
    engagementScore: expect.any(Number),
    activityPatterns: expect.objectContaining({
      peakHours: expect.any(Array)
    })
  })
})
```

**Profile Components Tested**
- Engagement scoring (0-10 scale)
- Activity pattern identification
- Risk factor assessment
- Personalized recommendations

### 4. Predictive Notification Tests

**Smart Notification Generation**
```typescript
test('should generate optimized notification with timing prediction', async () => {
  const result = await predictiveNotificationService.generateSmartNotification({
    userId: 'user-001',
    type: 'meeting_reminder',
    title: 'Board Meeting Tomorrow',
    priority: 'high'
  })
  
  expect(result).toMatchObject({
    predictionId: expect.any(String),
    scheduledTime: expect.any(String),
    confidence: expect.any(Number),
    optimization: expect.objectContaining({
      selectedTiming: expect.objectContaining({
        hour: expect.any(Number)
      })
    })
  })
})
```

**Optimization Features Tested**
- Timing optimization based on user patterns
- Priority-based scheduling
- Business hours constraints
- Anti-flooding protection
- Engagement rate prediction

### 5. Performance Validation Tests

**Model Accuracy Tracking**
```typescript
test('should track model improvement over time', async () => {
  const performance = await predictiveNotificationService.generatePerformanceReport('test-org-123')
  
  expect(performance.trends.accuracyTrend).toBe('improving')
  expect(performance.summary.accuracyScore).toBeGreaterThan(0.7)
})
```

**Metrics Validated**
- Prediction accuracy (target: >80%)
- Confidence calibration
- Engagement prediction error
- Model improvement trends

### 6. API Integration Tests

**Endpoint Testing**
- GET `/api/notifications/predictions` - Insights, predictions, performance
- POST `/api/notifications/predictions` - Smart notifications, bulk optimization
- PUT `/api/notifications/predictions` - Reschedule, cancel
- GET `/api/notifications/patterns/analyze` - Pattern analysis
- POST `/api/notifications/patterns/analyze` - Generate profiles, predict timing
- GET/POST `/api/notifications/anomalies` - Anomaly management

**Authentication & Authorization**
- User authentication validation
- Organization access control
- Role-based permissions (admin/owner for reports)

## Running the Tests

### Unit Tests
```bash
# Run all ML model tests
npm test -- __tests__/ml-models/

# Run specific test file
npm test -- __tests__/ml-models/pattern-recognition.test.ts

# Run with coverage
npm test -- --coverage
```

### API Tests
```bash
# Run API integration tests
npm test -- __tests__/api/

# Run specific API test
npm test -- __tests__/api/notifications-predictions.test.ts
```

### Interactive ML Demo
```bash
# Run the interactive ML demonstration
npx tsx scripts/test-ml-predictions.ts
```

This script provides a comprehensive demonstration of:
- Pattern recognition with sample data
- Anomaly detection across different sensitivity levels
- User engagement profile generation
- Optimal timing predictions
- Smart notification generation
- Predictive insights generation
- Performance metrics calculation

### Test Coverage Goals

**Target Coverage**: 85%+ for all ML and API components

**Critical Components**:
- Pattern Recognition Engine: 90%+
- Anomaly Detection: 85%+
- Predictive Notifications: 90%+
- API Endpoints: 95%+

## Test Data Characteristics

### Scale
- **20 test users** with different behavioral profiles
- **90 days** of historical activity data
- **500 notifications** with realistic engagement patterns
- **12 months** of board meeting data
- **5% anomaly injection rate** for detection testing

### Realism
- **Seasonal patterns** reflecting real business cycles
- **Engagement rates** based on notification type research
- **Activity patterns** matching typical knowledge worker behavior
- **Meeting schedules** following board governance norms

## Validation Criteria

### Pattern Recognition
- ✅ Detects timing patterns with >60% confidence
- ✅ Identifies engagement patterns across user segments
- ✅ Recognizes frequency patterns and cycles
- ✅ Analyzes content preferences accurately

### Anomaly Detection
- ✅ Detects injected anomalies with <5% false negatives
- ✅ Maintains <10% false positive rate
- ✅ Properly calibrates sensitivity levels
- ✅ Assigns appropriate severity scores

### Predictive Accuracy
- ✅ Timing predictions within 2-hour accuracy for 70%+ of cases
- ✅ Engagement rate predictions within 15% error margin
- ✅ Confidence scores correlate with actual accuracy
- ✅ Model performance improves with more data

### API Reliability
- ✅ All endpoints respond within 5 seconds
- ✅ Proper error handling for edge cases
- ✅ Authentication/authorization working correctly
- ✅ Data validation preventing malformed requests

## Continuous Testing

The test suite is designed for:
- **CI/CD Integration**: Automated testing on every commit
- **Performance Monitoring**: Tracking ML model accuracy over time
- **Regression Testing**: Ensuring new features don't break existing functionality
- **Load Testing**: Validating system performance under realistic loads

## Future Enhancements

- **A/B Testing Framework**: Compare different ML model versions
- **Real-world Data Integration**: Validate with actual customer data
- **Edge Case Expansion**: More sophisticated anomaly scenarios
- **Performance Benchmarking**: Cross-model accuracy comparisons
- **Integration Testing**: End-to-end workflow validation

This comprehensive testing strategy ensures the Predictive Intelligence system delivers reliable, accurate, and valuable insights for board governance optimization.