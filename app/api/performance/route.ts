import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceStats } from '@/lib/performance'

export async function GET(request: NextRequest) {
  try {
    const stats = getPerformanceStats()
    
    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Performance API error:', error)
    return NextResponse.json(
      { error: 'Failed to get performance stats' },
      { status: 500 }
    )
  }
} 