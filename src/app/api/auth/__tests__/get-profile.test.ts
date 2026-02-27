import { GET } from '../get-profile/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
  })),
}))

describe('GET /api/auth/get-profile', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: jest.fn(),
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
    const { createSupabaseAdmin } = require('@/lib/supabase')
    
    createServerClient.mockReturnValue(mockSupabaseClient)
    createSupabaseAdmin.mockReturnValue(mockSupabaseAdmin)
  })

  it('should return profile when userId is provided in query params', async () => {
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'USER',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      })),
    })

    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          app_metadata: { provider: 'email' },
        },
      },
    })

    const request = new NextRequest('http://localhost/api/auth/get-profile?userId=user-123')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.profile).toBeDefined()
    expect(data.profile.id).toBe('user-123')
  })

  it('should return 401 when no session and no userId provided', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    const request = new NextRequest('http://localhost/api/auth/get-profile')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should create profile when profile does not exist', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    // Profile not found
    mockSupabaseAdmin.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        })),
      })),
    })

    // Auth user exists
    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'newuser@example.com',
          user_metadata: { full_name: 'New User' },
          app_metadata: { provider: 'email' },
        },
      },
    })

    // Create profile
    mockSupabaseAdmin.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        })),
      })),
    }).mockReturnValueOnce({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                email: 'newuser@example.com',
                full_name: 'New User',
                role: 'USER',
                is_active: true,
                subscription_expires_at: null,
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            }),
          })),
        })),
      })),
    }).mockReturnValueOnce({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'user-123',
              email: 'newuser@example.com',
              full_name: 'New User',
              role: 'USER',
              is_active: true,
              subscription_expires_at: null,
              created_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          }),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/auth/get-profile')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.profile).toBeDefined()
  })

  it('should return 404 when auth user not found', async () => {
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
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        })),
      })),
    })

    mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({
      data: null,
      error: { message: 'User not found' },
    })

    const request = new NextRequest('http://localhost/api/auth/get-profile')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Auth user not found')
  })

  it('should handle errors gracefully', async () => {
    mockSupabaseClient.auth.getSession.mockRejectedValue(
      new Error('Network error')
    )

    const request = new NextRequest('http://localhost/api/auth/get-profile')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})



