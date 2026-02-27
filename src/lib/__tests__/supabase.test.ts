import { createSupabaseBrowser, createSupabaseAdmin } from '../supabase'

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn((url, key) => ({
    url,
    key,
    type: 'client',
  })),
}))

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn((url, key) => ({
    url,
    key,
    type: 'browser-client',
  })),
}))

describe('supabase', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createSupabaseBrowser', () => {
    it('should create a browser client with correct URL and key', () => {
      const client = createSupabaseBrowser()
      expect(client).toBeDefined()
      expect(client.url).toBe('https://test.supabase.co')
      expect(client.key).toBe('test-anon-key')
      expect(client.type).toBe('browser-client')
    })
  })

  describe('createSupabaseAdmin', () => {
    it('should create an admin client with service role key', () => {
      const client = createSupabaseAdmin()
      expect(client).toBeDefined()
      expect(client.url).toBe('https://test.supabase.co')
      expect(client.key).toBe('test-service-role-key')
      expect(client.type).toBe('client')
    })
  })
})



