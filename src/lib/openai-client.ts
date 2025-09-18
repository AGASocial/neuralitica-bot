import OpenAI from 'openai'

function toBool(value: string | undefined, defaultValue: boolean = false): boolean {
  if (value === undefined) return defaultValue
  const v = value.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'y'
}

export function createOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }

  const useHelicone = toBool(process.env.OPENAI_USE_HELICONE, false)

  const baseURL = useHelicone
    ? (process.env.HELICONE_BASE_URL || 'https://oai.helicone.ai/v1')
    : (process.env.OPENAI_BASE_URL || undefined)

  const defaultHeaders = useHelicone
    ? {
        'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY || ''}`,
        'Helicone-Cache-Enabled': String(
          toBool(process.env.HELICONE_CACHE_ENABLED, true)
        ),
        ...(process.env.HELICONE_PROPERTY_APP
          ? { 'Helicone-Property-App': process.env.HELICONE_PROPERTY_APP }
          : {}),
      }
    : undefined

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    ...(baseURL ? { baseURL } : {}),
    ...(defaultHeaders ? { defaultHeaders } : {}),
  })
}

export const openai = createOpenAIClient()


