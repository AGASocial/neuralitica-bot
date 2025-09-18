import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { startDate, endDate } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Se requieren fechas de inicio y fin' },
        { status: 400 }
      )
    }

    // Validate date format and logic
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido' },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'La fecha inicial debe ser anterior a la fecha final' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Create date strings in YYYY-MM-DD format to ensure we get the full day
    // This avoids timezone issues by working with date strings directly
    const startDateStr = start.toISOString().split('T')[0] // YYYY-MM-DD
    const endDateStr = end.toISOString().split('T')[0]     // YYYY-MM-DD

    // Fetch user messages within date range using date string comparison
    // This ensures we capture ALL messages from the selected dates regardless of time
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('content, created_at')
      .eq('role', 'user')
      .gte('created_at', `${startDateStr}T00:00:00.000Z`)
      .lte('created_at', `${endDateStr}T23:59:59.999Z`)
      .order('created_at', { ascending: false })

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json(
        { error: 'Error al obtener los mensajes' },
        { status: 500 }
      )
    }

    // Generate CSV content
    const csvHeaders = ['content', 'created_at']
    const csvRows = messages?.map(message => [
      `"${(message.content || '').replace(/"/g, '""')}"`, // Escape quotes in content
      message.created_at
    ]) || []

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n')

    const processingTime = Date.now() - startTime
    console.log(`Messages CSV export completed in ${processingTime}ms - ${messages?.length || 0} messages`)

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mensajes_usuarios_${startDate}_${endDate}.csv"`,
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error: any) {
    const processingTime = Date.now() - startTime
    console.error(`Messages CSV export failed after ${processingTime}ms:`, error)

    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error.message,
        processing_time_ms: processingTime
      },
      { status: 500 }
    )
  }
}