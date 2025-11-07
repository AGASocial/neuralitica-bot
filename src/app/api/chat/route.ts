import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { queryPricesFast, type ChatMessage } from '@/lib/openai-responses'
import { getOrCreateMasterVectorStore, getOrCreateTempVectorStore, waitForVectorStoreReady, generateFileIdsHash } from '@/lib/openai'
import { openaiDirect as openai } from '@/lib/openai-client'
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
      fileIds = [], // Array of price_list IDs to filter by
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
    // OR use individual vector stores when specific files are selected
    const supabaseAdmin = createSupabaseAdmin()
    
    let vectorStoreIds: string[] = []
    let activeCatalogsCount = 0
    
    if (fileIds && fileIds.length > 0) {
      // User selected specific files
      console.log(`🎯 FILTERED SEARCH: User selected ${fileIds.length} specific file(s)`)
      
      const { data: selectedFiles, error: fileError } = await supabaseAdmin
        .from('price_lists')
        .select('openai_file_id, openai_vector_file_id, file_name, supplier_name')
        .in('id', fileIds)
        .eq('is_active', true)
        .not('openai_file_id', 'is', null)

      if (fileError) {
        console.error('Error fetching selected files:', fileError)
        return NextResponse.json(
          { error: 'Failed to get selected files' },
          { status: 500 }
        )
      }

      if (!selectedFiles || selectedFiles.length === 0) {
        return NextResponse.json({
          success: true,
          response: 'Los archivos seleccionados no están disponibles o no están activos. Por favor, selecciona otros archivos.',
          tokens_used: 0,
          response_time_ms: Date.now() - startTime,
          active_catalogs: 0
        })
      }

      // Get OpenAI file IDs for selected files
      const openaiFileIds = selectedFiles
        .map(f => f.openai_file_id)
        .filter((id): id is string => id !== null)

      if (openaiFileIds.length === 0) {
        return NextResponse.json({
          success: true,
          response: 'Los archivos seleccionados no tienen archivos de OpenAI asociados.',
          tokens_used: 0,
          response_time_ms: Date.now() - startTime,
          active_catalogs: 0
        })
      }

      // Optimization: If only one file and it has an individual vector store, use it
      if (selectedFiles.length === 1 && selectedFiles[0].openai_vector_file_id) {
        const singleFile = selectedFiles[0]
        console.log(`✅ Using existing individual vector store for single file: ${singleFile.file_name}`)
        
        try {
          // Verify the vector store exists and is ready
          const vectorStoreStatus = await waitForVectorStoreReady(
            singleFile.openai_vector_file_id,
            20000, // Longer timeout for existing stores (20 seconds)
            1000  // Check every second
          )
          
          // Verify files are actually in the vector store
          const filesInStore = await openai.vectorStores.files.list(singleFile.openai_vector_file_id)
          const completedFilesInStore = filesInStore.data.filter(f => f.status === 'completed')
          
          console.log(`📊 Individual vector store has ${completedFilesInStore.length}/${filesInStore.data.length} completed files`)
          
          if (vectorStoreStatus.status === 'completed' && completedFilesInStore.length > 0) {
            // Additional wait to ensure indexing is complete
            console.log(`⏳ Waiting additional 2 seconds to ensure indexing is complete...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            vectorStoreIds = [singleFile.openai_vector_file_id]
            activeCatalogsCount = 1
            console.log(`✅ Individual vector store ready with ${completedFilesInStore.length} file(s): ${singleFile.file_name}`)
          } else {
            // Vector store not ready, fall through to create temporary
            console.log(`⚠️ Individual vector store not ready (status: ${vectorStoreStatus.status}, completed files: ${completedFilesInStore.length}), creating temporary...`)
            throw new Error('Vector store not ready')
          }
        } catch (error) {
          // If individual vector store doesn't work, fall through to create temporary
          console.log(`⚠️ Could not use individual vector store, creating temporary: ${error}`)
          // Continue to temporary vector store creation below
        }
      }

      // If we don't have vectorStoreIds yet (multiple files or single file without individual store)
      if (vectorStoreIds.length === 0) {
        // Create a temporary vector store with the selected files
        // This ensures we search only in the specified files
        try {
          // First, verify that all OpenAI files are processed and ready
          console.log(`🔍 Verifying ${openaiFileIds.length} OpenAI file(s) are processed...`)
          const fileStatuses = await Promise.all(
            openaiFileIds.map(async (fileId) => {
              try {
                const file = await openai.files.retrieve(fileId)
                return { fileId, status: file.status, ready: file.status === 'processed' }
              } catch (error) {
                console.warn(`⚠️ Could not check status of file ${fileId}:`, error)
                return { fileId, status: 'unknown', ready: false }
              }
            })
          )
          
          const unreadyFiles = fileStatuses.filter(f => !f.ready)
          if (unreadyFiles.length > 0) {
            console.warn(`⚠️ Some files are not processed yet: ${unreadyFiles.map(f => `${f.fileId} (${f.status})`).join(', ')}`)
            // Wait a bit and check again, or continue anyway
            await new Promise(resolve => setTimeout(resolve, 3000))
          }
          
          const readyFileIds = fileStatuses.filter(f => f.ready).map(f => f.fileId)
          if (readyFileIds.length === 0) {
            return NextResponse.json({
              success: true,
              response: 'Los archivos seleccionados aún se están procesando. Por favor, espera unos momentos e intenta nuevamente.',
              tokens_used: 0,
              response_time_ms: Date.now() - startTime,
              active_catalogs: 0
            })
          }
          
          console.log(`✅ ${readyFileIds.length}/${openaiFileIds.length} files are ready, getting or creating vector store...`)
          console.log(`📋 Selected files: ${selectedFiles.map(f => `${f.file_name} (${f.openai_file_id})`).join(', ')}`)
          console.log(`📋 OpenAI file IDs to use: ${readyFileIds.join(', ')}`)
          
          // Use getOrCreateTempVectorStore to reuse existing stores with same file IDs
          const tempVectorStore = await getOrCreateTempVectorStore(readyFileIds)
          
          // Check if this is a reused store (was already ready when found)
          const wasAlreadyReady = tempVectorStore.status === 'completed' && tempVectorStore.file_counts.completed > 0
          
          console.log(`⏳ Vector store ${tempVectorStore.id} status: ${tempVectorStore.status}${wasAlreadyReady ? ' (reused)' : ''}, waiting for files to be indexed if needed...`)
          
          // Wait for vector store to be ready (files processed) if not already ready
          // Use a longer timeout for temporary stores (60 seconds) as they need to process files
          let readyVectorStore = wasAlreadyReady
            ? tempVectorStore // Already ready, no need to wait
            : await waitForVectorStoreReady(tempVectorStore.id, 60000, 2000)
          
          // Verify files are actually in the vector store and match exactly
          try {
            const filesInStore = await openai.vectorStores.files.list(tempVectorStore.id)
            const completedFilesInStore = filesInStore.data.filter(f => f.status === 'completed')
            
            console.log(`📊 Vector store ${tempVectorStore.id} has ${completedFilesInStore.length}/${filesInStore.data.length} completed files`)
            console.log(`📋 Files in vector store: ${filesInStore.data.map(f => `${f.id} (${f.status})`).join(', ')}`)
            console.log(`📋 Expected files: ${readyFileIds.join(', ')}`)
            
            if (completedFilesInStore.length === 0) {
              console.error(`❌ Vector store ${tempVectorStore.id} has no completed files!`)
              return NextResponse.json({
                success: true,
                response: 'Los archivos aún se están procesando en el vector store. Por favor, espera unos momentos e intenta nuevamente.',
                tokens_used: 0,
                response_time_ms: Date.now() - startTime,
                active_catalogs: 0
              })
            }
            
            // Verify all expected files are present and no extra files
            const fileIdsInStore = new Set(completedFilesInStore.map(f => f.id))
            const requestedFileIds = new Set(readyFileIds)
            const missingFiles = readyFileIds.filter(id => !fileIdsInStore.has(id))
            const extraFiles = completedFilesInStore.filter(f => !requestedFileIds.has(f.id))
            
            if (missingFiles.length > 0) {
              console.error(`❌ Missing files in vector store: ${missingFiles.join(', ')}`)
              console.error(`❌ This vector store does not contain all requested files!`)
              return NextResponse.json({
                success: true,
                response: 'Error: El vector store no contiene todos los archivos seleccionados. Por favor, intenta nuevamente.',
                tokens_used: 0,
                response_time_ms: Date.now() - startTime,
                active_catalogs: 0
              })
            }
            
            if (extraFiles.length > 0) {
              console.error(`❌ Vector store has extra files that were not requested: ${extraFiles.map(f => f.id).join(', ')}`)
              console.error(`❌ This would cause the AI to search in files that were not selected!`)
              console.error(`❌ Rejecting this vector store and creating a new one with only the requested files...`)
              
              // Delete the incorrect vector store and create a new one
              try {
                await openai.vectorStores.delete(tempVectorStore.id)
                console.log(`🗑️ Deleted incorrect vector store ${tempVectorStore.id}`)
              } catch (deleteError) {
                console.warn(`⚠️ Could not delete incorrect vector store: ${deleteError}`)
              }
              
              // Create a new vector store with only the requested files using the helper function
              const hash = generateFileIdsHash(readyFileIds)
              const tempName = `Temp-${hash}`
              
              console.log(`🆕 Creating new vector store with only requested files...`)
              const newVectorStore = await openai.vectorStores.create({
                name: tempName,
                file_ids: readyFileIds,
                expires_after: {
                  anchor: 'last_active_at',
                  days: 30
                }
              })
              
              // Wait for the new store to be ready
              const readyNewStore = await waitForVectorStoreReady(newVectorStore.id, 60000, 2000)
              
              // Update references to use the new store
              readyVectorStore = readyNewStore
              
              // Also update tempVectorStore reference by creating a new object
              Object.assign(tempVectorStore, readyNewStore)
              
              console.log(`✅ Created and verified new vector store ${readyNewStore.id} with exact file match`)
              
              // Continue with the rest of the flow using the new store
            }
            
            if (missingFiles.length === 0 && extraFiles.length === 0) {
              console.log(`✅ All ${readyFileIds.length} requested file(s) are present and completed in vector store (exact match)`)
            }
          } catch (verifyError) {
            console.error(`❌ Error verifying files in vector store: ${verifyError}`)
            // Continue anyway - the waitForVectorStoreReady should have ensured readiness
          }
          
          if (readyVectorStore.status !== 'completed' || readyVectorStore.file_counts.completed === 0) {
            console.warn(`⚠️ Vector store ${tempVectorStore.id} not fully ready (status: ${readyVectorStore.status}, completed: ${readyVectorStore.file_counts.completed})`)
            return NextResponse.json({
              success: true,
              response: 'Los archivos aún se están procesando en el vector store. Por favor, espera unos momentos e intenta nuevamente.',
              tokens_used: 0,
              response_time_ms: Date.now() - startTime,
              active_catalogs: 0
            })
          }
          
          // Additional wait only if this is a newly created store (not reused)
          // Reused stores are already fully indexed
          if (!wasAlreadyReady) {
            console.log(`⏳ Waiting additional 3 seconds to ensure indexing is complete for new vector store...`)
            await new Promise(resolve => setTimeout(resolve, 3000))
          } else {
            console.log(`♻️ Using existing vector store, skipping additional wait`)
          }
          
          vectorStoreIds = [tempVectorStore.id]
          activeCatalogsCount = selectedFiles.length
          
          console.log(`✅ ${wasAlreadyReady ? 'Reused' : 'Temporary'} vector store ready with ${readyVectorStore.file_counts.completed}/${readyVectorStore.file_counts.total} files: ${selectedFiles.map(f => f.file_name).join(', ')}`)
        } catch (error) {
          console.error('Error creating/waiting for temporary vector store:', error)
          return NextResponse.json(
            { error: 'Failed to prepare vector store for selected files. Por favor, intenta nuevamente en unos momentos.' },
            { status: 500 }
          )
        }
      }
    } else {
      // No specific files selected - use master vector store (all active files)
      const { data: activeFiles, error: fileError } = await supabaseAdmin
        .from('price_lists')
        .select('openai_file_id, file_name, supplier_name')
        .eq('is_active', true)
        .not('openai_file_id', 'is', null)
        .order('uploaded_at', { ascending: false })

      if (fileError) {
        console.error('Error fetching active files:', fileError)
        return NextResponse.json(
          { error: 'Failed to get active files' },
          { status: 500 }
        )
      }

      if (!activeFiles || activeFiles.length === 0) {
        return NextResponse.json({
          success: true,
          response: 'No hay archivos activos en este momento. Por favor, contacta al administrador para activar los archivos necesarios.',
          tokens_used: 0,
          response_time_ms: Date.now() - startTime,
          active_catalogs: 0
        })
      }

      // Get master vector store for querying (no sync - that's handled when files change)
      console.log(`🚀 MASTER STORE: Querying ${activeFiles.length} active files: ${activeFiles.map(f => f.file_name).join(', ')}`)
      
      try {
        // Just get the master vector store - sync only happens when files are added/removed
        const masterStore = await getOrCreateMasterVectorStore()
        console.log(`✅ Using master vector store: ${masterStore.id} (${masterStore.file_counts.total} files)`)
        
        vectorStoreIds = [masterStore.id]
        activeCatalogsCount = activeFiles.length
      } catch (error) {
        console.error('Master vector store error:', error)
        return NextResponse.json(
          { error: 'Failed to access files' },
          { status: 500 }
        )
      }
    }

    // Execute ultra-fast price query
    const queryStartTime = Date.now()
    let aiResponse
    let queryTime = 0
    
    console.log(`🔍 Executing query with ${vectorStoreIds.length} vector store(s): ${vectorStoreIds.join(', ')}`)
    console.log(`📝 Query: "${message}"`)
    
    try {
      aiResponse = await queryPricesFast(
        message,
        vectorStoreIds, // Use selected vector stores (individual or master)
        conversationHistory,
        session.user.email || session.user.id
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
      active_catalogs: activeCatalogsCount,
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
        error: 'Error procesando consulta de archivos',
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
        { error: 'Failed to fetch conversation history of files' },
        { status: 500 }
      )
    }

    // Format for frontend with all message data
    const formattedMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.created_at,
      response_time_ms: msg.response_time_ms || undefined,
      tokens_used: msg.tokens_used || undefined
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
    console.error('Get conversation error of files:', error)
    return NextResponse.json(
      { error: 'Failed to get conversation history', details: error.message },
      { status: 500 }
    )
  }
}