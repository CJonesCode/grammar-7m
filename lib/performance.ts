// Performance monitoring utilities

interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private maxMetrics = 1000 // Keep last 1000 metrics

  record(operation: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    }
    
    this.metrics.push(metric)
    
    // Keep only the last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  getAverageTime(operation: string, timeWindowMs: number = 60000): number {
    const cutoff = Date.now() - timeWindowMs
    const recentMetrics = this.metrics.filter(
      m => m.operation === operation && m.timestamp > cutoff
    )
    
    if (recentMetrics.length === 0) return 0
    
    const total = recentMetrics.reduce((sum, m) => sum + m.duration, 0)
    return total / recentMetrics.length
  }

  getSlowestOperations(limit: number = 10): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  getStats(): Record<string, any> {
    const now = Date.now()
    const lastMinute = this.metrics.filter(m => now - m.timestamp < 60000)
    const lastHour = this.metrics.filter(m => now - m.timestamp < 3600000)
    
    return {
      totalMetrics: this.metrics.length,
      lastMinute: {
        count: lastMinute.length,
        averageTime: lastMinute.length > 0 
          ? lastMinute.reduce((sum, m) => sum + m.duration, 0) / lastMinute.length 
          : 0
      },
      lastHour: {
        count: lastHour.length,
        averageTime: lastHour.length > 0 
          ? lastHour.reduce((sum, m) => sum + m.duration, 0) / lastHour.length 
          : 0
      },
      slowestOperations: this.getSlowestOperations(5)
    }
  }

  clear() {
    this.metrics = []
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Convenience functions
export function recordPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
  performanceMonitor.record(operation, duration, metadata)
}

export function getPerformanceStats() {
  return performanceMonitor.getStats()
}

// Timer utility
export function createTimer() {
  const start = performance.now()
  return {
    end: (operation: string, metadata?: Record<string, any>) => {
      const duration = performance.now() - start
      recordPerformance(operation, duration, metadata)
      return duration
    }
  }
} 