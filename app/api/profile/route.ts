import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { startTimer, endTimer } from "@/lib/debug"
import { getUserIdFromCookie } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  const timer = startTimer()
  try {
    // Check authentication using the singleton server client
    const supabase = createRouteHandlerClient({ cookies })

    const userId = getUserIdFromCookie()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error } = await supabase.from("users").select("*").eq("id", userId).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer("GET /api/profile", timer)
  }
}

export async function PUT(request: NextRequest) {
  const timer = startTimer()
  try {
    // Check authentication using the singleton server client
    const supabase = createRouteHandlerClient({ cookies })

    const userId = getUserIdFromCookie()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { full_name } = body

    // Update user profile
    const { data: profile, error } = await supabase
      .from("users")
      .update({ full_name })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Update profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer("PUT /api/profile", timer)
  }
}

export async function DELETE(request: NextRequest) {
  const timer = startTimer()
  try {
    // Check authentication using the singleton server client
    const supabase = createRouteHandlerClient({ cookies })

    const userId = getUserIdFromCookie()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete user data (documents will be cascade deleted due to foreign key)
    const { error: deleteUserError } = await supabase.from("users").delete().eq("id", userId)
    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 })
    }

    // Note: We can't delete the auth user from API routes due to RLS
    // The client will handle sign out, which effectively "deletes" the session
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer("DELETE /api/profile", timer)
  }
}
