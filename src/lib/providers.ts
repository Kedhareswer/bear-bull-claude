export type ProviderId = 'anthropic' | 'openai' | 'google' | 'groq' | 'openrouter'

export interface ProviderModel {
  id: string
  label: string
  contextK: number
}

export interface Provider {
  id: ProviderId
  label: string
  keyPlaceholder: string
  docsUrl: string
  models: ProviderModel[]
}

export const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    keyPlaceholder: 'sk-ant-api03-…',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6',    contextK: 200 },
      { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',  contextK: 200 },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',   contextK: 200 },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-…',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o',      contextK: 128 },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', contextK: 128 },
      { id: 'o3-mini',     label: 'o3-mini',      contextK: 200 },
    ],
  },
  {
    id: 'google',
    label: 'Google',
    keyPlaceholder: 'AIza…',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.0-flash',   label: 'Gemini 2.0 Flash',   contextK: 1000 },
      { id: 'gemini-1.5-pro',     label: 'Gemini 1.5 Pro',     contextK: 2000 },
      { id: 'gemini-1.5-flash',   label: 'Gemini 1.5 Flash',   contextK: 1000 },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    keyPlaceholder: 'gsk_…',
    docsUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',   contextK: 128 },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B',    contextK: 128 },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',    contextK: 32  },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyPlaceholder: 'sk-or-…',
    docsUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'anthropic/claude-opus-4-6',   label: 'Claude Opus 4.6 (OR)',    contextK: 200  },
      { id: 'openai/gpt-4o',               label: 'GPT-4o (OR)',             contextK: 128  },
      { id: 'google/gemini-2.0-flash',     label: 'Gemini 2.0 Flash (OR)',   contextK: 1000 },
      { id: 'meta-llama/llama-3.3-70b',    label: 'Llama 3.3 70B (OR)',      contextK: 128  },
    ],
  },
]

export function getProvider(id: ProviderId): Provider {
  const p = PROVIDERS.find(p => p.id === id)
  if (!p) throw new Error(`Unknown provider: ${id}`)
  return p
}

export function getProviderModels(id: ProviderId): ProviderModel[] {
  return getProvider(id).models
}

export function isValidProvider(id: string): id is ProviderId {
  return PROVIDERS.some(p => p.id === id)
}
