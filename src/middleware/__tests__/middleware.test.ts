import { middleware } from '../../middleware'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

describe('middleware', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  }

  const mockSupabaseAdmin = {
    from: jest.fn(),
    auth: {
      admin: {
        getUserById: jest.fn(),
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { createServerClient } = require('@supabase/ssr')
    const { createClient } = require('@supabase/supabase-js')
    
    createServerClient.mockReturnValue(mockSupabaseClient)
    createClient.mockReturnValue(mockSupabaseAdmin)
  })

  it('should allow access to public routes without authentication', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    const request = new NextRequest('http://localhost/auth/signin')
    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)
  })

  it('should redirect to signin when accessing protected route without session', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    const request = new NextRequest('http://localhost/chat')
    const response = await middleware(request)

    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('location')).toContain('/auth/signin')
  })

  it('should allow access to protected route with valid session', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const mockProfile = {
      role: 'USER',
      is_active: true,
      subscription_expires_at: new Date(Date.now() + 86400000).toISOString(), // Future date
    }

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/chat')
    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    expect(response.status).toBe(200)
  })

  it('should redirect to expired page when subscription expired', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const mockProfile = {
      role: 'USER',
      is_active: true,
      subscription_expires_at: new Date(Date.now() - 86400000).toISOString(), // Past date
    }

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/chat')
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/expired')
  })

  it('should allow admin access to admin routes', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'admin-123' },
        },
      },
    })

    const mockProfile = {
      role: 'ADMIN',
      is_active: true,
      subscription_expires_at: null,
    }

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/admin')
    const response = await middleware(request)

    expect(response.status).toBe(200)
  })

  it('should redirect non-admin users away from admin routes', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const mockProfile = {
      role: 'USER',
      is_active: true,
      subscription_expires_at: new Date(Date.now() + 86400000).toISOString(),
    }

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/admin')
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/chat')
  })

  it('should sign out and redirect when user is inactive', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const mockProfile = {
      role: 'USER',
      is_active: false,
      subscription_expires_at: null,
    }

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    })

    mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost/chat')
    const response = await middleware(request)

    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/auth/signin')
  })

  it('should redirect authenticated users away from auth pages', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const mockProfile = {
      role: 'USER',
      is_active: true,
      subscription_expires_at: new Date(Date.now() + 86400000).toISOString(),
    }

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/auth/signin')
    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/chat')
  })

  it('should allow logout flow on auth pages', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const request = new NextRequest('http://localhost/auth/signin?logout=true')
    const response = await middleware(request)

    // Should not redirect when logout=true
    expect(response.status).toBe(200)
  })

  it('should handle errors gracefully', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockRejectedValue(new Error('Database error')),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/chat')
    const response = await middleware(request)

    // Should continue despite error
    expect(response).toBeInstanceOf(NextResponse)
  })
})



