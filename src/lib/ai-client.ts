import { streamText, type ModelMessage } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import type { ProviderId } from './providers'

export function createModel(provider: ProviderId, model: string, apiKey: string) {
  switch (provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(model)
    case 'openai':
      return createOpenAI({ apiKey })(model)
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(model)
    case 'groq':
      return createGroq({ apiKey })(model)
    case 'openrouter':
      return createOpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': 'https://claude-bull.app',
          'X-Title': 'Claude Bull',
        },
      })(model)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

export interface StreamParams {
  provider:   ProviderId
  model:      string
  apiKey:     string
  messages:       ModelMessage[]
  maxOutputTokens?: number
}

export async function streamResearch(params: StreamParams) {
  const model = createModel(params.provider, params.model, params.apiKey)
  return streamText({
    model,
    messages: params.messages,
    maxOutputTokens: params.maxOutputTokens ?? 2000,
  })
}
