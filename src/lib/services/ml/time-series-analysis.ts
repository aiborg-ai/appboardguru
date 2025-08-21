/**
 * Time Series Analysis Module
 * Implements time series forecasting and trend analysis
 */

export interface TimeSeriesData {
  timestamp: Date
  value: number
  metadata?: Record<string, any>
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'seasonal'
  changeRate: number
  seasonalityDetected: boolean
  forecast: TimeSeriesData[]
  confidence: number
  insights: string[]
}

export interface SeasonalityResult {
  isPresent: boolean
  period: number // in days
  strength: number // 0-1 scale
  peaks: number[] // day indices of seasonal peaks
}

export class TimeSeriesAnalysis {
  
  /**
   * Analyze trend in time series data
   */
  async analyzeTrend(data: TimeSeriesData[]): Promise<TrendAnalysis> {
    if (data.length < 7) {
      return {
        trend: 'stable',
        changeRate: 0,
        seasonalityDetected: false,
        forecast: [],
        confidence: 0,
        insights: ['Insufficient data for trend analysis (minimum 7 data points required)']
      }
    }

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    // Detect trend using linear regression
    const trendResult = this.detectLinearTrend(sortedData)
    
    // Detect seasonality
    const seasonality = this.detectSeasonality(sortedData)
    
    // Generate forecast
    const forecast = this.generateForecast(sortedData, 7, trendResult, seasonality) // 7-day forecast
    
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
      insights
    }
  }

  /**
   * Detect linear trend using least squares regression
   */
  private detectLinearTrend(data: TimeSeriesData[]): {
    slope: number
    intercept: number
    rSquared: number
    significance: number
  } {
    const n = data.length
    const startTime = data[0].timestamp.getTime()
    
    // Convert timestamps to relative days
    const x = data.map(d => (d.timestamp.getTime() - startTime) / (1000 * 60 * 60 * 24))
    const y = data.map(d => d.value)

    // Calculate sums for linear regression
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    // Calculate slope and intercept
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared
    const meanY = sumY / n
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept
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
        peaks: []
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
      peaks
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
      const dev1 = values[i] - mean1
      const dev2 = values[i + lag] - mean2
      
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
      periodicData[dayInPeriod].push(values[i])
    }

    // Calculate average for each day in period
    const averages = periodicData.map(dayValues => 
      dayValues.length > 0 ? dayValues.reduce((sum, val) => sum + val, 0) / dayValues.length : 0
    )

    // Find peaks (local maxima)
    const overallMean = averages.reduce((sum, val) => sum + val, 0) / averages.length
    
    for (let i = 0; i < averages.length; i++) {
      const prev = averages[i === 0 ? averages.length - 1 : i - 1]
      const curr = averages[i]
      const next = averages[i === averages.length - 1 ? 0 : i + 1]

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
    const startTime = data[0].timestamp.getTime()
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
      periodicValues.push(values[i])
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
    const timeSpanDays = (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / (1000 * 60 * 60 * 24)
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
   * Smooth time series data using moving average
   */
  smoothData(data: TimeSeriesData[], windowSize: number = 7): TimeSeriesData[] {
    if (data.length < windowSize) return [...data]

    const smoothed: TimeSeriesData[] = []
    
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(data.length, start + windowSize)
      
      const window = data.slice(start, end)
      const avgValue = window.reduce((sum, d) => sum + d.value, 0) / window.length
      
      smoothed.push({
        timestamp: data[i].timestamp,
        value: avgValue,
        metadata: { ...data[i].metadata, smoothed: true, windowSize }
      })
    }

    return smoothed
  }

  /**
   * Detect anomalies in time series using statistical methods
   */
  detectTimeSeriesAnomalies(data: TimeSeriesData[], sensitivity: 'low' | 'medium' | 'high' = 'medium'): {
    anomalies: Array<{
      index: number
      timestamp: Date
      value: number
      expectedValue: number
      zScore: number
      severity: 'low' | 'medium' | 'high'
    }>
    threshold: number
  } {
    if (data.length < 10) {
      return { anomalies: [], threshold: 0 }
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
      
      const currentValue = data[i].value
      const zScore = stdDev > 0 ? Math.abs(currentValue - mean) / stdDev : 0
      
      if (zScore > threshold) {
        const severity = zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low'
        
        anomalies.push({
          index: i,
          timestamp: data[i].timestamp,
          value: currentValue,
          expectedValue: mean,
          zScore,
          severity: severity as 'low' | 'medium' | 'high'
        })
      }
    }

    return { anomalies, threshold }
  }
}