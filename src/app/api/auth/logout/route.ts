import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    
    // Create server client to handle server-side session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // This will set the cookie in the response
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            // This will remove the cookie in the response
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Sign out server-side
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Server-side signOut error:', error)
      // Continue anyway to clear cookies
    }

    console.log('Server-side signOut completed')

    // Create JSON response instead of redirect (let frontend handle redirect)
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    })
    
    // Manually clear auth-related cookies
    const authCookies = [
      'sb-access-token',
      'sb-refresh-token',
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`,
    ]
    
    authCookies.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })

    return response
  } catch (error: any) {
    console.error('Logout API error:', error)
    
    // Even if there's an error, return JSON response and clear cookies
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out (with errors, but cookies cleared)' 
    })
    
    // Clear cookies anyway
    response.cookies.set('sb-access-token', '', { expires: new Date(0), path: '/' })
    response.cookies.set('sb-refresh-token', '', { expires: new Date(0), path: '/' })
    
    return response
  }
}