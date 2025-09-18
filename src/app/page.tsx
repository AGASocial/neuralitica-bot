'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/signin')
      } else if (profile) {
        // Admins don't need subscription validation
        if (profile.role === 'ADMIN') {
          router.push('/admin')
        } else {
          // For regular users, check subscription validity
          const hasValidLicense = profile.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()
          
          if (!hasValidLicense) {
            router.push('/expired')
          } else if (profile.is_active) {
            router.push('/chat')
          } else {
            router.push('/auth/signin?error=account_disabled')
          }
        }
      }
    }
  }, [user, profile, loading, router])

  // Add fallback for when loading is false but no user
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading && !user) {
        console.log('No user found after loading, redirecting to signin')
        router.push('/auth/signin')
      }
    }, 6000) // 6 second timeout

    return () => clearTimeout(timeoutId)
  }, [loading, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
        <p className="mt-2 text-gray-600">Cargando...</p>
      </div>
    </div>
  )
}
