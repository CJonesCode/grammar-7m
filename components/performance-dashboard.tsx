'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PerformanceStats {
  totalMetrics: number
  lastMinute: {
    count: number
    averageTime: number
  }
  lastHour: {
    count: number
    averageTime: number
  }
  slowestOperations: Array<{
    operation: string
    duration: number
    timestamp: number
  }>
}

export function PerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/performance')
      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch performance stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div>Loading performance stats...</div>
  }

  if (!stats) {
    return <div>No performance data available</div>
  }

  const getPerformanceColor = (avgTime: number) => {
    if (avgTime < 100) return 'bg-green-100 text-green-800'
    if (avgTime < 500) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMetrics}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Minute</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.lastMinute.count}</div>
          <Badge className={getPerformanceColor(stats.lastMinute.averageTime)}>
            {stats.lastMinute.averageTime.toFixed(0)}ms avg
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last Hour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.lastHour.count}</div>
          <Badge className={getPerformanceColor(stats.lastHour.averageTime)}>
            {stats.lastHour.averageTime.toFixed(0)}ms avg
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Slowest Operation</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.slowestOperations[0] ? (
            <>
              <div className="text-sm font-medium truncate">
                {stats.slowestOperations[0].operation}
              </div>
              <div className="text-lg font-bold text-red-600">
                {stats.slowestOperations[0].duration.toFixed(0)}ms
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">No data</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 