import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

interface DashboardStats {
  totalFiles: number
  activeFiles: number
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  todayQueries: number
  todayConversations: number
  expiredSubscriptions: number
  validSubscriptions: number
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabaseAdmin = createSupabaseAdmin()

    // Fetch file stats
    const { data: files, error: filesError } = await supabaseAdmin
      .from('price_lists')
      .select('is_active')

    if (filesError) {
      console.error('Files fetch error:', filesError)
      return NextResponse.json(
        { error: 'Failed to fetch file stats' },
        { status: 500 }
      )
    }

    const totalFiles = files?.length || 0
    const activeFiles = files?.filter(f => f.is_active).length || 0

    // Fetch user count and subscription stats
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, subscription_expires_at, role, is_active')

    if (usersError) {
      console.error('Users fetch error:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch user stats' },
        { status: 500 }
      )
    }

    const totalUsers = users?.length || 0
    const activeUsers = users?.filter(u => u.is_active === true).length || 0
    const inactiveUsers = users?.filter(u => u.is_active === false).length || 0
    const now = new Date()

    // Only count subscription stats for USER role (admins don't need subscriptions)
    const regularUsers = users?.filter(u => u.role === 'USER' && u.is_active === true) || []
    const expiredSubscriptions = regularUsers.filter(u =>
      u.subscription_expires_at && new Date(u.subscription_expires_at) < now
    ).length || 0
    const validSubscriptions = regularUsers.filter(u =>
      u.subscription_expires_at && new Date(u.subscription_expires_at) > now
    ).length || 0

    // Fetch today's queries count
    const today = new Date().toISOString().split('T')[0]
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('id')
      .gte('created_at', today)

    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .gte('created_at', today)

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch message stats' },
        { status: 500 }
      )
    }

    if (conversationsError) {
      console.error('Conversations fetch error:', conversationsError)
      return NextResponse.json(
        { error: 'Failed to fetch conversation stats' },
        { status: 500 }
      )
    }

    const todayQueries = messages?.length || 0
    const todayConversations = conversations?.length || 0

    const stats: DashboardStats = {
      totalFiles,
      activeFiles,
      totalUsers,
      activeUsers,
      inactiveUsers,
      todayQueries,
      todayConversations,
      expiredSubscriptions,
      validSubscriptions,
    }

    const processingTime = Date.now() - startTime
    console.log(`Dashboard stats fetched in ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      stats,
      processing_time_ms: processingTime
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`Dashboard stats fetch failed after ${processingTime}ms:`, error)

    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard stats',
        details: error.message,
        processing_time_ms: processingTime
      },
      { status: 500 }
    )
  }
}