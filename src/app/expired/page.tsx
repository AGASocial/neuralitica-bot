'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateVE } from '@/lib/date-utils'

export default function ExpiredPage() {
  const { user, profile, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('ExpiredPage: useEffect triggered', user, profile)
    // If no user, redirect to signin
    if (!user) {
      router.push('/auth/signin')
      return
    }

    // If user exists but profile is still loading, wait
    if (!profile) {
      return
    }

    // If profile exists and user has valid license, redirect to appropriate page
    if (profile.subscription_expires_at && new Date(profile.subscription_expires_at) > new Date()) {
      if (profile.role === 'ADMIN') {
        router.push('/admin')
      } else {
        router.push('/chat')
      }
      return
    }

    // If we reach here, user has profile but subscription is expired or doesn't exist
    // Stay on this page to show the expired subscription message
  }, [user, profile, router])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/signin')
  }

  const handleContactAdmin = () => {
    // You can customize this to open email client or contact form
    alert('Soporte --- info@neuraliti.ca')
    return;
  }

  // Show loading only if user exists but profile is still loading
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // If no user, show loading while redirecting
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="mt-2 text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  // If we reach here, user and profile exist, but subscription is expired
  // TypeScript guard to ensure profile is not null
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Warning Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {profile.subscription_expires_at ? 'Suscripción Expirada' : 'Activa tu suscripción'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {profile.subscription_expires_at ? 'Tu acceso a NeuraliticaBot ha expirado' : 'Tu acceso a NeuraliticaBot requiere una suscripción activa'}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Hello <span className="font-medium text-gray-900">{profile.full_name || profile.email}</span>,
              </p>
              <p className="text-sm text-gray-600 mb-6">
                {profile.subscription_expires_at ? (
                  <>Tu suscripción expiró el{' '}
                  <span className="font-medium text-red-600">
                    {formatDateVE(profile.subscription_expires_at)}
                  </span></>
                ) : (
                  <>Tu cuenta no tiene una suscripción activa</>
                )}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Necesitas activar un plan de acceso
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Para consultar los archivos con NeuraliticaBot, activa tu plan de acceso. Contacta al Administrador.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleContactAdmin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Contactar Administrador
              </button>
              
              <button
                onClick={handleSignOut}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cerrar Sesión
              </button>
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>¿Necesitas ayuda? Contacta al soporte en info@neuraliti.ca</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
