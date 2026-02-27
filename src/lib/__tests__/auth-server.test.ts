import { getServerProfile } from '../auth-server'

// Mock dependencies
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

jest.mock('../supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn((name) => {
      if (name === 'sb-test-auth-token') {
        return { value: 'test-token' }
      }
      return undefined
    }),
  })),
}))

describe('auth-server', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: jest.fn(),
    },
  }

  const mockSupabaseAdmin = {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { createServerClient } = require('@supabase/ssr')
    const { createSupabaseAdmin } = require('../supabase')
    
    createServerClient.mockReturnValue(mockSupabaseClient)
    createSupabaseAdmin.mockReturnValue(mockSupabaseAdmin)
  })

  describe('getServerProfile', () => {
    it('should return null when no session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      })

      const result = await getServerProfile()
      expect(result).toBeNull()
    })

    it('should return null when session has no user', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: {} },
      })

      const result = await getServerProfile()
      expect(result).toBeNull()
    })

    it('should return profile when session and profile exist', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'USER',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      }

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
              data: mockProfile,
              error: null,
            }),
          })),
        })),
      })

      const result = await getServerProfile()
      expect(result).toEqual(mockProfile)
    })

    it('should return null when profile fetch fails', async () => {
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
              error: { message: 'Profile not found' },
            }),
          })),
        })),
      })

      const result = await getServerProfile()
      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error('Network error')
      )

      const result = await getServerProfile()
      expect(result).toBeNull()
    })
  })
})



