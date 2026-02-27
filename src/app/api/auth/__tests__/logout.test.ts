import { POST } from '../logout/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}))

describe('POST /api/auth/logout', () => {
  const mockSupabaseClient = {
    auth: {
      signOut: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { createServerClient } = require('@supabase/ssr')
    createServerClient.mockReturnValue(mockSupabaseClient)
  })

  it('should sign out successfully', async () => {
    mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Logged out successfully')
    expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
  })

  it('should handle signOut errors gracefully', async () => {
    mockSupabaseClient.auth.signOut.mockResolvedValue({
      error: { message: 'Sign out error' },
    })

    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    // Should still return success and clear cookies
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should handle exceptions gracefully', async () => {
    mockSupabaseClient.auth.signOut.mockRejectedValue(
      new Error('Network error')
    )

    const request = new NextRequest('http://localhost/api/auth/logout', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toContain('Logged out')
  })
})



