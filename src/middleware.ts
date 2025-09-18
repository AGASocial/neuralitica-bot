import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Add request logging
  console.log('[MW] Request:', req.method, req.nextUrl.pathname, req.nextUrl.search)
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Admin client for profile fetching
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Public routes that don't require authentication
  const publicRoutes = ['/auth/signin', '/auth/signup', '/auth/callback', '/api/auth/']
  const pathname = req.nextUrl.pathname
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || pathname === '/'

  // If user is not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    console.log('[MW] No session, redirecting to signin')
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }

  // If user is authenticated, check their profile and permissions
  console.log('[MW] session?', !!session, 'path:', pathname, 'isPublicRoute:', isPublicRoute)
  if (session && !isPublicRoute) {
    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role, is_active, subscription_expires_at')
        .eq('id', session.user.id)
        .maybeSingle()

      console.log('[MW] Profile fetch result:', { profile: !!profile, error: !!profileError, role: profile?.role, isActive: profile?.is_active })

      // If user account exists and is explicitly not active
      if (profile && profile.is_active === false) {
        console.log('[MW] User account disabled, signing out')
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/signin?error=account_disabled', req.url))
      }

      // Check subscription expiration for regular users (not admins) on protected routes
      if (profile && profile.role !== 'ADMIN' && pathname !== '/expired') {
        const hasValidLicense = profile.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()
        
        if (!hasValidLicense) {
          console.log('[MW] User subscription expired, redirecting to expired page')
          return NextResponse.redirect(new URL('/expired', req.url))
        }
      }

      // Admin routes protection (require ADMIN when profile is present)
      if (pathname.startsWith('/admin')) {
        console.log('[MW] Admin route check:', { hasProfile: !!profile, role: profile?.role, isAdmin: profile?.role === 'ADMIN' })
        if (!profile || profile.role !== 'ADMIN') {
          console.log('[MW] Not admin, redirecting to chat')
          return NextResponse.redirect(new URL('/chat', req.url))
        }
        console.log('[MW] Admin access granted')
      }

      // Chat routes - allow access for all authenticated users (including admins)
      // No restrictions needed here, both users and admins can access chat
    } catch (error) {
      console.error('[MW] Error fetching profile:', error)
      // Don't redirect on error, let the request continue
    }
  }

  // Redirect authenticated users away from auth pages (unless they're logging out)
  const isLogoutFlow = req.nextUrl.searchParams.get('logout') === 'true'
  if (session && pathname.startsWith('/auth/signin') && !isLogoutFlow) {
    try {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('role, subscription_expires_at, is_active')
        .eq('id', session.user.id)
        .maybeSingle()

      console.log('[MW] Auth page redirect check:', { role: profile?.role })

      if (profile?.role === 'ADMIN') {
        console.log('[MW] Admin on auth page, redirecting to admin')
        return NextResponse.redirect(new URL('/admin', req.url))
      } else if (profile) {
        // Check subscription for regular users
        const hasValidLicense = profile.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()
        
        if (!hasValidLicense) {
          console.log('[MW] User subscription expired, redirecting to expired page')
          return NextResponse.redirect(new URL('/expired', req.url))
        } else if (profile.is_active) {
          console.log('[MW] User on auth page, redirecting to chat')
          return NextResponse.redirect(new URL('/chat', req.url))
        }
      }
    } catch (error) {
      console.error('[MW] Error checking profile for auth redirect:', error)
      // Don't redirect on error, let the request continue
    }
  }

  console.log('[MW] Request allowed to continue')
  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}