import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    // Create server client to check session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      return NextResponse.json({
        error: 'Session error',
        details: sessionError.message
      })
    }

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No active session'
      })
    }

    // Get user profile using admin client
    const supabaseAdmin = createSupabaseAdmin()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      session_user: {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata
      },
      profile: profile || null,
      profile_error: profileError?.message || null,
      is_admin: profile?.role === 'ADMIN'
    })

  } catch (error: any) {
    return NextResponse.json({
      error: 'Debug error',
      details: error.message
    })
  }
}