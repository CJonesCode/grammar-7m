"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface Document {
  id: string
  title: string
  content?: string
  last_edited_at: string
  created_at: string
  readability_score: any
  word_count?: number
}

interface CreateDocumentDialogProps {
  onDocumentCreated: (document: Document) => void
}

export function CreateDocumentDialog({ onDocumentCreated }: CreateDocumentDialogProps) {
  const router = useRouter()
  const [newDocTitle, setNewDocTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState("")

  const createDocument = async () => {
    if (!newDocTitle.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newDocTitle,
          content: "",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create document")
      }

      const { document: data } = await response.json()

      onDocumentCreated(data)
      setNewDocTitle("")
      setDialogOpen(false)
      router.push(`/editor/${data.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Document</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
          <DialogDescription>Enter a title for your new document. You can change this later.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Document Title</Label>
            <Input
              id="title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder="Enter document title..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createDocument()
                }
              }}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDocument} disabled={isCreating || !newDocTitle.trim()}>
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 