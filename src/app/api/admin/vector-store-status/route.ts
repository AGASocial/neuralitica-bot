import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { openai } from '@/lib/openai'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // Get all active price lists with vector store IDs
    const { data: priceLists, error: dbError } = await supabaseAdmin
      .from('price_lists')
      .select('id, file_name, supplier_name, openai_vector_file_id, openai_file_id, is_active')
      .not('openai_vector_file_id', 'is', null)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false })

    if (dbError) {
      console.error('Error fetching file:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch file from database' },
        { status: 500 }
      )
    }

    if (!priceLists || priceLists.length === 0) {
      return NextResponse.json({
        success: true,
        vector_stores: [],
        message: 'No active file from vector stores found'
      })
    }

    // Check status of each vector store with OpenAI
    const vectorStoreStatuses = await Promise.allSettled(
      priceLists.map(async (priceList) => {
        try {
          // Get vector store status
          const vectorStore = await openai.vectorStores.retrieve(priceList.openai_vector_file_id!)
          
          // Get files in the vector store to get detailed file information
          let vectorStoreFiles: any[] = []
          try {
            const filesResponse = await openai.vectorStores.files.list(priceList.openai_vector_file_id!)
            vectorStoreFiles = filesResponse.data || []
          } catch (filesError) {
            console.warn(`Failed to get files for vector store ${priceList.openai_vector_file_id}:`, filesError)
          }

          // Get detailed file information from OpenAI Files API for each file
          const fileDetails = await Promise.allSettled(
            vectorStoreFiles.map(async (vsFile) => {
              try {
                const fileInfo = await openai.files.retrieve(vsFile.id)
                return {
                  id: vsFile.id,
                  filename: fileInfo.filename,
                  status: vsFile.status,
                  usage_bytes: vsFile.usage_bytes || 0,
                  created_at: vsFile.created_at,
                  last_error: vsFile.last_error || null
                }
              } catch (error) {
                console.warn(`Failed to get file details for ${vsFile.id}:`, error)
                return {
                  id: vsFile.id,
                  filename: 'Unknown',
                  status: vsFile.status,
                  usage_bytes: vsFile.usage_bytes || 0,
                  created_at: vsFile.created_at,
                  last_error: vsFile.last_error || error
                }
              }
            })
          )

          const resolvedFileDetails = fileDetails
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<any>).value)

          return {
            database_info: {
              price_list_id: priceList.id,
              file_name: priceList.file_name,
              supplier_name: priceList.supplier_name,
              is_active: priceList.is_active,
              openai_file_id: priceList.openai_file_id
            },
            vector_store_info: {
              id: vectorStore.id,
              name: vectorStore.name || `Vector Store ${vectorStore.id}`,
              status: vectorStore.status,
              created_at: vectorStore.created_at,
              expires_at: vectorStore.expires_at,
              file_counts: vectorStore.file_counts,
              usage_bytes: vectorStore.usage_bytes || 0
            },
            files: resolvedFileDetails,
            health_status: determineHealthStatus(vectorStore, resolvedFileDetails)
          }
        } catch (error: any) {
          console.error(`Error checking vector store ${priceList.openai_vector_file_id}:`, error)
          return {
            database_info: {
              price_list_id: priceList.id,
              file_name: priceList.file_name,
              supplier_name: priceList.supplier_name,
              is_active: priceList.is_active,
              openai_file_id: priceList.openai_file_id
            },
            vector_store_info: {
              id: priceList.openai_vector_file_id,
              name: 'Unknown',
              status: 'error',
              created_at: null,
              expires_at: null,
              file_counts: {
                in_progress: 0,
                completed: 0,
                failed: 0,
                cancelled: 0,
                total: 0
              },
              usage_bytes: 0
            },
            files: [],
            health_status: 'unhealthy',
            error: error.message || 'Unknown error occurred'
          }
        }
      })
    )

    // Process results and separate successful from failed
    const successfulResults = vectorStoreStatuses
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)

    const failedResults = vectorStoreStatuses
      .filter(result => result.status === 'rejected')
      .map(result => ({
        error: (result as PromiseRejectedResult).reason.message || 'Unknown error'
      }))

    // Calculate overall statistics
    const totalVectorStores = successfulResults.length
    const healthyStores = successfulResults.filter(store => store.health_status === 'healthy').length
    const partiallyHealthyStores = successfulResults.filter(store => store.health_status === 'partially_healthy').length
    const unhealthyStores = successfulResults.filter(store => store.health_status === 'unhealthy').length

    const totalFiles = successfulResults.reduce((sum, store) => sum + store.vector_store_info.file_counts.total, 0)
    const completedFiles = successfulResults.reduce((sum, store) => sum + store.vector_store_info.file_counts.completed, 0)
    const failedFiles = successfulResults.reduce((sum, store) => sum + store.vector_store_info.file_counts.failed, 0)
    const inProgressFiles = successfulResults.reduce((sum, store) => sum + store.vector_store_info.file_counts.in_progress, 0)

    return NextResponse.json({
      success: true,
      summary: {
        total_vector_stores: totalVectorStores,
        healthy_stores: healthyStores,
        partially_healthy_stores: partiallyHealthyStores,
        unhealthy_stores: unhealthyStores,
        failed_requests: failedResults.length,
        total_files: totalFiles,
        completed_files: completedFiles,
        failed_files: failedFiles,
        in_progress_files: inProgressFiles
      },
      vector_stores: successfulResults,
      failed_requests: failedResults,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('API error checking vector store status:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * Determine the health status of a vector store based on its status and file states
 */
function determineHealthStatus(vectorStore: any, files: any[]): 'healthy' | 'partially_healthy' | 'unhealthy' {
  // If vector store itself has issues
  if (vectorStore.status === 'failed' || vectorStore.status === 'expired') {
    return 'unhealthy'
  }

  // If still processing
  if (vectorStore.status === 'in_progress') {
    // Check if any files are completed
    const hasCompletedFiles = files.some(file => file.status === 'completed')
    return hasCompletedFiles ? 'partially_healthy' : 'unhealthy'
  }

  // If vector store is completed, check file statuses
  if (vectorStore.status === 'completed') {
    const totalFiles = files.length
    const completedFiles = files.filter(file => file.status === 'completed').length
    const failedFiles = files.filter(file => file.status === 'failed').length

    if (totalFiles === 0) {
      return 'unhealthy' // No files in vector store
    }

    if (completedFiles === totalFiles) {
      return 'healthy' // All files completed
    }

    if (completedFiles > 0 && failedFiles < totalFiles) {
      return 'partially_healthy' // Some files completed
    }

    return 'unhealthy' // Most or all files failed
  }

  return 'unhealthy' // Unknown status
}