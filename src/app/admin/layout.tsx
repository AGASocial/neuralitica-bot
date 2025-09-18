'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useCallback } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authContext = useAuth()
  const { signOut: authSignOut } = authContext


  const handleSignOut = useCallback(async () => {
    try {
      if (!authSignOut) {
        console.error('AdminLayout: No signOut function available')
        return
      }
      await authSignOut()
    } catch (error) {
      console.error('AdminLayout: Sign out error:', error)
    }
  }, [authSignOut])

  // Trust middleware validation completely
  // If this component renders, the user is authenticated and authorized as ADMIN
  return (
    <div className="min-h-screen bg-gray-50">
      <main>{children}</main>
    </div>
  )
}