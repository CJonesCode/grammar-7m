"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function DebugPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testOpenAI = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/openai/test")
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        status: "error",
        message: "Failed to fetch test results",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Debug Dashboard</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>OpenAI API Test</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={testOpenAI} disabled={loading}>
              {loading ? "Testing..." : "Test OpenAI API"}
            </Button>

            {testResult && (
              <div className="mt-4">
                <Alert variant={testResult.status === "success" ? "default" : "destructive"}>
                  <AlertDescription>
                    <strong>Status:</strong> {testResult.status}
                    <br />
                    <strong>Message:</strong> {testResult.message}
                  </AlertDescription>
                </Alert>

                <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
              </div>
              <div>
                <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"}
              </div>
              <div>
                <strong>Client-side check complete</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
