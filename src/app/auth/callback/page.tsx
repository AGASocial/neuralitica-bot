'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔐 Processing OAuth callback...')
        
        // Handle the OAuth callback by exchanging the code for a session
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Auth callback error:', error)
          setError('Authentication failed. Please try again.')
          setTimeout(() => router.push('/auth/signin?error=callback_error'), 2000)
          return
        }

        if (data.session) {
          console.log('✅ Session established, checking user profile...')
          
          // Use the API endpoint to get profile (creates if doesn't exist)
          const profileResponse = await fetch('/api/auth/get-profile')
          
          if (!profileResponse.ok) {
            console.error('❌ Failed to get user profile')
            setError('Failed to load user profile. Please try again.')
            setTimeout(() => router.push('/auth/signin?error=profile_error'), 2000)
            return
          }

          const profileData = await profileResponse.json()
          const profile = profileData.profile

          if (profile?.is_active === false) {
            console.warn('🚫 User account is disabled')
            await supabase.auth.signOut()
            router.push('/auth/signin?error=account_disabled')
            return
          }

          console.log('🎯 Redirecting user based on role:', profile?.role)
          
          // Redirect based on role
          if (profile?.role === 'ADMIN') {
            router.push('/admin')
          } else {
            router.push('/chat')
          }
        } else {
          console.warn('⚠️ No session found after callback')
          router.push('/auth/signin')
        }
      } catch (error) {
        console.error('❌ Auth callback error:', error)
        setError('An unexpected error occurred. Please try again.')
        setTimeout(() => router.push('/auth/signin?error=callback_error'), 2000)
      }
    }

    handleAuthCallback()
  }, [router, searchParams, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-xl animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        {error ? (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 max-w-md">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Authentication Error</h3>
            <p className="text-slate-600 text-sm">{error}</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
              Autenticando...
            </h3>
            <p className="text-slate-600 text-sm">Configurando tu sesión</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AuthCallbackFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-6 mx-auto shadow-xl animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2">
            Cargando...
          </h3>
          <p className="text-slate-600 text-sm">Preparando autenticación</p>
        </div>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}