import { describe, it, expect } from 'vitest'
import { PROVIDERS, getProviderModels, isValidProvider, getProvider } from './providers'

describe('providers', () => {
  it('includes all 5 providers', () => {
    const ids = PROVIDERS.map(p => p.id)
    expect(ids).toContain('anthropic')
    expect(ids).toContain('openai')
    expect(ids).toContain('google')
    expect(ids).toContain('groq')
    expect(ids).toContain('openrouter')
  })

  it('each provider has at least one model', () => {
    PROVIDERS.forEach(p => {
      expect(p.models.length).toBeGreaterThan(0)
    })
  })

  it('returns models for anthropic', () => {
    const models = getProviderModels('anthropic')
    expect(models.length).toBeGreaterThan(0)
    expect(models[0].id).toBeDefined()
  })

  it('validates provider id', () => {
    expect(isValidProvider('anthropic')).toBe(true)
    expect(isValidProvider('fake')).toBe(false)
  })

  it('throws on unknown provider', () => {
    expect(() => getProvider('fake' as any)).toThrow()
  })
})
