import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem:    (k: string) => store[k] ?? null,
  setItem:    (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear:      () => { Object.keys(store).forEach(k => delete store[k]) },
})

import { saveKey, getKey, removeKey, hasKey, getAllSavedProviders } from './key-store'

describe('key-store', () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]) })

  it('saves and retrieves a key', () => {
    saveKey('anthropic', 'sk-ant-test-123')
    expect(getKey('anthropic')).toBe('sk-ant-test-123')
  })

  it('stored value is obfuscated (not plaintext)', () => {
    saveKey('openai', 'sk-openai-secret')
    expect(store['cb_key_openai']).not.toBe('sk-openai-secret')
    expect(store['cb_key_openai']).toBeDefined()
  })

  it('hasKey returns true after save', () => {
    saveKey('google', 'AIzatest')
    expect(hasKey('google')).toBe(true)
  })

  it('hasKey returns false before save', () => {
    expect(hasKey('groq')).toBe(false)
  })

  it('removeKey clears key', () => {
    saveKey('groq', 'gsk_test')
    removeKey('groq')
    expect(getKey('groq')).toBeNull()
    expect(hasKey('groq')).toBe(false)
  })

  it('getAllSavedProviders returns only configured providers', () => {
    saveKey('anthropic', 'key1')
    saveKey('openai', 'key2')
    const saved = getAllSavedProviders()
    expect(saved).toContain('anthropic')
    expect(saved).toContain('openai')
    expect(saved).not.toContain('google')
  })
})
