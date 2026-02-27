import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../AuthContext'

// Mock Supabase
const mockSignIn = jest.fn()
const mockSignUp = jest.fn()
const mockSignInWithOAuth = jest.fn()
const mockSignOut = jest.fn()
const mockGetSession = jest.fn()
const mockOnAuthStateChange = jest.fn()

jest.mock('@/lib/supabase', () => ({
  createSupabaseBrowser: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      signUp: mockSignUp,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  })),
}))

// Mock fetch for profile API
global.fetch = jest.fn()

// Test component
function TestComponent() {
  const { user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile, isAdmin } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.id : 'no-user'}</div>
      <div data-testid="profile">{profile ? profile.email : 'no-profile'}</div>
      <div data-testid="is-admin">{isAdmin ? 'true' : 'false'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'password', 'Test User')}>Sign Up</button>
      <button onClick={() => signInWithGoogle()}>Sign In Google</button>
      <button onClick={() => signOut()}>Sign Out</button>
      <button onClick={() => refreshProfile()}>Refresh Profile</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ profile: null }),
    })
  })

  it('should provide auth context', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('should handle sign in', async () => {
    const user = userEvent.setup()
    mockSignIn.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    await user.click(screen.getByText('Sign In'))

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('should handle sign up', async () => {
    const user = userEvent.setup()
    mockSignUp.mockResolvedValue({ error: null })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    await user.click(screen.getByText('Sign Up'))

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        data: {
          full_name: 'Test User',
        },
      },
    })
  })

  it('should handle sign in with Google', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockResolvedValue({ error: null })

    // Mock window.location
    delete (window as any).location
    window.location = { origin: 'http://localhost' } as any

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    await user.click(screen.getByText('Sign In Google'))

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost/auth/callback',
      },
    })
  })

  it('should handle sign out', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      redirected: false,
      url: 'http://localhost/auth/signin',
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    await user.click(screen.getByText('Sign Out'))

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
    })
  })

  it('should show admin status when profile is admin', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
      error: null,
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          id: 'user-123',
          email: 'admin@example.com',
          role: 'ADMIN',
          is_active: true,
        },
      }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true')
    })
  })

  it('should show non-admin status when profile is user', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
      error: null,
    })

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          id: 'user-123',
          email: 'user@example.com',
          role: 'USER',
          is_active: true,
        },
      }),
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false')
    })
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleSpy.mockRestore()
  })

  it('should handle session timeout gracefully', async () => {
    // Mock timeout scenario
    mockGetSession.mockImplementation(() => 
      new Promise((resolve) => {
        setTimeout(() => resolve({ __timeout: true }), 2000)
      })
    )

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Fast-forward timers
    jest.useFakeTimers()
    jest.advanceTimersByTime(1500)
    await Promise.resolve()
    jest.useRealTimers()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })
  })
})



