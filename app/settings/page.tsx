"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()

  if (!user) {
    return (
      <PageLayout title="Settings">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Not Logged In</h2>
          <p className="text-gray-500 mb-4">Please log in to access settings.</p>
          <Button onClick={() => router.push("/login")}>Go to Login</Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your account settings and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={user.full_name || ""} placeholder="Enter your full name" />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your writing experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-save</Label>
                <p className="text-sm text-gray-500">Automatically save your work every few seconds.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Real-time Suggestions</Label>
                <p className="text-sm text-gray-500">Get writing suggestions as you type.</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions that affect your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
