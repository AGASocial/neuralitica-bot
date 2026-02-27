import { queryPricesFast, setSystemInstructionsCache, invalidateSystemInstructionsCache } from '../openai-responses'

// Mock dependencies
jest.mock('../openai-client', () => ({
  createOpenAIClient: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
    responses: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
  })),
}))

jest.mock('../supabase', () => ({
  createSupabaseAdmin: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(),
        })),
      })),
    })),
  })),
}))

const mockOpenAI = require('../openai-client').createOpenAIClient()

describe('openai-responses', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    invalidateSystemInstructionsCache()
  })

  describe('queryPricesFast', () => {
    it('should use fallback chat when no vector stores provided', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Test response',
            },
          },
        ],
        usage: {
          total_tokens: 100,
        },
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await queryPricesFast('test query', [])
      expect(result.content).toBe('Test response')
      expect(result.tokens_used).toBe(100)
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled()
    })

    it('should use Responses API when vector stores provided', async () => {
      const mockResponse = {
        id: 'resp-123',
        status: 'completed',
        output: [
          {
            type: 'message',
            status: 'completed',
            content: [
              {
                type: 'output_text',
                text: 'Test response from vector store',
              },
            ],
          },
        ],
        usage: {
          total_tokens: 200,
        },
      }

      mockOpenAI.responses.create.mockResolvedValue(mockResponse)

      const result = await queryPricesFast('test query', ['vs-123'])
      expect(result.content).toBe('Test response from vector store')
      expect(result.tokens_used).toBe(200)
      expect(mockOpenAI.responses.create).toHaveBeenCalled()
    })

    it('should poll for in_progress responses', async () => {
      const inProgressResponse = {
        id: 'resp-123',
        status: 'in_progress',
      }

      const completedResponse = {
        id: 'resp-123',
        status: 'completed',
        output: [
          {
            type: 'message',
            status: 'completed',
            content: [
              {
                type: 'output_text',
                text: 'Final response',
              },
            ],
          },
        ],
        usage: {
          total_tokens: 150,
        },
      }

      mockOpenAI.responses.create.mockResolvedValue(inProgressResponse)
      mockOpenAI.responses.retrieve
        .mockResolvedValueOnce(inProgressResponse)
        .mockResolvedValueOnce(completedResponse)

      // Mock setTimeout to speed up test
      jest.useFakeTimers()
      const resultPromise = queryPricesFast('test query', ['vs-123'])
      
      // Fast-forward time
      jest.advanceTimersByTime(1000)
      await Promise.resolve() // Allow promises to resolve
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
      
      const result = await resultPromise
      expect(result.content).toBe('Final response')
      jest.useRealTimers()
    })

    it('should handle conversation history', async () => {
      const mockResponse = {
        id: 'resp-123',
        status: 'completed',
        output: [
          {
            type: 'message',
            status: 'completed',
            content: [
              {
                type: 'output_text',
                text: 'Response with history',
              },
            ],
          },
        ],
        usage: { total_tokens: 100 },
      }

      mockOpenAI.responses.create.mockResolvedValue(mockResponse)

      const conversationHistory = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' },
      ]

      await queryPricesFast('test query', ['vs-123'], conversationHistory)
      
      const callArgs = mockOpenAI.responses.create.mock.calls[0][0]
      expect(callArgs.input.length).toBeGreaterThan(2) // system + history + current
    })

    it('should handle failed response status', async () => {
      const mockResponse = {
        id: 'resp-123',
        status: 'failed',
      }

      mockOpenAI.responses.create.mockResolvedValue(mockResponse)

      await expect(
        queryPricesFast('test query', ['vs-123'])
      ).rejects.toThrow('La consulta no pudo completarse')
    })

    it('should handle errors gracefully', async () => {
      mockOpenAI.responses.create.mockRejectedValue(
        new Error('API Error')
      )

      await expect(
        queryPricesFast('test query', ['vs-123'])
      ).rejects.toThrow('Error en consulta de archivos')
    })

    it('should include user identifier in headers when provided', async () => {
      const mockResponse = {
        id: 'resp-123',
        status: 'completed',
        output: [
          {
            type: 'message',
            status: 'completed',
            content: [
              {
                type: 'output_text',
                text: 'Response',
              },
            ],
          },
        ],
        usage: { total_tokens: 100 },
      }

      mockOpenAI.responses.create.mockResolvedValue(mockResponse)

      await queryPricesFast('test query', ['vs-123'], [], 'user-123')
      
      // Verify createOpenAIClient was called with user header
      const { createOpenAIClient } = require('../openai-client')
      expect(createOpenAIClient).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalHeaders: { 'Helicone-User-Id': 'user-123' },
        })
      )
    })
  })

  describe('cache management', () => {
    it('should set system instructions cache', () => {
      setSystemInstructionsCache('Test instructions')
      // Cache is internal, so we test by checking it doesn't throw
      expect(() => setSystemInstructionsCache('Test')).not.toThrow()
    })

    it('should invalidate system instructions cache', () => {
      setSystemInstructionsCache('Test instructions')
      invalidateSystemInstructionsCache()
      // Cache is internal, so we test by checking it doesn't throw
      expect(() => invalidateSystemInstructionsCache()).not.toThrow()
    })
  })
})



