import { POST } from '../update-profile/route'
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

describe('POST /api/auth/update-profile', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: jest.fn(),
    },
  }

  const mockSupabaseAdmin = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { createServerClient } = require('@supabase/ssr')
    const { createSupabaseAdmin } = require('@/lib/supabase')
    
    createServerClient.mockReturnValue(mockSupabaseClient)
    createSupabaseAdmin.mockReturnValue(mockSupabaseAdmin)
  })

  it('should update profile successfully', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const updatedProfile = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Updated Name',
      role: 'USER',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSupabaseAdmin.from.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: updatedProfile,
              error: null,
            }),
          })),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ name: 'Updated Name' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.profile.full_name).toBe('Updated Name')
  })

  it('should return 401 when not authenticated', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    const request = new NextRequest('http://localhost/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Name' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should return 400 when name is missing', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const request = new NextRequest('http://localhost/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name is required')
  })

  it('should return 400 when name is empty string', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const request = new NextRequest('http://localhost/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name is required')
  })

  it('should trim name before updating', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    const updatedProfile = {
      id: 'user-123',
      full_name: 'Trimmed Name',
    }

    mockSupabaseAdmin.from.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: updatedProfile,
              error: null,
            }),
          })),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ name: '  Trimmed Name  ' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Verify that update was called with trimmed name
    const updateCall = mockSupabaseAdmin.from().update.mock.calls[0][0]
    expect(updateCall.full_name).toBe('Trimmed Name')
  })

  it('should handle update errors', async () => {
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123' },
        },
      },
    })

    mockSupabaseAdmin.from.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Update failed' },
            }),
          })),
        })),
      })),
    })

    const request = new NextRequest('http://localhost/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Name' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update profile')
  })

  it('should handle exceptions gracefully', async () => {
    mockSupabaseClient.auth.getSession.mockRejectedValue(
      new Error('Network error')
    )

    const request = new NextRequest('http://localhost/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Name' }),
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})



