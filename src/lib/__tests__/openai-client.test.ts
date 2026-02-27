import { createOpenAIClient } from '../openai-client'

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation((config) => ({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    defaultHeaders: config.defaultHeaders,
  }))
})

describe('openai-client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('createOpenAIClient', () => {
    it('should throw error if OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY
      expect(() => createOpenAIClient()).toThrow('Missing OPENAI_API_KEY environment variable')
    })

    it('should create client with API key', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      const client = createOpenAIClient()
      expect(client).toBeDefined()
      expect(client.apiKey).toBe('test-key')
    })

    it('should use Helicone when OPENAI_USE_HELICONE is true', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.OPENAI_USE_HELICONE = 'true'
      process.env.HELICONE_BASE_URL = 'https://test.helicone.ai/v1'
      process.env.HELICONE_API_KEY = 'helicone-key'
      
      const client = createOpenAIClient()
      expect(client.baseURL).toBe('https://test.helicone.ai/v1')
      expect(client.defaultHeaders).toHaveProperty('Helicone-Auth')
    })

    it('should use Helicone when useHelicone option is true', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      const client = createOpenAIClient({ useHelicone: true })
      expect(client.baseURL).toBeDefined()
    })

    it('should disable cache when cacheEnabled option is false', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.OPENAI_USE_HELICONE = 'true'
      process.env.HELICONE_API_KEY = 'helicone-key'
      
      const client = createOpenAIClient({ cacheEnabled: false })
      expect(client.defaultHeaders?.['Helicone-Cache-Enabled']).toBe('false')
    })

    it('should use custom base URL when provided', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.OPENAI_BASE_URL = 'https://custom.openai.com'
      
      const client = createOpenAIClient({ useHelicone: false })
      expect(client.baseURL).toBe('https://custom.openai.com')
    })

    it('should add additional headers when provided', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.OPENAI_USE_HELICONE = 'true'
      process.env.HELICONE_API_KEY = 'helicone-key'
      
      const client = createOpenAIClient({
        additionalHeaders: { 'Custom-Header': 'custom-value' }
      })
      expect(client.defaultHeaders).toHaveProperty('Custom-Header')
    })

    it('should handle boolean string values correctly', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.OPENAI_USE_HELICONE = '1'
      
      const client = createOpenAIClient()
      expect(client.baseURL).toBeDefined()
    })

    it('should handle "yes" and "y" as true', () => {
      process.env.OPENAI_API_KEY = 'test-key'
      process.env.OPENAI_USE_HELICONE = 'yes'
      
      const client1 = createOpenAIClient()
      expect(client1.baseURL).toBeDefined()
      
      process.env.OPENAI_USE_HELICONE = 'y'
      const client2 = createOpenAIClient()
      expect(client2.baseURL).toBeDefined()
    })
  })
})



