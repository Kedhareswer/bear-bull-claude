import { describe, it, expect } from 'vitest'
import { RESEARCH_STEPS, buildStepPrompt } from './research-steps'
import { extractKeyFinding, extractVerdict, extractCitations } from './parse-step'

describe('research-steps', () => {
  it('has exactly 9 steps', () => {
    expect(RESEARCH_STEPS).toHaveLength(9)
  })

  it('step 7 is Bear Case and mandatory', () => {
    const step = RESEARCH_STEPS.find(s => s.id === 7)!
    expect(step.name).toContain('Bear Case')
    expect(step.mandatory).toBe(true)
  })

  it('steps 3, 6, 7 are mandatory', () => {
    const mandatory = RESEARCH_STEPS.filter(s => s.mandatory).map(s => s.id)
    expect(mandatory).toContain(3)
    expect(mandatory).toContain(6)
    expect(mandatory).toContain(7)
  })

  it('builds prompt containing ticker and step name', () => {
    const prompt = buildStepPrompt(1, 'AAPL', 'Apple Inc.', 'mock filing')
    expect(prompt).toContain('AAPL')
    expect(prompt).toContain('Apple Inc.')
    expect(prompt).toContain('Business Overview')
  })

  it('throws for unknown step', () => {
    expect(() => buildStepPrompt(99, 'AAPL', 'Apple', '')).toThrow()
  })
})

describe('parse-step', () => {
  it('extracts key finding', () => {
    const content = 'KEY FINDING: Revenue grew 13% driven by Services.\nMore analysis...'
    expect(extractKeyFinding(content)).toBe('Revenue grew 13% driven by Services.')
  })

  it('extracts BULLISH verdict', () => {
    expect(extractVerdict('STEP VERDICT: BULLISH — strong margins')).toBe('BULLISH')
  })

  it('extracts citations', () => {
    const content = 'Revenue [10-K §8.1] and margins [10-K §8.2] improved.'
    const cites = extractCitations(content)
    expect(cites).toContain('[10-K §8.1]')
    expect(cites).toContain('[10-K §8.2]')
  })

  it('deduplicates citations', () => {
    const content = '[10-K §8.1] and again [10-K §8.1]'
    expect(extractCitations(content)).toHaveLength(1)
  })
})
