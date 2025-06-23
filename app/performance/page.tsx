'use client'

import { useState, useEffect } from 'react'
import { PerformanceDashboard } from '@/components/performance-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react'

export default function PerformancePage() {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)

  const refreshData = () => {
    setLastRefresh(new Date())
  }

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshData()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [autoRefresh])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performance Monitor</h1>
          <p className="text-gray-600">
            Real-time performance metrics and system health monitoring
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              className="flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span>{autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}</span>
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        <PerformanceDashboard />

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Performance Tips</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Dashboard loads should be under 500ms</li>
                <li>• Document saves should be under 300ms</li>
                <li>• API responses should be under 200ms</li>
                <li>• Monitor for operations over 1 second</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span>Common Issues</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• 401 errors indicate session timeout</li>
                <li>• Slow database queries need indexing</li>
                <li>• Network latency affects response times</li>
                <li>• Large payloads slow down parsing</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 