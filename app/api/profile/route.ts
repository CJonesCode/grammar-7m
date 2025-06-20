import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // Check authentication using the singleton server client
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error } = await supabase.from("users").select("*").eq("id", user.id).single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication using the singleton server client
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { full_name } = body

    // Update user profile
    const { data: profile, error } = await supabase
      .from("users")
      .update({ full_name })
      .eq("id", user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error("Update profile API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication using the singleton server client
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete user data (documents will be cascade deleted due to foreign key)
    const { error: deleteUserError } = await supabase.from("users").delete().eq("id", user.id)
    if (deleteUserError) {
      return NextResponse.json({ error: deleteUserError.message }, { status: 500 })
    }

    // Note: We can't delete the auth user from API routes due to RLS
    // The client will handle sign out, which effectively "deletes" the session
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
