import { createServerClient } from '@supabase/ssr'
import { createSupabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  subscription_expires_at?: string | null
  created_at: string
}

export async function getServerProfile(): Promise<UserProfile | null> {
  try {
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
      return null
    }

    const supabaseAdmin = createSupabaseAdmin()

    // Fetch profile from database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error getting server profile:', error)
    return null
  }
}