import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { uploadPDFToOpenAI, createVectorStore, addFileToMasterVectorStore } from '@/lib/openai'
import { cookies } from 'next/headers'

// Ultra-fast PDF upload to OpenAI Files API
// Optimized for NeuraliticaBot's sub-100ms response system
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
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

    // Get the uploaded file and metadata from the form
    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplierName = formData.get('supplier_name') as string
    const userId = session.user.id
    
    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Convert File to Buffer for OpenAI
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`Starting OpenAI upload for ${file.name} (${buffer.length} bytes)`)

    // Upload PDF to OpenAI Files API
    const uploadResult = await uploadPDFToOpenAI(buffer, file.name)

    // Use user ID from authenticated session

    // Create database record with OpenAI file ID using admin client
    const supabaseAdmin = createSupabaseAdmin()
    const { data: priceListData, error: insertError } = await supabaseAdmin
      .from('price_lists')
      .insert({
        uploaded_by: userId,
        file_name: file.name,
        supplier_name: supplierName || null,
        storage_path: `openai:${uploadResult.file_id}`, // Reference to OpenAI file
        openai_file_id: uploadResult.file_id,
        is_active: false, // Default to inactive
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create database record' },
        { status: 500 }
      )
    }

    const totalTime = Date.now() - startTime
    console.log(`PDF upload pipeline completed in ${totalTime}ms`)

    return NextResponse.json({
      success: true,
      price_list_id: priceListData.id,
      openai_file_id: uploadResult.file_id,
      filename: uploadResult.filename,
      bytes: uploadResult.bytes,
      processing_time_ms: totalTime,
      message: 'PDF uploaded to OpenAI and database record created successfully'
    })

  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error(`PDF upload failed after ${totalTime}ms:`, error)
    
    return NextResponse.json(
      { 
        error: 'Failed to upload PDF to OpenAI',
        details: error.message,
        processing_time_ms: totalTime
      },
      { status: 500 }
    )
  }
}

// Get OpenAI file status
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

    // Get file info from database
    const supabaseAdmin = createSupabaseAdmin()
    const { data: priceList, error } = await supabaseAdmin
      .from('price_lists')
      .select('openai_file_id, openai_vector_file_id, file_name')
      .eq('id', priceListId)
      .single()

    if (error || !priceList) {
      return NextResponse.json(
        { error: 'Price list not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      openai_file_id: priceList.openai_file_id,
      openai_vector_file_id: priceList.openai_vector_file_id,
      file_name: priceList.file_name,
    })

  } catch (error: any) {
    console.error('Get file status error:', error)
    return NextResponse.json(
      { error: 'Failed to get file status', details: error.message },
      { status: 500 }
    )
  }
}