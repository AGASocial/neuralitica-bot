import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  createVectorStore,
  addFileToVectorStore,
  removeFileFromVectorStore,
  deleteVectorStore,
  getVectorStoreStatus
} from '@/lib/openai'

// Create vector store for active files
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { action, priceListId, vectorStoreName } = await request.json()

    if (action === 'create') {
      // Get the price list with OpenAI file ID
      const { data: priceList, error: fetchError } = await supabase
        .from('price_lists')
        .select('openai_file_id, file_name')
        .eq('id', priceListId)
        .single()

      if (fetchError || !priceList) {
        return NextResponse.json(
          { error: 'Price list not found' },
          { status: 404 }
        )
      }

      if (!priceList.openai_file_id) {
        return NextResponse.json(
          { error: 'File must be uploaded to OpenAI first' },
          { status: 400 }
        )
      }

      // Create vector store with the file
      const vectorStoreResult = await createVectorStore(
        vectorStoreName || `NeuraliticaBot-${priceList.file_name}`,
        [priceList.openai_file_id]
      )

      // Update database with vector store ID
      const { error: updateError } = await supabase
        .from('price_lists')
        .update({
          openai_vector_file_id: vectorStoreResult.id,
        })
        .eq('id', priceListId)

      if (updateError) {
        console.error('Database update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update database with vector store ID' },
          { status: 500 }
        )
      }

      const totalTime = Date.now() - startTime
      console.log(`Vector store created in ${totalTime}ms`)

      return NextResponse.json({
        success: true,
        vector_store_id: vectorStoreResult.id,
        status: vectorStoreResult.status,
        file_counts: vectorStoreResult.file_counts,
        processing_time_ms: totalTime,
        message: 'Vector store created successfully'
      })

    } else if (action === 'add_file') {
      // Add file to existing vector store
      const { vectorStoreId, fileId } = await request.json()

      if (!vectorStoreId || !fileId) {
        return NextResponse.json(
          { error: 'vectorStoreId and fileId are required' },
          { status: 400 }
        )
      }

      const result = await addFileToVectorStore(vectorStoreId, fileId)
      
      const totalTime = Date.now() - startTime
      return NextResponse.json({
        success: true,
        vector_store_file_id: result.id,
        status: result.status,
        processing_time_ms: totalTime
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "create" or "add_file"' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`Vector store operation failed after ${totalTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: 'Vector store operation failed',
        details: error.message,
        processing_time_ms: totalTime
      },
      { status: 500 }
    )
  }
}

// Remove file from vector store or delete vector store
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const priceListId = searchParams.get('priceListId')
    const action = searchParams.get('action') || 'remove_file'

    if (!priceListId) {
      return NextResponse.json(
        { error: 'priceListId parameter is required' },
        { status: 400 }
      )
    }

    // Get price list data
    const { data: priceList, error: fetchError } = await supabase
      .from('price_lists')
      .select('openai_file_id, openai_vector_file_id')
      .eq('id', priceListId)
      .single()

    if (fetchError || !priceList) {
      return NextResponse.json(
        { error: 'Price list not found' },
        { status: 404 }
      )
    }

    if (action === 'remove_file' && priceList.openai_vector_file_id && priceList.openai_file_id) {
      // Remove file from vector store
      await removeFileFromVectorStore(priceList.openai_vector_file_id, priceList.openai_file_id)
      
      // Update database - keep vector store ID but file is no longer in it
      const totalTime = Date.now() - startTime
      
      return NextResponse.json({
        success: true,
        message: 'File removed from vector store',
        processing_time_ms: totalTime
      })

    } else if (action === 'delete_store' && priceList.openai_vector_file_id) {
      // Delete entire vector store
      await deleteVectorStore(priceList.openai_vector_file_id)
      
      // Update database - remove vector store ID
      const { error: updateError } = await supabase
        .from('price_lists')
        .update({ openai_vector_file_id: null })
        .eq('id', priceListId)

      if (updateError) {
        console.error('Database update error:', updateError)
      }

      const totalTime = Date.now() - startTime
      
      return NextResponse.json({
        success: true,
        message: 'Vector store deleted successfully',
        processing_time_ms: totalTime
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing vector store data' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`Vector store deletion failed after ${totalTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: 'Vector store operation failed',
        details: error.message,
        processing_time_ms: totalTime
      },
      { status: 500 }
    )
  }
}

// Get vector store status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const priceListId = searchParams.get('priceListId')

    if (!priceListId) {
      return NextResponse.json(
        { error: 'priceListId parameter is required' },
        { status: 400 }
      )
    }

    // Get price list data
    const { data: priceList, error } = await supabase
      .from('price_lists')
      .select('openai_vector_file_id, file_name')
      .eq('id', priceListId)
      .single()

    if (error || !priceList) {
      return NextResponse.json(
        { error: 'Price list not found' },
        { status: 404 }
      )
    }

    if (!priceList.openai_vector_file_id) {
      return NextResponse.json(
        { error: 'No vector store found for this file' },
        { status: 404 }
      )
    }

    // Get vector store status from OpenAI
    const status = await getVectorStoreStatus(priceList.openai_vector_file_id)

    return NextResponse.json({
      success: true,
      vector_store_id: status.id,
      status: status.status,
      file_counts: status.file_counts,
      expires_at: status.expires_at,
      name: status.name
    })

  } catch (error: any) {
    console.error('Get vector store status error:', error)
    return NextResponse.json(
      { error: 'Failed to get vector store status', details: error.message },
      { status: 500 }
    )
  }
}