import OpenAI from 'openai'

function toBool(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) return defaultValue
  const v = value.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'y'
}

export function createOpenAIClient(opts?: { cacheEnabled?: boolean; useHelicone?: boolean; additionalHeaders?: Record<string, string> }): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }

  const envUseHelicone = toBool(process.env.OPENAI_USE_HELICONE, false)
  const useHelicone = opts?.useHelicone ?? envUseHelicone
  const cacheEnabled = opts?.cacheEnabled ?? true
  const additionalHeaders = opts?.additionalHeaders

  const baseURL = useHelicone
    ? (process.env.HELICONE_BASE_URL || 'https://oai.helicone.ai/v1')
    : (process.env.OPENAI_BASE_URL || undefined)

  const defaultHeaders = useHelicone
    ? {
        'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY || ''}`,
        'Helicone-Cache-Enabled': String(
          cacheEnabled && toBool(process.env.HELICONE_CACHE_ENABLED, true)
        ),
        ...(process.env.HELICONE_PROPERTY_APP
          ? { 'Helicone-Property-App': process.env.HELICONE_PROPERTY_APP }
          : {}),
        ...(additionalHeaders || {}),
      }
    : undefined

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(baseURL ? { baseURL } : {}),
    ...(defaultHeaders ? { defaultHeaders } : {}),
  })
}

// Chat client (honors OPENAI_USE_HELICONE)
export const openaiChat = createOpenAIClient()

// Direct clients (bypass Helicone regardless of env)
export const openaiDirect = createOpenAIClient({ useHelicone: false })
export const openaiDirectNoCache = createOpenAIClient({ cacheEnabled: false, useHelicone: false })

// Backward-compatible aliases
export const openai = openaiChat
export const openaiNoCache = openaiDirectNoCache


