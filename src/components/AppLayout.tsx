'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
  subscription_expires_at?: string | null
  created_at: string
}

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  showBackButton?: boolean
  backHref?: string
  profile?: UserProfile | null
}

export default function AppLayout({
  children,
  title,
  subtitle,
  showBackButton = false,
  backHref,
  profile
}: AppLayoutProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Use profile.role directly instead of separate state
  const userRole = profile?.role


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Logout successful:', result.message)
        // Force redirect to signin page
        window.location.href = '/auth/signin'
      } else {
        console.error('Logout failed with status:', response.status)
        // Force redirect anyway to clear any client state
        window.location.href = '/auth/signin'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect anyway to clear any client state
      window.location.href = '/auth/signin'
    }
    setDropdownOpen(false)
  }

  const handleProfile = () => {
    router.push('/profile')
    setDropdownOpen(false)
  }

  const handleDashboard = () => {
    router.push('/admin')
    setDropdownOpen(false)
  }

  const handleChat = () => {
    router.push('/chat')
    setDropdownOpen(false)
  }

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  // Get page-specific icon and colors
  const getPageConfig = () => {
    if (pathname.startsWith('/admin')) {
      return {
        icon: (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        colors: 'from-purple-600 to-indigo-600',
        titleGradient: 'from-purple-800 to-indigo-800'
      }
    } else if (pathname.startsWith('/chat')) {
      return {
        icon: (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        ),
        colors: 'from-blue-600 to-indigo-600',
        titleGradient: 'from-blue-800 to-indigo-800'
      }
    } else if (pathname.startsWith('/profile')) {
      return {
        icon: (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
        colors: 'from-emerald-600 to-teal-600',
        titleGradient: 'from-emerald-800 to-teal-800'
      }
    } else {
      return {
        icon: (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        colors: 'from-slate-600 to-gray-600',
        titleGradient: 'from-slate-800 to-gray-800'
      }
    }
  }

  const pageConfig = getPageConfig()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Left side - Logo and Title */}
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              <div className={`w-12 h-12 bg-gradient-to-br ${pageConfig.colors} rounded-xl flex items-center justify-center shadow-lg`}>
                {pageConfig.icon}
              </div>

              <div>
                <h1 className={`text-2xl font-bold bg-gradient-to-r ${pageConfig.titleGradient} bg-clip-text text-transparent`}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-slate-600 text-sm">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center space-x-4">
              {/* Navigation buttons for admins */}
              {userRole === 'ADMIN' && (
                <div className="hidden sm:flex items-center space-x-2">
                  {/* {!pathname.startsWith('/admin') && (
                    <button
                      onClick={handleDashboard}
                      className="px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                    >
                      Dashboard
                    </button>
                  )} */}
                  {/* <button
                    onClick={handleChat}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      pathname.startsWith('/chat') 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    Chat
                  </button> */}
                </div>
              )}

              {/* User dropdown */}
              <div className="relative z-50" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center px-3 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-white hover:text-slate-700 transition-all duration-200 border border-transparent hover:border-slate-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>

                  <span className="hidden sm:block mr-2">
                    {profile?.full_name || 'Usuario'}
                  </span>

                  <svg className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-slate-200/80 z-[9999]">
                    {/* User info - Compact */}
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {profile?.full_name || 'Usuario'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                    </div>

                    {/* Main Navigation */}
                    <div className="py-1.5">
                      <button
                        onClick={handleChat}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 flex items-center ${
                          pathname.startsWith('/chat')
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Consulta de Archivos</span>
                      </button>

                      <button
                        onClick={handleProfile}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 flex items-center ${
                          pathname.startsWith('/profile')
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Perfil</span>
                      </button>
                    </div>

                    {/* Admin Section */}
                    {userRole === 'ADMIN' && (
                      <>
                        <div className="border-t border-slate-100 my-1"></div>
                        <div className="px-4 py-1.5">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Administración
                          </p>
                        </div>
                        <div className="py-1.5 space-y-0.5">
                          <button
                            onClick={handleDashboard}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 flex items-center ${
                              pathname.startsWith('/admin') && pathname === '/admin'
                                ? 'bg-purple-50 text-purple-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span>Panel de Control</span>
                          </button>

                          <button
                            onClick={() => { router.push('/admin/files'); setDropdownOpen(false); }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 flex items-center ${
                              pathname.startsWith('/admin/files')
                                ? 'bg-amber-50 text-amber-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Archivos</span>
                          </button>

                          <button
                            onClick={() => { router.push('/admin/users'); setDropdownOpen(false); }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 flex items-center ${
                              pathname.startsWith('/admin/users')
                                ? 'bg-cyan-50 text-cyan-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <span>Usuarios</span>
                          </button>

                          <button
                            onClick={() => { router.push('/admin/messages'); setDropdownOpen(false); }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 flex items-center ${
                              pathname.startsWith('/admin/messages')
                                ? 'bg-green-50 text-green-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            <span>Mensajes</span>
                          </button>

                          <button
                            onClick={() => { router.push('/admin/settings'); setDropdownOpen(false); }}
                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 flex items-center ${
                              pathname.startsWith('/admin/settings')
                                ? 'bg-slate-100 text-slate-900'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Configuración</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* Logout */}
                    <div className="border-t border-slate-100 mt-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}