import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let userId = searchParams.get('userId')

    // If no userId provided, get from authenticated session
    if (!userId) {
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

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      userId = session.user.id
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Try to fetch existing profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profile && !profileError) {
      // Get provider information from auth user
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(userId)
      const provider = authUserData?.user?.app_metadata?.provider || 'email'
      
      const enrichedProfile = {
        ...profile,
        provider,
        name: profile.full_name
      }
      
      return NextResponse.json({ success: true, profile: enrichedProfile })
    }

    // If not found, get auth user to create a profile
    const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (authError || !authUserData?.user) {
      return NextResponse.json(
        { error: 'Auth user not found', details: authError?.message || null },
        { status: 404 }
      )
    }

    const email = authUserData.user.email
    const fullName = (authUserData.user.user_metadata as any)?.full_name || (authUserData.user.user_metadata as any)?.name || null
    const provider = authUserData.user.app_metadata?.provider || 'email'

    // Create minimal profile
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: 'USER',
        is_active: true,
        subscription_expires_at: null,
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { error: 'Failed to create profile', details: createError.message },
        { status: 500 }
      )
    }

    const enrichedNewProfile = {
      ...newProfile,
      provider,
      name: newProfile.full_name
    }

    return NextResponse.json({ success: true, profile: enrichedNewProfile })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
