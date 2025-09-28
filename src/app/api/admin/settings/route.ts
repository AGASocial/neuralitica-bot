import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { setSystemInstructionsCache, invalidateSystemInstructionsCache } from '@/lib/openai-responses'

export async function GET() {
  try {
    const supabase = createSupabaseAdmin()
    const { data, error } = await supabase
      .from('app_settings')
      .select('system_instructions, updated_at, updated_by')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
    }

    return NextResponse.json({ settings: data || null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { system_instructions } = body || {}

    if (system_instructions !== null && typeof system_instructions !== 'string') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // Identify user from request (via service role write, we set updated_by if possible)
    let updatedBy: string | null = null
    try {
      const authHeader = request.headers.get('x-user-id') // optional passthrough
      updatedBy = authHeader || null
    } catch {}

    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ id: 1, system_instructions, updated_by: updatedBy, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select('system_instructions, updated_at, updated_by')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    // Update in-memory cache used by chat retrieval
    if (data) {
      setSystemInstructionsCache(data.system_instructions ?? null)
    } else {
      invalidateSystemInstructionsCache()
    }

    return NextResponse.json({ settings: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
