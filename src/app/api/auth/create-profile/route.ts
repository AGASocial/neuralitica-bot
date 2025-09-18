import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, fullName } = await request.json()
    
    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking existing profile:', checkError)
      return NextResponse.json(
        { error: 'Database error', details: checkError.message },
        { status: 500 }
      )
    }

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        profile: existingProfile,
        message: 'Profile already exists'
      })
    }

    // Create new profile
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName || null,
        role: 'USER',
        is_active: true,
        subscription_expires_at: null // New users start without a license
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating profile:', createError)
      return NextResponse.json(
        { error: 'Failed to create profile', details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: 'Profile created successfully'
    })

  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}