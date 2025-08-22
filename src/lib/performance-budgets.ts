// Performance budgets and thresholds for different component types
export interface PerformanceBudget {
  componentName: string
  componentType: 'page' | 'modal' | 'list' | 'form' | 'card' | 'utility'
  budgets: {
    maxRenderTime: number // ms
    maxRenderCount: number // per minute
    maxMemoryUsage?: number // MB
    maxBundleSize?: number // KB
  }
  alerts: {
    warningThreshold: number // percentage of budget
    criticalThreshold: number // percentage of budget
  }
}

// Default performance budgets by component type
export const DEFAULT_PERFORMANCE_BUDGETS: Record<string, PerformanceBudget> = {
  page: {
    componentName: '*Page',
    componentType: 'page',
    budgets: {
      maxRenderTime: 50, // Pages can take longer to render
      maxRenderCount: 10,
      maxMemoryUsage: 10,
      maxBundleSize: 500
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  modal: {
    componentName: '*Modal',
    componentType: 'modal',
    budgets: {
      maxRenderTime: 16, // Modals should render quickly
      maxRenderCount: 20,
      maxMemoryUsage: 2,
      maxBundleSize: 50
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  list: {
    componentName: '*List',
    componentType: 'list',
    budgets: {
      maxRenderTime: 25, // Lists can be complex but should be optimized
      maxRenderCount: 50,
      maxMemoryUsage: 5,
      maxBundleSize: 100
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  form: {
    componentName: '*Form',
    componentType: 'form',
    budgets: {
      maxRenderTime: 16, // Forms should be responsive
      maxRenderCount: 30,
      maxMemoryUsage: 3,
      maxBundleSize: 75
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  card: {
    componentName: '*Card',
    componentType: 'card',
    budgets: {
      maxRenderTime: 10, // Cards are simple and should render fast
      maxRenderCount: 100,
      maxMemoryUsage: 1,
      maxBundleSize: 25
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  utility: {
    componentName: '*',
    componentType: 'utility',
    budgets: {
      maxRenderTime: 5, // Utility components should be very fast
      maxRenderCount: 200,
      maxMemoryUsage: 0.5,
      maxBundleSize: 10
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  }
}

// Component-specific budgets for known performance-critical components
export const COMPONENT_SPECIFIC_BUDGETS: Record<string, PerformanceBudget> = {
  'BoardChatPanel': {
    componentName: 'BoardChatPanel',
    componentType: 'modal',
    budgets: {
      maxRenderTime: 20, // Chat should be responsive but can handle some complexity
      maxRenderCount: 30,
      maxMemoryUsage: 3,
      maxBundleSize: 100
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  'NotificationsPanel': {
    componentName: 'NotificationsPanel',
    componentType: 'modal',
    budgets: {
      maxRenderTime: 15,
      maxRenderCount: 25,
      maxMemoryUsage: 2,
      maxBundleSize: 75
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  'DataTable': {
    componentName: 'DataTable',
    componentType: 'list',
    budgets: {
      maxRenderTime: 30, // Tables can be complex with sorting/filtering
      maxRenderCount: 40,
      maxMemoryUsage: 5,
      maxBundleSize: 150
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  },
  'PDFViewerWithAnnotations': {
    componentName: 'PDFViewerWithAnnotations',
    componentType: 'page',
    budgets: {
      maxRenderTime: 100, // PDF rendering can be expensive
      maxRenderCount: 5,
      maxMemoryUsage: 20,
      maxBundleSize: 200
    },
    alerts: {
      warningThreshold: 80,
      criticalThreshold: 120
    }
  }
}

export class PerformanceBudgetManager {
  private budgets: Map<string, PerformanceBudget> = new Map()
  private violations: Array<{
    componentName: string
    budget: PerformanceBudget
    metric: keyof PerformanceBudget['budgets']
    actual: number
    budgeted: number
    severity: 'warning' | 'critical'
    timestamp: number
  }> = []

  constructor() {
    // Load default budgets
    Object.values(DEFAULT_PERFORMANCE_BUDGETS).forEach(budget => {
      this.budgets.set(budget.componentName, budget)
    })

    // Load component-specific budgets
    Object.values(COMPONENT_SPECIFIC_BUDGETS).forEach(budget => {
      this.budgets.set(budget.componentName, budget)
    })
  }

  setBudget(componentName: string, budget: PerformanceBudget): void {
    this.budgets.set(componentName, budget)
  }

  getBudget(componentName: string): PerformanceBudget | null {
    // Try exact match first
    if (this.budgets.has(componentName)) {
      return this.budgets.get(componentName)!
    }

    // Try pattern matching
    for (const [pattern, budget] of this.budgets.entries()) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        if (regex.test(componentName)) {
          return budget
        }
      }
    }

    // Fallback to utility budget
    return this.budgets.get('*') || null
  }

  checkBudget(componentName: string, metrics: {
    renderTime?: number
    renderCount?: number
    memoryUsage?: number
    bundleSize?: number
  }): void {
    const budget = this.getBudget(componentName)
    if (!budget) return

    const checks = [
      { 
        metric: 'maxRenderTime' as const, 
        actual: metrics.renderTime, 
        budgeted: budget.budgets.maxRenderTime 
      },
      { 
        metric: 'maxRenderCount' as const, 
        actual: metrics.renderCount, 
        budgeted: budget.budgets.maxRenderCount 
      },
      { 
        metric: 'maxMemoryUsage' as const, 
        actual: metrics.memoryUsage, 
        budgeted: budget.budgets.maxMemoryUsage 
      },
      { 
        metric: 'maxBundleSize' as const, 
        actual: metrics.bundleSize, 
        budgeted: budget.budgets.maxBundleSize 
      }
    ]

    for (const check of checks) {
      if (check.actual === undefined || check.budgeted === undefined) continue

      const percentage = (check.actual / check.budgeted) * 100

      if (percentage >= budget.alerts.criticalThreshold) {
        this.recordViolation(componentName, budget, check.metric, check.actual, check.budgeted, 'critical')
      } else if (percentage >= budget.alerts.warningThreshold) {
        this.recordViolation(componentName, budget, check.metric, check.actual, check.budgeted, 'warning')
      }
    }
  }

  private recordViolation(
    componentName: string,
    budget: PerformanceBudget,
    metric: keyof PerformanceBudget['budgets'],
    actual: number,
    budgeted: number,
    severity: 'warning' | 'critical'
  ): void {
    const violation = {
      componentName,
      budget,
      metric,
      actual,
      budgeted,
      severity,
      timestamp: Date.now()
    }

    this.violations.push(violation)

    // Keep only recent violations (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    this.violations = this.violations.filter(v => v.timestamp > oneHourAgo)

    // Log violation
    const percentage = (actual / budgeted * 100).toFixed(1)
    const message = `Performance budget ${severity}: ${componentName} ${metric} is ${actual} (${percentage}% of budget ${budgeted})`
    
    if (severity === 'critical') {
      console.error(`🚨 ${message}`)
    } else {
      console.warn(`⚠️ ${message}`)
    }
  }

  getViolations(): typeof this.violations {
    return [...this.violations]
  }

  getComponentBudgetStatus(componentName: string): {
    budget: PerformanceBudget | null
    violations: typeof this.violations
    status: 'good' | 'warning' | 'critical'
  } {
    const budget = this.getBudget(componentName)
    const violations = this.violations.filter(v => v.componentName === componentName)
    
    const hasCritical = violations.some(v => v.severity === 'critical')
    const hasWarning = violations.some(v => v.severity === 'warning')
    
    const status = hasCritical ? 'critical' : hasWarning ? 'warning' : 'good'

    return { budget, violations, status }
  }

  generateBudgetReport(): string {
    const violations = this.getViolations()
    const criticalViolations = violations.filter(v => v.severity === 'critical')
    const warningViolations = violations.filter(v => v.severity === 'warning')

    let report = '💰 Performance Budget Report\n'
    report += '=============================\n\n'

    if (criticalViolations.length > 0) {
      report += '🚨 Critical Budget Violations:\n'
      criticalViolations.forEach(v => {
        const percentage = (v.actual / v.budgeted * 100).toFixed(1)
        report += `  ${v.componentName}: ${v.metric} = ${v.actual} (${percentage}% of budget ${v.budgeted})\n`
      })
      report += '\n'
    }

    if (warningViolations.length > 0) {
      report += '⚠️ Warning Budget Violations:\n'
      warningViolations.forEach(v => {
        const percentage = (v.actual / v.budgeted * 100).toFixed(1)
        report += `  ${v.componentName}: ${v.metric} = ${v.actual} (${percentage}% of budget ${v.budgeted})\n`
      })
      report += '\n'
    }

    if (violations.length === 0) {
      report += '✅ All components are within their performance budgets!\n'
    }

    return report
  }

  reset(): void {
    this.violations = []
  }
}

// Global instance
export const performanceBudgetManager = new PerformanceBudgetManager()

// Hook for using performance budgets in components
export function usePerformanceBudget(componentName: string) {
  const budget = performanceBudgetManager.getBudget(componentName)
  const status = performanceBudgetManager.getComponentBudgetStatus(componentName)

  const checkBudget = (metrics: {
    renderTime?: number
    renderCount?: number
    memoryUsage?: number
    bundleSize?: number
  }) => {
    performanceBudgetManager.checkBudget(componentName, metrics)
  }

  return {
    budget,
    status: status.status,
    violations: status.violations,
    checkBudget
  }
}