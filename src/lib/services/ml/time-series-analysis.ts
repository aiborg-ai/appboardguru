/**
 * Time Series Analysis Module
 * Implements time series forecasting and trend analysis
 */

export interface TimeSeriesData {
  readonly timestamp: Date
  readonly value: number
  readonly metadata?: Record<string, unknown>
}

// Enhanced time series configuration
export interface TimeSeriesConfig {
  readonly smoothingWindow: number
  readonly forecastPeriods: number
  readonly seasonalityTest: boolean
  readonly trendMethod: 'linear' | 'polynomial' | 'exponential'
  readonly anomalyDetection: {
    readonly enabled: boolean
    readonly sensitivity: 'low' | 'medium' | 'high'
    readonly windowSize: number
  }
  readonly confidence: {
    readonly intervals: boolean
    readonly level: number // 0.90, 0.95, 0.99
  }
}

// Statistical analysis results
export interface StatisticalSummary {
  readonly mean: number
  readonly median: number
  readonly stdDev: number
  readonly variance: number
  readonly min: number
  readonly max: number
  readonly q25: number
  readonly q75: number
  readonly skewness: number
  readonly kurtosis: number
  readonly coefficientOfVariation: number
}

export interface TrendAnalysis {
  readonly trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal'
  readonly changeRate: number
  readonly seasonalityDetected: boolean
  readonly forecast: readonly TimeSeriesData[]
  readonly confidence: number
  readonly insights: readonly string[]
  readonly statistics: StatisticalSummary
  readonly trendLine: {
    readonly slope: number
    readonly intercept: number
    readonly rSquared: number
    readonly pValue: number
  }
  readonly residualAnalysis: {
    readonly mean: number
    readonly stdDev: number
    readonly autocorrelation: number
    readonly normalityTest: number // p-value for normality test
  }
}

export interface SeasonalityResult {
  readonly isPresent: boolean
  readonly period: number // in days
  readonly strength: number // 0-1 scale
  readonly peaks: readonly number[] // day indices of seasonal peaks
  readonly confidence: number
  readonly components: {
    readonly trend: readonly number[]
    readonly seasonal: readonly number[]
    readonly residual: readonly number[]
  }
  readonly cyclicalPatterns: readonly {
    readonly period: number
    readonly amplitude: number
    readonly phase: number
  }[]
}

// Forecast validation and accuracy metrics
export interface ForecastAccuracy {
  readonly mae: number // Mean Absolute Error
  readonly mape: number // Mean Absolute Percentage Error
  readonly rmse: number // Root Mean Square Error
  readonly mase: number // Mean Absolute Scaled Error
  readonly aic: number // Akaike Information Criterion
  readonly bic: number // Bayesian Information Criterion
  readonly accuracy: number // Overall accuracy score (0-1)
}

// Advanced decomposition interface
export interface TimeSeriesDecomposition {
  readonly original: readonly TimeSeriesData[]
  readonly trend: readonly TimeSeriesData[]
  readonly seasonal: readonly TimeSeriesData[]
  readonly residual: readonly TimeSeriesData[]
  readonly seasonalityStrength: number
  readonly trendStrength: number
  readonly irregularityIndex: number
}

export class TimeSeriesAnalysis {
  
  /**
   * Analyze trend in time series data
   */
  async analyzeTrend(
    data: readonly TimeSeriesData[],
    config: TimeSeriesConfig = {
      smoothingWindow: 7,
      forecastPeriods: 7,
      seasonalityTest: true,
      trendMethod: 'linear',
      anomalyDetection: {
        enabled: true,
        sensitivity: 'medium',
        windowSize: 14
      },
      confidence: {
        intervals: true,
        level: 0.95
      }
    }
  ): Promise<TrendAnalysis> {
    if (data.length < 7) {
      const defaultStats: StatisticalSummary = {
        mean: 0, median: 0, stdDev: 0, variance: 0,
        min: 0, max: 0, q25: 0, q75: 0,
        skewness: 0, kurtosis: 0, coefficientOfVariation: 0
      }
      
      return {
        trend: 'stable',
        changeRate: 0,
        seasonalityDetected: false,
        forecast: [],
        confidence: 0,
        insights: ['Insufficient data for trend analysis (minimum 7 data points required)'],
        statistics: defaultStats,
        trendLine: {
          slope: 0,
          intercept: 0,
          rSquared: 0,
          pValue: 0
        },
        residualAnalysis: {
          mean: 0,
          stdDev: 0,
          autocorrelation: 0,
          normalityTest: 0
        }
      }
    }

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    // Calculate statistical summary
    const statistics = this.calculateStatisticalSummary(sortedData)
    
    // Detect trend using specified method
    const trendResult = config.trendMethod === 'linear' 
      ? this.detectLinearTrend(sortedData)
      : this.detectLinearTrend(sortedData) // For now, only linear is implemented
    
    // Detect seasonality if enabled
    const seasonality = config.seasonalityTest 
      ? this.detectSeasonality(sortedData)
      : { isPresent: false, period: 0, strength: 0, peaks: [], confidence: 0, components: { trend: [], seasonal: [], residual: [] }, cyclicalPatterns: [] }
    
    // Generate forecast
    const forecast = this.generateForecast(sortedData, config.forecastPeriods, trendResult, seasonality)
    
    // Calculate residual analysis
    const residualAnalysis = this.analyzeResiduals(sortedData, trendResult)
    
    // Calculate confidence
    const confidence = this.calculateTrendConfidence(sortedData, trendResult)
    
    // Generate insights
    const insights = this.generateTrendInsights(trendResult, seasonality, sortedData)

    return {
      trend: this.categorizeTrend(trendResult.slope),
      changeRate: trendResult.slope,
      seasonalityDetected: seasonality.isPresent,
      forecast,
      confidence,
      insights,
      statistics,
      trendLine: {
        slope: trendResult.slope,
        intercept: trendResult.intercept,
        rSquared: trendResult.rSquared,
        pValue: trendResult.significance
      },
      residualAnalysis
    }
  }

  /**
   * Calculate statistical summary of time series data
   */
  private calculateStatisticalSummary(data: readonly TimeSeriesData[]): StatisticalSummary {
    const values = data.map(d => d.value)
    const n = values.length
    
    if (n === 0) {
      return {
        mean: 0, median: 0, stdDev: 0, variance: 0,
        min: 0, max: 0, q25: 0, q75: 0,
        skewness: 0, kurtosis: 0, coefficientOfVariation: 0
      }
    }

    // Sort for percentiles
    const sortedValues = [...values].sort((a, b) => a - b)
    
    // Basic statistics
    const mean = values.reduce((sum, val) => sum + val, 0) / n
    const median = n % 2 === 0
      ? (sortedValues[n / 2 - 1]! + sortedValues[n / 2]!) / 2
      : sortedValues[Math.floor(n / 2)]!
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)
    
    const min = sortedValues[0]!
    const max = sortedValues[n - 1]!
    
    // Quartiles
    const q25 = sortedValues[Math.floor(n * 0.25)]!
    const q75 = sortedValues[Math.floor(n * 0.75)]!
    
    // Skewness and kurtosis
    const skewness = this.calculateSkewness(values, mean, stdDev)
    const kurtosis = this.calculateKurtosis(values, mean, stdDev)
    
    const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0

    return {
      mean, median, stdDev, variance, min, max, q25, q75,
      skewness, kurtosis, coefficientOfVariation
    }
  }

  /**
   * Calculate skewness of data
   */
  private calculateSkewness(values: readonly number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    
    const n = values.length
    const skewSum = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0)
    
    return (n / ((n - 1) * (n - 2))) * skewSum
  }

  /**
   * Calculate kurtosis of data
   */
  private calculateKurtosis(values: readonly number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0
    
    const n = values.length
    const kurtSum = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0)
    
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * kurtSum - 
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3))
  }

  /**
   * Analyze residuals from trend line
   */
  private analyzeResiduals(
    data: readonly TimeSeriesData[],
    trendResult: { slope: number; intercept: number }
  ): {
    readonly mean: number
    readonly stdDev: number
    readonly autocorrelation: number
    readonly normalityTest: number
  } {
    const startTime = data[0]?.timestamp.getTime() ?? Date.now()
    
    // Calculate residuals
    const residuals = data.map((d, i) => {
      const daysSinceStart = (d.timestamp.getTime() - startTime) / (1000 * 60 * 60 * 24)
      const predicted = trendResult.slope * daysSinceStart + trendResult.intercept
      return d.value - predicted
    })

    // Basic residual statistics
    const mean = residuals.reduce((sum, val) => sum + val, 0) / residuals.length
    const variance = residuals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / residuals.length
    const stdDev = Math.sqrt(variance)

    // Autocorrelation at lag 1
    const autocorrelation = this.calculateAutocorrelation(residuals.map((r, i) => ({ 
      timestamp: data[i]!.timestamp, 
      value: r 
    })), 1)

    // Normality test (Jarque-Bera test approximation)
    const skewness = this.calculateSkewness(residuals, mean, stdDev)
    const kurtosis = this.calculateKurtosis(residuals, mean, stdDev)
    const jarqueBera = (residuals.length / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4)
    const normalityTest = 1 - Math.exp(-jarqueBera / 2) // Rough p-value approximation

    return { mean, stdDev, autocorrelation, normalityTest }
  }

  /**
   * Detect linear trend using least squares regression
   */
  private detectLinearTrend(data: readonly TimeSeriesData[]): {
    slope: number
    intercept: number
    rSquared: number
    significance: number
  } {
    const n = data.length
    const startTime = data[0]?.timestamp.getTime() ?? Date.now()
    
    // Convert timestamps to relative days
    const x = data.map(d => (d.timestamp.getTime() - startTime) / (1000 * 60 * 60 * 24))
    const y = data.map(d => d.value)

    // Calculate sums for linear regression
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * (y[i] ?? 0), 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    // Calculate slope and intercept
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared
    const meanY = sumY / n
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * (x[i] ?? 0) + intercept
      return sum + Math.pow(val - predicted, 2)
    }, 0)
    
    const rSquared = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0

    // Calculate statistical significance (simplified t-test)
    const standardError = Math.sqrt(residualSumSquares / (n - 2)) / Math.sqrt(sumXX - (sumX * sumX) / n)
    const tStat = Math.abs(slope / standardError)
    const significance = tStat > 2.0 ? 0.95 : tStat > 1.0 ? 0.68 : 0.32 // Rough approximation

    return {
      slope,
      intercept,
      rSquared: Math.max(0, Math.min(1, rSquared)),
      significance: Math.max(0, Math.min(1, significance))
    }
  }

  /**
   * Detect seasonality in time series data
   */
  private detectSeasonality(data: TimeSeriesData[]): SeasonalityResult {
    if (data.length < 14) {
      return {
        isPresent: false,
        period: 0,
        strength: 0,
        peaks: [],
        confidence: 0,
        components: {
          trend: [],
          seasonal: [],
          residual: []
        },
        cyclicalPatterns: []
      }
    }

    // Test for weekly seasonality (7-day period)
    const weeklyAutocorr = this.calculateAutocorrelation(data, 7)
    
    // Test for monthly seasonality (30-day period) if we have enough data
    let monthlyAutocorr = 0
    if (data.length >= 60) {
      monthlyAutocorr = this.calculateAutocorrelation(data, 30)
    }

    // Determine which seasonality is stronger
    let period = 7
    let strength = weeklyAutocorr
    
    if (monthlyAutocorr > weeklyAutocorr) {
      period = 30
      strength = monthlyAutocorr
    }

    const isPresent = strength > 0.3 // Threshold for significant seasonality

    // Find seasonal peaks
    const peaks = isPresent ? this.findSeasonalPeaks(data, period) : []

    return {
      isPresent,
      period,
      strength: Math.max(0, Math.min(1, strength)),
      peaks,
      confidence: Math.max(0, Math.min(1, strength)),
      components: {
        trend: [],
        seasonal: [],
        residual: []
      },
      cyclicalPatterns: []
    }
  }

  /**
   * Calculate autocorrelation for given lag
   */
  private calculateAutocorrelation(data: TimeSeriesData[], lag: number): number {
    if (data.length <= lag) return 0

    const values = data.map(d => d.value)
    const n = values.length - lag

    // Calculate means
    const mean1 = values.slice(0, n).reduce((sum, val) => sum + val, 0) / n
    const mean2 = values.slice(lag).reduce((sum, val) => sum + val, 0) / n

    // Calculate covariance and variances
    let covariance = 0
    let variance1 = 0
    let variance2 = 0

    for (let i = 0; i < n; i++) {
      const dev1 = (values[i] ?? 0) - mean1
      const dev2 = (values[i + lag] ?? 0) - mean2
      
      covariance += dev1 * dev2
      variance1 += dev1 * dev1
      variance2 += dev2 * dev2
    }

    const denominator = Math.sqrt(variance1 * variance2)
    return denominator > 0 ? covariance / denominator : 0
  }

  /**
   * Find seasonal peaks in the data
   */
  private findSeasonalPeaks(data: TimeSeriesData[], period: number): number[] {
    const values = data.map(d => d.value)
    const peaks: number[] = []

    // Group data by day within the period
    const periodicData: number[][] = Array(period).fill(null).map(() => [])
    
    for (let i = 0; i < values.length; i++) {
      const dayInPeriod = i % period
      const value = values[i]
      if (value !== undefined) {
        periodicData[dayInPeriod]?.push(value)
      }
    }

    // Calculate average for each day in period
    const averages = periodicData.map(dayValues => 
      dayValues.length > 0 ? dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length : 0
    )

    // Find peaks (local maxima)
    const overallMean = averages.reduce((sum, val) => sum + val, 0) / averages.length
    
    for (let i = 0; i < averages.length; i++) {
      const prev = averages[i === 0 ? averages.length - 1 : i - 1] ?? 0
      const curr = averages[i] ?? 0
      const next = averages[i === averages.length - 1 ? 0 : i + 1] ?? 0

      if (curr > prev && curr > next && curr > overallMean) {
        peaks.push(i)
      }
    }

    return peaks
  }

  /**
   * Generate forecast for future periods
   */
  private generateForecast(
    data: TimeSeriesData[],
    periods: number,
    trend: { slope: number; intercept: number },
    seasonality: SeasonalityResult
  ): TimeSeriesData[] {
    const forecast: TimeSeriesData[] = []
    const lastDataPoint = data[data.length - 1]
    if (!lastDataPoint) {
      return forecast
    }
    const firstDataPoint = data[0]
    if (!firstDataPoint) {
      return forecast
    }
    const startTime = firstDataPoint.timestamp.getTime()
    const dayMs = 24 * 60 * 60 * 1000

    for (let i = 1; i <= periods; i++) {
      const forecastTime = new Date(lastDataPoint.timestamp.getTime() + i * dayMs)
      const daysSinceStart = (forecastTime.getTime() - startTime) / dayMs
      
      // Base trend prediction
      let forecastValue = trend.slope * daysSinceStart + trend.intercept

      // Add seasonal component if detected
      if (seasonality.isPresent) {
        const dayInPeriod = Math.floor(daysSinceStart) % seasonality.period
        const seasonalMultiplier = this.getSeasonalMultiplier(data, seasonality, dayInPeriod)
        forecastValue *= seasonalMultiplier
      }

      // Ensure non-negative values for most business metrics
      forecastValue = Math.max(0, forecastValue)

      forecast.push({
        timestamp: forecastTime,
        value: forecastValue,
        metadata: { 
          type: 'forecast',
          confidence: this.calculateForecastConfidence(i, periods)
        }
      })
    }

    return forecast
  }

  /**
   * Get seasonal multiplier for a specific day in the period
   */
  private getSeasonalMultiplier(
    data: TimeSeriesData[],
    seasonality: SeasonalityResult,
    dayInPeriod: number
  ): number {
    const values = data.map(d => d.value)
    const periodicValues: number[] = []

    // Collect values for this day in the period
    for (let i = dayInPeriod; i < values.length; i += seasonality.period) {
      const value = values[i]
      if (value !== undefined) {
        periodicValues.push(value)
      }
    }

    if (periodicValues.length === 0) return 1

    const avgForDay = periodicValues.reduce((sum, val) => sum + val, 0) / periodicValues.length
    const overallAvg = values.reduce((sum, val) => sum + val, 0) / values.length

    return overallAvg > 0 ? avgForDay / overallAvg : 1
  }

  /**
   * Calculate confidence for trend analysis
   */
  private calculateTrendConfidence(
    data: TimeSeriesData[],
    trend: { rSquared: number; significance: number }
  ): number {
    const dataQuality = Math.min(data.length / 30, 1) // More data = higher confidence
    const trendStrength = trend.rSquared
    const statisticalSignificance = trend.significance

    return (dataQuality * 0.3 + trendStrength * 0.4 + statisticalSignificance * 0.3)
  }

  /**
   * Calculate forecast confidence (decreases with distance)
   */
  private calculateForecastConfidence(period: number, totalPeriods: number): number {
    return Math.max(0.1, 1 - (period - 1) / totalPeriods)
  }

  /**
   * Categorize trend based on slope
   */
  private categorizeTrend(slope: number): 'increasing' | 'decreasing' | 'stable' | 'seasonal' {
    if (Math.abs(slope) < 0.01) {
      return 'stable'
    } else if (slope > 0) {
      return 'increasing'
    } else {
      return 'decreasing'
    }
  }

  /**
   * Generate insights based on trend analysis
   */
  private generateTrendInsights(
    trend: { slope: number; rSquared: number; significance: number },
    seasonality: SeasonalityResult,
    data: TimeSeriesData[]
  ): string[] {
    const insights: string[] = []

    // Trend insights
    if (Math.abs(trend.slope) > 0.05) {
      const direction = trend.slope > 0 ? 'increasing' : 'decreasing'
      const rate = Math.abs(trend.slope * 30).toFixed(1) // Monthly rate
      insights.push(`Strong ${direction} trend detected: ${rate} units per month`)
    } else if (Math.abs(trend.slope) > 0.01) {
      const direction = trend.slope > 0 ? 'slight increase' : 'slight decrease'
      insights.push(`Modest trend: ${direction} over time`)
    }

    // R-squared insights
    if (trend.rSquared > 0.8) {
      insights.push('Trend is highly predictable (strong linear relationship)')
    } else if (trend.rSquared > 0.5) {
      insights.push('Trend is moderately predictable')
    } else if (trend.rSquared > 0.2) {
      insights.push('Trend is weakly predictable (high variability)')
    } else {
      insights.push('Data shows high variability with unclear trend')
    }

    // Seasonality insights
    if (seasonality.isPresent) {
      const periodText = seasonality.period === 7 ? 'weekly' : 
                        seasonality.period === 30 ? 'monthly' : 
                        `${seasonality.period}-day`
      insights.push(`${periodText.charAt(0).toUpperCase() + periodText.slice(1)} seasonal pattern detected`)
      
      if (seasonality.strength > 0.7) {
        insights.push('Strong seasonal influence on the data')
      } else if (seasonality.strength > 0.4) {
        insights.push('Moderate seasonal influence detected')
      }

      if (seasonality.peaks.length > 0) {
        if (seasonality.period === 7) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          const peakDays = seasonality.peaks.map(p => dayNames[p]).join(', ')
          insights.push(`Peak activity days: ${peakDays}`)
        } else {
          insights.push(`Peak activity occurs on days: ${seasonality.peaks.join(', ')} of the ${seasonality.period}-day cycle`)
        }
      }
    }

    // Data quality insights
    const dataRange = Math.max(...data.map(d => d.value)) - Math.min(...data.map(d => d.value))
    const dataAvg = data.reduce((sum, d) => sum + d.value, 0) / data.length
    const variabilityRatio = dataRange / dataAvg

    if (variabilityRatio > 2) {
      insights.push('High variability in data - consider external factors')
    } else if (variabilityRatio < 0.2) {
      insights.push('Low variability - stable baseline with minor fluctuations')
    }

    // Time span insights
    const lastDataPoint = data[data.length - 1]
    const firstDataPoint = data[0]
    const timeSpanDays = lastDataPoint && firstDataPoint ? 
      (lastDataPoint.timestamp.getTime() - firstDataPoint.timestamp.getTime()) / (1000 * 60 * 60 * 24) : 0
    if (timeSpanDays > 90) {
      insights.push('Long-term data available - trend analysis is reliable')
    } else if (timeSpanDays > 30) {
      insights.push('Medium-term data available - trend should be monitored')
    } else {
      insights.push('Short-term data - trend may not be representative of long-term pattern')
    }

    return insights
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   */
  decomposeTimeSeries(
    data: readonly TimeSeriesData[],
    period: number = 7,
    method: 'additive' | 'multiplicative' = 'additive'
  ): TimeSeriesDecomposition {
    if (data.length < period * 2) {
      throw new Error(`Insufficient data for decomposition. Need at least ${period * 2} data points.`)
    }

    // Extract trend using moving average
    const trendData = this.extractTrend(data, period)
    
    // Extract seasonal component
    const seasonalData = this.extractSeasonal(data, trendData, period, method)
    
    // Calculate residuals
    const residualData = this.calculateResiduals(data, trendData, seasonalData, method)
    
    // Calculate strength metrics
    const seasonalityStrength = this.calculateSeasonalityStrength(data, seasonalData)
    const trendStrength = this.calculateTrendStrength(data, trendData)
    const irregularityIndex = this.calculateIrregularityIndex(residualData)

    return {
      original: data,
      trend: trendData,
      seasonal: seasonalData,
      residual: residualData,
      seasonalityStrength,
      trendStrength,
      irregularityIndex
    }
  }

  /**
   * Extract trend component using centered moving average
   */
  private extractTrend(data: readonly TimeSeriesData[], period: number): readonly TimeSeriesData[] {
    const trend: TimeSeriesData[] = []
    const halfPeriod = Math.floor(period / 2)
    
    for (let i = halfPeriod; i < data.length - halfPeriod; i++) {
      const window = data.slice(i - halfPeriod, i + halfPeriod + 1)
      const avgValue = window.reduce((sum, d) => sum + d.value, 0) / window.length
      
      trend.push({
        timestamp: data[i]!.timestamp,
        value: avgValue,
        metadata: { component: 'trend' }
      })
    }
    
    return trend
  }

  /**
   * Extract seasonal component
   */
  private extractSeasonal(
    data: readonly TimeSeriesData[],
    trend: readonly TimeSeriesData[],
    period: number,
    method: 'additive' | 'multiplicative'
  ): readonly TimeSeriesData[] {
    const seasonal: TimeSeriesData[] = []
    const seasonalAverages = new Array(period).fill(0)
    const seasonalCounts = new Array(period).fill(0)
    
    // Calculate seasonal averages
    for (let i = 0; i < data.length; i++) {
      const seasonIndex = i % period
      const trendIndex = Math.max(0, Math.min(trend.length - 1, i - Math.floor(period / 2)))
      const trendValue = trend[trendIndex]?.value ?? data[i]!.value
      
      const detrended = method === 'additive' 
        ? data[i]!.value - trendValue
        : trendValue !== 0 ? data[i]!.value / trendValue : 1
      
      seasonalAverages[seasonIndex] += detrended
      seasonalCounts[seasonIndex]++
    }
    
    // Normalize seasonal averages
    for (let i = 0; i < period; i++) {
      if (seasonalCounts[i] > 0) {
        seasonalAverages[i] /= seasonalCounts[i]
      }
    }
    
    // Generate seasonal component for all data points
    for (let i = 0; i < data.length; i++) {
      const seasonIndex = i % period
      seasonal.push({
        timestamp: data[i]!.timestamp,
        value: seasonalAverages[seasonIndex]!,
        metadata: { component: 'seasonal', seasonIndex }
      })
    }
    
    return seasonal
  }

  /**
   * Calculate residual component
   */
  private calculateResiduals(
    original: readonly TimeSeriesData[],
    trend: readonly TimeSeriesData[],
    seasonal: readonly TimeSeriesData[],
    method: 'additive' | 'multiplicative'
  ): readonly TimeSeriesData[] {
    const residuals: TimeSeriesData[] = []
    
    for (let i = 0; i < original.length; i++) {
      const originalValue = original[i]!.value
      const trendIndex = Math.max(0, Math.min(trend.length - 1, i - Math.floor(trend.length / 2)))
      const trendValue = trend[trendIndex]?.value ?? originalValue
      const seasonalValue = seasonal[i]?.value ?? (method === 'additive' ? 0 : 1)
      
      const residualValue = method === 'additive'
        ? originalValue - trendValue - seasonalValue
        : trendValue !== 0 && seasonalValue !== 0 
          ? originalValue / (trendValue * seasonalValue)
          : 0
      
      residuals.push({
        timestamp: original[i]!.timestamp,
        value: residualValue,
        metadata: { component: 'residual' }
      })
    }
    
    return residuals
  }

  /**
   * Calculate forecast accuracy metrics
   */
  validateForecast(
    actual: readonly TimeSeriesData[],
    predicted: readonly TimeSeriesData[]
  ): ForecastAccuracy {
    if (actual.length !== predicted.length) {
      throw new Error('Actual and predicted data must have the same length')
    }
    
    const n = actual.length
    let mae = 0, mape = 0, rmse = 0, mase = 0
    
    // Calculate errors
    const errors = actual.map((a, i) => {
      const actualValue = a.value
      const predictedValue = predicted[i]?.value ?? 0
      const error = actualValue - predictedValue
      const absError = Math.abs(error)
      const percentError = actualValue !== 0 ? absError / Math.abs(actualValue) : 0
      
      mae += absError
      mape += percentError
      rmse += error * error
      
      return { error, absError, percentError }
    })
    
    mae /= n
    mape = (mape / n) * 100
    rmse = Math.sqrt(rmse / n)
    
    // Calculate MASE (Mean Absolute Scaled Error)
    if (actual.length > 1) {
      const naiveForecastMAE = actual.slice(1).reduce((sum, a, i) => {
        return sum + Math.abs(a.value - actual[i]!.value)
      }, 0) / (actual.length - 1)
      
      mase = naiveForecastMAE !== 0 ? mae / naiveForecastMAE : 0
    }
    
    // Calculate AIC and BIC (simplified)
    const logLikelihood = -n * Math.log(rmse) - n * Math.log(2 * Math.PI) / 2 - rmse / 2
    const k = 3 // Number of parameters (simplified)
    const aic = 2 * k - 2 * logLikelihood
    const bic = Math.log(n) * k - 2 * logLikelihood
    
    // Overall accuracy score
    const accuracy = Math.max(0, Math.min(1, 1 - (mape / 100)))
    
    return { mae, mape, rmse, mase, aic, bic, accuracy }
  }

  /**
   * Calculate seasonality strength
   */
  private calculateSeasonalityStrength(
    original: readonly TimeSeriesData[],
    seasonal: readonly TimeSeriesData[]
  ): number {
    const originalValues = original.map(d => d.value)
    const seasonalValues = seasonal.map(d => d.value)
    
    const originalVariance = this.calculateVariance(originalValues)
    const seasonalVariance = this.calculateVariance(seasonalValues)
    
    return originalVariance !== 0 ? seasonalVariance / originalVariance : 0
  }

  /**
   * Calculate trend strength
   */
  private calculateTrendStrength(
    original: readonly TimeSeriesData[],
    trend: readonly TimeSeriesData[]
  ): number {
    if (trend.length === 0) return 0
    
    const originalValues = original.map(d => d.value)
    const trendValues = trend.map(d => d.value)
    
    // Interpolate trend values to match original length
    const interpolatedTrend = this.interpolateValues(originalValues.length, trendValues)
    
    const correlation = this.calculateCorrelation(originalValues, interpolatedTrend)
    return Math.abs(correlation)
  }

  /**
   * Calculate irregularity index
   */
  private calculateIrregularityIndex(residuals: readonly TimeSeriesData[]): number {
    const residualValues = residuals.map(d => d.value)
    const variance = this.calculateVariance(residualValues)
    const mean = residualValues.reduce((sum, val) => sum + val, 0) / residualValues.length
    
    return mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : Math.sqrt(variance)
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: readonly number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelation(x: readonly number[], y: readonly number[]): number {
    if (x.length !== y.length || x.length === 0) return 0
    
    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0, denomX = 0, denomY = 0
    
    for (let i = 0; i < n; i++) {
      const devX = (x[i] ?? 0) - meanX
      const devY = (y[i] ?? 0) - meanY
      
      numerator += devX * devY
      denomX += devX * devX
      denomY += devY * devY
    }
    
    const denominator = Math.sqrt(denomX * denomY)
    return denominator !== 0 ? numerator / denominator : 0
  }

  /**
   * Interpolate values to match target length
   */
  private interpolateValues(targetLength: number, values: readonly number[]): readonly number[] {
    if (values.length === 0) return new Array(targetLength).fill(0)
    if (values.length === targetLength) return values
    
    const ratio = (values.length - 1) / (targetLength - 1)
    const interpolated: number[] = []
    
    for (let i = 0; i < targetLength; i++) {
      const index = i * ratio
      const lowerIndex = Math.floor(index)
      const upperIndex = Math.ceil(index)
      
      if (lowerIndex === upperIndex) {
        interpolated.push(values[lowerIndex] ?? 0)
      } else {
        const fraction = index - lowerIndex
        const lowerValue = values[lowerIndex] ?? 0
        const upperValue = values[upperIndex] ?? 0
        interpolated.push(lowerValue + fraction * (upperValue - lowerValue))
      }
    }
    
    return interpolated
  }

  /**
   * Smooth time series data using moving average
   */
  smoothData(data: readonly TimeSeriesData[], windowSize: number = 7): readonly TimeSeriesData[] {
    if (data.length < windowSize) return [...data]

    const smoothed: TimeSeriesData[] = []
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(data.length, start + windowSize)
      
      const window = data.slice(start, end)
      const avgValue = window.reduce((sum, d) => sum + d.value, 0) / window.length
      const currentDataPoint = data[i]
      
      if (currentDataPoint) {
        smoothed.push({
          timestamp: currentDataPoint.timestamp,
          value: avgValue,
          metadata: { ...currentDataPoint.metadata, smoothed: true, windowSize }
        })
      }
    }

    return smoothed
  }

  /**
   * Detect anomalies in time series using statistical methods
   */
  detectTimeSeriesAnomalies(
    data: readonly TimeSeriesData[], 
    sensitivity: 'low' | 'medium' | 'high' = 'medium'
  ): {
    readonly anomalies: Array<{
      readonly index: number
      readonly timestamp: Date
      readonly value: number
      readonly expectedValue: number
      readonly zScore: number
      readonly severity: 'low' | 'medium' | 'high'
      readonly confidence: number
    }>
    readonly threshold: number
    readonly method: string
  } {
    if (data.length < 10) {
      return { 
        anomalies: [], 
        threshold: 0,
        method: 'insufficient_data'
      }
    }

    // Calculate rolling statistics
    const windowSize = Math.min(14, Math.floor(data.length / 3))
    const anomalies = []
    
    const thresholds = {
      low: 2.5,
      medium: 2.0,
      high: 1.5
    }
    const threshold = thresholds[sensitivity]

    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i)
      const windowValues = window.map(d => d.value)
      
      const mean = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length
      const variance = windowValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / windowValues.length
      const stdDev = Math.sqrt(variance)
      
      const currentDataPoint = data[i]
      if (!currentDataPoint) continue
      
      const currentValue = currentDataPoint.value
      const zScore = stdDev > 0 ? Math.abs(currentValue - mean) / stdDev : 0
      
      if (zScore > threshold) {
        const severity = zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low'
        
        anomalies.push({
          index: i,
          timestamp: currentDataPoint.timestamp,
          value: currentValue,
          expectedValue: mean,
          zScore,
          severity: severity as 'low' | 'medium' | 'high',
          confidence: Math.min(zScore / 4, 1)
        })
      }
    }

    return { 
      anomalies, 
      threshold,
      method: 'rolling_z_score'
    }
  }
}