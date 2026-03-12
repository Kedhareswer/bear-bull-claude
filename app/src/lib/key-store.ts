export type ProviderId = 'anthropic' | 'openai' | 'google' | 'groq' | 'openrouter'

const PREFIX = 'cb_key_'

function obfuscate(val: string): string {
  return btoa(encodeURIComponent(val))
}

function deobfuscate(val: string): string {
  try { return decodeURIComponent(atob(val)) } catch { return '' }
}

export function saveKey(provider: ProviderId, key: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(PREFIX + provider, obfuscate(key))
}

export function getKey(provider: ProviderId): string | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(PREFIX + provider)
  if (!raw) return null
  const val = deobfuscate(raw)
  return val || null
}

export function removeKey(provider: ProviderId): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(PREFIX + provider)
}

export function hasKey(provider: ProviderId): boolean {
  return getKey(provider) !== null
}

export function getAllSavedProviders(): ProviderId[] {
  const all: ProviderId[] = ['anthropic', 'openai', 'google', 'groq', 'openrouter']
  return all.filter(p => hasKey(p))
}

// Generic data key store (for non-AI-provider keys like Alpha Vantage)
const DATA_PREFIX = 'cb_data_'

export function saveDataKey(name: string, key: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(DATA_PREFIX + name, obfuscate(key))
}

export function getDataKey(name: string): string | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(DATA_PREFIX + name)
  if (!raw) return null
  const val = deobfuscate(raw)
  return val || null
}

export function hasDataKey(name: string): boolean {
  return getDataKey(name) !== null
}
