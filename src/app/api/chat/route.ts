import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { queryPricesFast, type ChatMessage } from '@/lib/openai-responses'
import { getOrCreateMasterVectorStore } from '@/lib/openai'
import { cookies } from 'next/headers'

// Ultra-fast chat API using OpenAI Responses API
// Target: 50ms response time for Venezuelan B2B price queries
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('🚀 Chat API called at', new Date().toISOString())
  
  try {
    // Create server client to get authenticated user
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

    const { 
      message, 
      conversationId,
      conversationHistory = []
    } = await request.json()

    const userId = session.user.id

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // MASTER VECTOR STORE APPROACH (Best Practice)
    // One vector store containing all active PDFs - fastest & most efficient
    const supabaseAdmin = createSupabaseAdmin()
    
    // Get all active file IDs to sync with master vector store
    const { data: activeFiles, error: fileError } = await supabaseAdmin
      .from('price_lists')
      .select('openai_file_id, file_name, supplier_name')
      .eq('is_active', true)
      .not('openai_file_id', 'is', null)
      .order('uploaded_at', { ascending: false })

    if (fileError) {
      console.error('Error fetching active files:', fileError)
      return NextResponse.json(
        { error: 'Failed to get active price catalogs' },
        { status: 500 }
      )
    }

    if (!activeFiles || activeFiles.length === 0) {
      return NextResponse.json({
        success: true,
        response: 'No hay catálogos de precios activos en este momento. Por favor, contacta al administrador para activar los catálogos necesarios.',
        tokens_used: 0,
        response_time_ms: Date.now() - startTime,
        active_catalogs: 0
      })
    }

    // Get master vector store for querying (no sync - that's handled when files change)
    console.log(`🚀 MASTER STORE: Querying ${activeFiles.length} active catalogs: ${activeFiles.map(f => f.file_name).join(', ')}`)
    
    try {
      // Just get the master vector store - sync only happens when files are added/removed
      const masterStore = await getOrCreateMasterVectorStore()
      console.log(`✅ Using master vector store: ${masterStore.id} (${masterStore.file_counts.total} files)`)
      
      var masterStoreId = masterStore.id
    } catch (error) {
      console.error('Master vector store error:', error)
      return NextResponse.json(
        { error: 'Failed to access price catalogs' },
        { status: 500 }
      )
    }

    // Execute ultra-fast price query
    const queryStartTime = Date.now()
    let aiResponse
    let queryTime = 0
    
    try {
      aiResponse = await queryPricesFast(
        message,
        [masterStoreId], // Single master vector store containing all PDFs
        conversationHistory
      )
      queryTime = Date.now() - queryStartTime
      console.log('🔍 OpenAI query completed successfully, about to start message storage...')
    } catch (error) {
      queryTime = Date.now() - queryStartTime
      console.log('⚠️ OpenAI query failed, but still saving messages to database...')
      console.error('OpenAI Error:', error)
      
      // Create a fallback response for database storage
      aiResponse = {
        content: 'Lo siento, hubo un error procesando tu consulta. Por favor intenta nuevamente.',
        tokens_used: 0,
        response_time_ms: queryTime
      }
    }

    // Always save messages to database - create conversation if needed
    console.log('💾 Starting message storage. User:', userId.slice(-8), 'ConvID:', conversationId?.slice(-8) || 'new')
    
    let actualConversationId = conversationId
    
    if (!actualConversationId) {
      console.log('💾 Creating new conversation...')
      // Create a new conversation for this chat session
      const { data: newConversation, error: conversationError } = await supabaseAdmin
        .from('conversations')
        .insert({
          user_id: userId,
          title: `Chat ${new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
        })
        .select('id')
        .single()

      if (conversationError) {
        console.error('❌ Error creating conversation:', conversationError)
        // Continue without conversation ID - save messages anyway
      } else {
        actualConversationId = newConversation.id
        console.log('✅ Created conversation:', actualConversationId.slice(-8))
      }
    } else {
      console.log('💾 Using existing conversation:', actualConversationId.slice(-8))
    }

    // Save user message to database
    const { data: savedUserMessage, error: userMessageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: actualConversationId,
        user_id: userId,
        content: message,
        role: 'user',
        response_time_ms: 0,
        tokens_used: 0
      })
      .select()

    if (userMessageError) {
      console.error('❌ Error saving user message:', userMessageError)
    } else {
      console.log('✅ User message saved')
    }
    
    // Save AI response to database
    const { data: savedAiMessage, error: aiMessageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: actualConversationId,
        user_id: userId,
        content: aiResponse.content,
        role: 'assistant',
        response_time_ms: aiResponse.response_time_ms || 0,
        tokens_used: aiResponse.tokens_used || 0
      })
      .select()

    if (aiMessageError) {
      console.error('❌ Error saving AI message:', aiMessageError)
    } else {
      console.log('✅ AI response saved (', aiResponse.tokens_used || 0, 'tokens,', aiResponse.response_time_ms || 0, 'ms)')
    }
    
    console.log('💾 Storage completed')

    const totalTime = Date.now() - startTime
    
    console.log(`Chat response completed in ${totalTime}ms (query: ${queryTime}ms)`)

    return NextResponse.json({
      success: true,
      response: aiResponse.content,
      conversationId: actualConversationId, // Include conversation ID in response
      tokens_used: aiResponse.tokens_used,
      response_time_ms: totalTime,
      query_time_ms: queryTime,
      active_catalogs: activeFiles.length,
      performance_target: totalTime <= 50 ? 'ACHIEVED' : totalTime <= 100 ? 'ACCEPTABLE' : 'MISSED' // 50ms target
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.log('='.repeat(50))
    console.error('❌ CHAT API ERROR - CAUGHT IN MAIN HANDLER')
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error name:', error?.name)
    console.error('❌ Error message:', error?.message)
    console.error('❌ Error stack:', error?.stack)
    console.error('❌ Full error object:', error)
    console.log('='.repeat(50))
    
    return NextResponse.json(
      { 
        error: 'Error procesando consulta de precios',
        details: error.message || 'Unknown error',
        response_time_ms: totalTime,
        performance_target: 'FAILED'
      },
      { status: 500 }
    )
  }
}

// Get conversation history
export async function GET(request: NextRequest) {
  try {
    // Create server client to get authenticated user
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

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    // Get conversation messages using admin client
    const supabaseAdmin = createSupabaseAdmin()
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('id, content, role, tokens_used, response_time_ms, created_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching conversation:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversation history' },
        { status: 500 }
      )
    }

    // Format for frontend
    const formattedMessages: ChatMessage[] = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }))

    // Calculate performance metrics
    const assistantMessages = messages.filter(msg => msg.role === 'assistant')
    const avgResponseTime = assistantMessages.length > 0 
      ? assistantMessages.reduce((sum, msg) => sum + (msg.response_time_ms || 0), 0) / assistantMessages.length
      : 0

    const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens_used || 0), 0)

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      conversation_stats: {
        total_messages: messages.length,
        avg_response_time_ms: Math.round(avgResponseTime),
        total_tokens_used: totalTokens,
        performance_rating: avgResponseTime <= 100 ? 'EXCELLENT' : avgResponseTime <= 500 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
      }
    })

  } catch (error: any) {
    console.error('Get conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to get conversation history', details: error.message },
      { status: 500 }
    )
  }
}