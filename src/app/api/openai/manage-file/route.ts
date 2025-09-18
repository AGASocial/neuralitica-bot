import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import {
  uploadPDFToOpenAI,
  createVectorStore,
  addFileToVectorStore,
  removeFileFromVectorStore,
  deleteVectorStore,
  deleteOpenAIFile,
  addFileToMasterVectorStore,
  removeFileFromMasterVectorStore,
  getOrCreateMasterVectorStore,
  syncMasterVectorStore
} from '@/lib/openai'

// Comprehensive file lifecycle management for NeuraliticaBot
// Handles: upload, activate, deactivate, delete with OpenAI integration
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { action, priceListId, ...actionData } = await request.json()

    switch (action) {
      case 'toggle_active':
        return await toggleActiveStatus(priceListId, startTime)
      
      case 'upload_and_process':
        return await uploadAndProcessFile(actionData, startTime)
      
      case 'delete_complete':
        return await deleteCompleteFile(priceListId, startTime)
      
      case 'sync_master_store':
        return await syncMasterVectorStoreAction(startTime)
      
      case 'get_master_store_status':
        return await getMasterStoreStatusAction(startTime)
      
      case 'add_to_master_store':
        return await addToMasterStoreAction(actionData, startTime)
      
      case 'remove_from_master_store':
        return await removeFromMasterStoreAction(actionData, startTime)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: toggle_active, upload_and_process, delete_complete, sync_master_store, get_master_store_status, add_to_master_store, remove_from_master_store' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`File management operation failed after ${totalTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: 'File management operation failed',
        details: error.message,
        processing_time_ms: totalTime
      },
      { status: 500 }
    )
  }
}

// Toggle file active status and manage vector store accordingly
async function toggleActiveStatus(priceListId: string, startTime: number) {
  if (!priceListId) {
    return NextResponse.json(
      { error: 'priceListId is required' },
      { status: 400 }
    )
  }

  // Get current file data using admin client (bypasses RLS for admin operations)
  const supabase = createSupabaseAdmin()
  
  const { data: priceList, error: fetchError } = await supabase
    .from('price_lists')
    .select('*')
    .eq('id', priceListId)
    .single()

  if (fetchError || !priceList) {
    return NextResponse.json(
      { error: 'Price list not found' },
      { status: 404 }
    )
  }

  const newActiveStatus = !priceList.is_active

  try {
    if (newActiveStatus && !priceList.openai_file_id) {
      return NextResponse.json(
        { error: 'File must be uploaded to OpenAI before activating' },
        { status: 400 }
      )
    }

    if (newActiveStatus) {
      // ACTIVATING: Add to master vector store (new best practice approach)
      console.log(`🚀 ACTIVATING: Adding file ${priceList.openai_file_id} to master vector store`)
      
      try {
        // Add file to master vector store
        await addFileToMasterVectorStore(priceList.openai_file_id)
        console.log(`✅ File added to master vector store successfully`)
        
        // Legacy: Still create individual vector store for backward compatibility
        // TODO: Remove this once fully migrated to master store approach
        if (!priceList.openai_vector_file_id) {
          console.log('Creating individual vector store for legacy support...')
          
          const vectorStore = await createVectorStore(
            `NeuraliticaBot-${priceList.file_name}`,
            [priceList.openai_file_id]
          )

          // Update database with both active status and legacy vector store ID
          const { error: updateError } = await supabase
            .from('price_lists')
            .update({
              is_active: true,
              openai_vector_file_id: vectorStore.id
            })
            .eq('id', priceListId)

          if (updateError) throw updateError

          const totalTime = Date.now() - startTime
          return NextResponse.json({
            success: true,
            message: 'File activated - added to master store and legacy vector store created',
            is_active: true,
            vector_store_id: vectorStore.id,
            master_store_integration: true,
            processing_time_ms: totalTime
          })

        } else {
          // Just activate (vector store exists)
          const { error: updateError } = await supabase
            .from('price_lists')
            .update({ is_active: true })
            .eq('id', priceListId)

          if (updateError) throw updateError

          const totalTime = Date.now() - startTime
          return NextResponse.json({
            success: true,
            message: 'File activated - added to master store (legacy vector store already exists)',
            is_active: true,
            vector_store_id: priceList.openai_vector_file_id,
            master_store_integration: true,
            processing_time_ms: totalTime
          })
        }
        
      } catch (masterStoreError) {
        console.error('Master store integration failed:', masterStoreError)
        // Continue with legacy approach if master store fails
        console.log('Falling back to legacy vector store approach...')
        
        if (!priceList.openai_vector_file_id) {
          const vectorStore = await createVectorStore(
            `NeuraliticaBot-${priceList.file_name}`,
            [priceList.openai_file_id]
          )

          const { error: updateError } = await supabase
            .from('price_lists')
            .update({
              is_active: true,
              openai_vector_file_id: vectorStore.id
            })
            .eq('id', priceListId)

          if (updateError) throw updateError
        } else {
          const { error: updateError } = await supabase
            .from('price_lists')
            .update({ is_active: true })
            .eq('id', priceListId)

          if (updateError) throw updateError
        }

        const totalTime = Date.now() - startTime
        return NextResponse.json({
          success: true,
          message: 'File activated (master store integration failed, using legacy approach)',
          is_active: true,
          vector_store_id: priceList.openai_vector_file_id,
          master_store_integration: false,
          processing_time_ms: totalTime,
          warning: 'Master vector store integration failed'
        })
      }

    } else {
      // DEACTIVATING: Remove from master vector store and update database
      console.log(`🗑️ DEACTIVATING: Removing file ${priceList.openai_file_id} from master vector store`)
      
      try {
        // Remove from master vector store
        await removeFileFromMasterVectorStore(priceList.openai_file_id)
        console.log(`✅ File removed from master vector store successfully`)
      } catch (masterStoreError) {
        console.error('Master store removal failed (non-blocking):', masterStoreError)
        // Continue with deactivation even if master store removal fails
      }

      // Update database status (always do this regardless of master store operation)
      const { error: updateError } = await supabase
        .from('price_lists')
        .update({ is_active: false })
        .eq('id', priceListId)

      if (updateError) throw updateError

      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        message: 'File deactivated and removed from master store (legacy vector store preserved for reactivation)',
        is_active: false,
        master_store_integration: true,
        processing_time_ms: totalTime
      })
    }

  } catch (error: any) {
    console.error('Toggle active status error:', error)
    
    // Rollback database changes if OpenAI operations failed
    await supabase
      .from('price_lists')
      .update({ is_active: priceList.is_active })
      .eq('id', priceListId)

    throw error
  }
}

// Upload file and process through OpenAI pipeline
async function uploadAndProcessFile(actionData: any, startTime: number) {
  const { fileBuffer, fileName, priceListId, autoActivate = false } = actionData

  if (!fileBuffer || !fileName || !priceListId) {
    return NextResponse.json(
      { error: 'fileBuffer, fileName, and priceListId are required' },
      { status: 400 }
    )
  }

  // Convert base64 to buffer if needed
  const buffer = typeof fileBuffer === 'string' 
    ? Buffer.from(fileBuffer, 'base64')
    : Buffer.from(fileBuffer)

  console.log(`Starting complete upload pipeline for ${fileName}`)

  // Step 1: Upload to OpenAI
  const uploadResult = await uploadPDFToOpenAI(buffer, fileName)

  // Step 2: Update database with OpenAI file ID
  const supabase = createSupabaseAdmin()
  const { error: updateError } = await supabase
    .from('price_lists')
    .update({
      openai_file_id: uploadResult.file_id,
    })
    .eq('id', priceListId)

  if (updateError) {
    console.error('Database update error:', updateError)
    throw new Error('Failed to update database with OpenAI file ID')
  }

  let vectorStoreResult = null

  // Step 3: Create vector store and add to master store if auto-activate is enabled
  if (autoActivate) {
    console.log('Auto-activating file with vector store creation and master store integration...')
    
    // Add to master vector store (best practice approach)
    try {
      await addFileToMasterVectorStore(uploadResult.file_id)
      console.log(`✅ File added to master vector store successfully`)
    } catch (masterStoreError) {
      console.error('Master store integration failed:', masterStoreError)
      // Continue with legacy approach if master store fails
    }
    
    // Legacy: Create individual vector store for backward compatibility
    vectorStoreResult = await createVectorStore(
      `NeuraliticaBot-${fileName}`,
      [uploadResult.file_id]
    )

    // Update database with vector store ID and activate
    const { error: activateError } = await supabase
      .from('price_lists')
      .update({
        is_active: true,
        openai_vector_file_id: vectorStoreResult.id
      })
      .eq('id', priceListId)

    if (activateError) {
      console.error('Auto-activation error:', activateError)
      // Continue without activation rather than fail entirely
    }
  }

  const totalTime = Date.now() - startTime
  console.log(`Complete upload pipeline finished in ${totalTime}ms`)

  return NextResponse.json({
    success: true,
    message: autoActivate ? 'File uploaded, activated, and added to master vector store' : 'File uploaded successfully',
    file_id: uploadResult.file_id,
    vector_store_id: vectorStoreResult?.id,
    is_active: autoActivate,
    master_store_integration: autoActivate,
    processing_time_ms: totalTime,
    bytes_processed: uploadResult.bytes
  })
}

// Completely delete file from OpenAI and database
async function deleteCompleteFile(priceListId: string, startTime: number) {
  if (!priceListId) {
    return NextResponse.json(
      { error: 'priceListId is required' },
      { status: 400 }
    )
  }

  // Get file data using admin client (bypasses RLS for admin operations)
  const supabase = createSupabaseAdmin()
  const { data: priceList, error: fetchError } = await supabase
    .from('price_lists')
    .select('*')
    .eq('id', priceListId)
    .single()

  if (fetchError || !priceList) {
    return NextResponse.json(
      { error: 'Price list not found' },
      { status: 404 }
    )
  }

  const deletionResults: any[] = []

  try {
    // Step 1: Remove from master vector store if file exists
    if (priceList.openai_file_id) {
      console.log('Removing from master vector store...')
      try {
        await removeFileFromMasterVectorStore(priceList.openai_file_id)
        deletionResults.push({ type: 'master_vector_store', success: true })
        console.log(`✅ File removed from master vector store successfully`)
      } catch (masterStoreError) {
        console.error('Master store removal failed:', masterStoreError)
        deletionResults.push({ 
          type: 'master_vector_store', 
          success: false,
          error: masterStoreError instanceof Error ? masterStoreError.message : 'Unknown error'
        })
      }
    }

    // Step 2: Delete vector store if exists
    if (priceList.openai_vector_file_id) {
      console.log('Deleting vector store...')
      const vectorStoreResult = await deleteVectorStore(priceList.openai_vector_file_id)
      deletionResults.push({ type: 'vector_store', success: vectorStoreResult.deleted })
    }

    // Step 3: Delete OpenAI file if exists
    if (priceList.openai_file_id) {
      console.log('Deleting OpenAI file...')
      const fileResult = await deleteOpenAIFile(priceList.openai_file_id)
      deletionResults.push({ type: 'openai_file', success: fileResult.deleted })
    }

    // Step 3: Delete from Supabase storage
    if (priceList.storage_path) {
      console.log('Deleting from Supabase storage...')
      const { error: storageError } = await supabase.storage
        .from('price-lists')
        .remove([priceList.storage_path])

      deletionResults.push({ 
        type: 'supabase_storage', 
        success: !storageError,
        error: storageError?.message 
      })
    }

    // Step 4: Delete database record
    const { error: dbError } = await supabase
      .from('price_lists')
      .delete()
      .eq('id', priceListId)

    deletionResults.push({ 
      type: 'database', 
      success: !dbError,
      error: dbError?.message 
    })

    const totalTime = Date.now() - startTime
    const allSuccessful = deletionResults.every(result => result.success)

    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful ? 'File completely deleted from all systems' : 'Partial deletion completed',
      deletion_results: deletionResults,
      processing_time_ms: totalTime
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error('Complete file deletion error:', error)

    return NextResponse.json({
      success: false,
      message: 'File deletion failed',
      deletion_results: deletionResults,
      error: error.message,
      processing_time_ms: totalTime
    }, { status: 500 })
  }
}

// Master Vector Store Management Actions

// Sync master vector store with all active files
async function syncMasterVectorStoreAction(startTime: number) {
  try {
    // Get active files
    const supabase = createSupabaseAdmin()
    const { data: activeFiles, error } = await supabase
      .from('price_lists')
      .select('openai_file_id')
      .eq('is_active', true)
      .not('openai_file_id', 'is', null)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch active files' },
        { status: 500 }
      )
    }

    const activeFileIds = activeFiles?.map(f => f.openai_file_id) || []
    
    console.log(`🔄 Manual sync requested for ${activeFileIds.length} active files`)
    const syncResult = await syncMasterVectorStore(activeFileIds)

    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      sync_result: syncResult,
      message: `Sync completed: ${syncResult.added} files added, ${syncResult.removed} files removed`,
      processing_time_ms: totalTime
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error('Master store sync error:', error)
    return NextResponse.json(
      { error: 'Master store sync failed', details: error.message, processing_time_ms: totalTime },
      { status: 500 }
    )
  }
}

// Get master vector store status
async function getMasterStoreStatusAction(startTime: number) {
  try {
    const masterStore = await getOrCreateMasterVectorStore()
    
    // Get active files from database
    const supabase = createSupabaseAdmin()
    const { data: activeFiles, error } = await supabase
      .from('price_lists')
      .select('openai_file_id, file_name, supplier_name, is_active')
      .not('openai_file_id', 'is', null)
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('Error fetching files:', error)
      return NextResponse.json(
        { error: 'Failed to fetch files' },
        { status: 500 }
      )
    }

    const activeCount = activeFiles?.filter(f => f.is_active).length || 0
    const totalCount = activeFiles?.length || 0

    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      master_store: {
        id: masterStore.id,
        name: masterStore.name,
        status: masterStore.status,
        file_counts: masterStore.file_counts,
        expires_at: masterStore.expires_at
      },
      database_files: {
        active_count: activeCount,
        total_count: totalCount,
        files: activeFiles?.map(f => ({
          file_id: f.openai_file_id,
          name: f.file_name,
          supplier: f.supplier_name,
          is_active: f.is_active
        }))
      },
      processing_time_ms: totalTime
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error('Get master store status error:', error)
    return NextResponse.json(
      { error: 'Failed to get master store status', details: error.message, processing_time_ms: totalTime },
      { status: 500 }
    )
  }
}

// Add specific file to master vector store
async function addToMasterStoreAction(actionData: any, startTime: number) {
  try {
    const { fileId } = actionData
    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      )
    }

    const result = await addFileToMasterVectorStore(fileId)
    const totalTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      result,
      message: `File ${fileId} added to master vector store`,
      processing_time_ms: totalTime
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error('Add to master store error:', error)
    return NextResponse.json(
      { error: 'Add to master store failed', details: error.message, processing_time_ms: totalTime },
      { status: 500 }
    )
  }
}

// Remove specific file from master vector store
async function removeFromMasterStoreAction(actionData: any, startTime: number) {
  try {
    const { fileId } = actionData
    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      )
    }

    const result = await removeFileFromMasterVectorStore(fileId)
    const totalTime = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      result,
      message: `File ${fileId} removed from master vector store`,
      processing_time_ms: totalTime
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error('Remove from master store error:', error)
    return NextResponse.json(
      { error: 'Remove from master store failed', details: error.message, processing_time_ms: totalTime },
      { status: 500 }
    )
  }
}