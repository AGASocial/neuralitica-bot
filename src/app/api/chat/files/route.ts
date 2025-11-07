import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

// Get active files for mention autocomplete
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

    const supabaseAdmin = createSupabaseAdmin()
    
    // Get all active files
    const { data: activeFiles, error: fileError } = await supabaseAdmin
      .from('price_lists')
      .select('id, file_name, supplier_name, openai_file_id, openai_vector_file_id')
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

    // Format for frontend
    const files = (activeFiles || []).map(file => ({
      id: file.id,
      name: file.file_name,
      supplier: file.supplier_name,
      openai_file_id: file.openai_file_id,
      openai_vector_file_id: file.openai_vector_file_id,
      displayName: file.supplier_name 
        ? `${file.file_name} (${file.supplier_name})`
        : file.file_name
    }))

    return NextResponse.json({
      success: true,
      files
    })

  } catch (error: any) {
    console.error('Get files error:', error)
    return NextResponse.json(
      { error: 'Failed to get files', details: error.message },
      { status: 500 }
    )
  }
}


