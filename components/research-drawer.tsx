"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Search, BookOpen, Database, Users, Lightbulb, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ResearchGuidance {
  researchGuidance: string
  documentTitle: string
  timestamp: string
}

interface ResearchDrawerProps {
  documentId: string
  documentTitle: string
}

export function ResearchDrawer({ documentId, documentTitle }: ResearchDrawerProps) {
  const [researchData, setResearchData] = useState<ResearchGuidance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  const fetchResearchGuidance = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch(`/api/documents/${documentId}/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate research guidance")
      }

      const data = await response.json()
      setResearchData(data)
    } catch (error: any) {
      console.error("❌ Research: Fetch error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    if (open && !researchData) {
      fetchResearchGuidance()
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Research
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Research Guidance
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 h-[calc(100vh-120px)] overflow-y-auto pr-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <div className="text-sm text-gray-600">Analyzing your document and generating research guidance...</div>
            </div>
          ) : researchData ? (
            <div className="space-y-4">
              {/* Document Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Document Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Title:</span> {researchData.documentTitle}
                  </div>
                  <div className="text-sm text-gray-600">
                    Generated: {formatTimestamp(researchData.timestamp)}
                  </div>
                </CardContent>
              </Card>

              {/* Research Guidance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Research Guidance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <div 
                      className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: researchData.researchGuidance
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/\n/g, '<br>')
                          .replace(/^/, '<p>')
                          .replace(/$/, '</p>')
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    Quick Research Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open('https://scholar.google.com', '_blank')}
                      className="justify-start"
                    >
                      <Search className="h-3 w-3 mr-2" />
                      Google Scholar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open('https://www.jstor.org', '_blank')}
                      className="justify-start"
                    >
                      <BookOpen className="h-3 w-3 mr-2" />
                      JSTOR
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open('https://pubmed.ncbi.nlm.nih.gov', '_blank')}
                      className="justify-start"
                    >
                      <Database className="h-3 w-3 mr-2" />
                      PubMed
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open('https://ieeexplore.ieee.org', '_blank')}
                      className="justify-start"
                    >
                      <Users className="h-3 w-3 mr-2" />
                      IEEE Xplore
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Research Guidance</h3>
              <p className="text-gray-600">Click to analyze your document and get research suggestions.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
} 