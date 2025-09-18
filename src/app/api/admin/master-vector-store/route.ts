import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { 
  getOrCreateMasterVectorStore, 
  syncMasterVectorStore,
  addFileToMasterVectorStore,
  removeFileFromMasterVectorStore 
} from '@/lib/openai'

// Get master vector store status
export async function GET() {
  try {
    const masterStore = await getOrCreateMasterVectorStore()
    
    // Get active files from database
    const supabaseAdmin = createSupabaseAdmin()
    const { data: activeFiles, error } = await supabaseAdmin
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
      }
    })

  } catch (error: any) {
    console.error('Get master store status error:', error)
    return NextResponse.json(
      { error: 'Failed to get master store status', details: error.message },
      { status: 500 }
    )
  }
}

// Sync master vector store
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'sync') {
      // Get active files
      const supabaseAdmin = createSupabaseAdmin()
      const { data: activeFiles, error } = await supabaseAdmin
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

      return NextResponse.json({
        success: true,
        sync_result: syncResult,
        message: `Sync completed: ${syncResult.added} files added, ${syncResult.removed} files removed`
      })

    } else if (action === 'add_file') {
      const { fileId } = await request.json()
      if (!fileId) {
        return NextResponse.json(
          { error: 'fileId is required' },
          { status: 400 }
        )
      }

      const result = await addFileToMasterVectorStore(fileId)
      return NextResponse.json({
        success: true,
        result,
        message: `File ${fileId} added to master vector store`
      })

    } else if (action === 'remove_file') {
      const { fileId } = await request.json()
      if (!fileId) {
        return NextResponse.json(
          { error: 'fileId is required' },
          { status: 400 }
        )
      }

      const result = await removeFileFromMasterVectorStore(fileId)
      return NextResponse.json({
        success: true,
        result,
        message: `File ${fileId} removed from master vector store`
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "sync", "add_file", or "remove_file"' },
        { status: 400 }
      )
    }

  } catch (error: any) {
    console.error('Master store operation error:', error)
    return NextResponse.json(
      { error: 'Master store operation failed', details: error.message },
      { status: 500 }
    )
  }
}