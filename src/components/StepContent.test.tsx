import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StepContent } from './StepContent'
import type { StepResult } from '@/store/research'
import type { ResearchStep } from '@/lib/research-steps'

// Mock parse-step to avoid dealing with HTML transforms and parsing in tests
vi.mock('@/lib/parse-step', () => ({
  renderMarkdown: (text: string) => text,
  extractMetrics: () => [],
  extractDataPoints: () => [],
  extractTrend: () => [],
  extractValuation: () => null,
}))

const stepDef: ResearchStep = {
  id: 3,
  name: 'Financial Deep Dive',
  subtitle: 'Revenue · Margins · FCF · Balance Sheet',
  sections: '10-K §7, §8',
  mandatory: true,
}

function makeStep(overrides: Partial<StepResult> = {}): StepResult {
  return {
    stepId: 3,
    status: 'pending',
    content: '',
    keyFinding: '',
    verdict: null,
    citations: [],
    ...overrides,
  }
}

describe('StepContent', () => {
  it('returns null when step status is pending', () => {
    const { container } = render(
      <StepContent step={makeStep({ status: 'pending' })} stepDef={stepDef} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows error message when status is error', () => {
    render(
      <StepContent step={makeStep({ status: 'error' })} stepDef={stepDef} />
    )
    expect(screen.getByText(/Step failed/i)).toBeInTheDocument()
    expect(screen.getByText(/Check your API key/i)).toBeInTheDocument()
  })

  it('shows status bar with section name when running', () => {
    render(
      <StepContent step={makeStep({ status: 'running' })} stepDef={stepDef} />
    )
    expect(screen.getByText('10-K §7, §8')).toBeInTheDocument()
    expect(screen.getByText('Reading')).toBeInTheDocument()
  })

  it('shows key finding when done and keyFinding is non-empty', () => {
    render(
      <StepContent
        step={makeStep({
          status: 'done',
          keyFinding: 'Revenue grew 18% YoY driven by cloud segment',
          citations: [],
        })}
        stepDef={stepDef}
      />
    )
    expect(screen.getByText('Revenue grew 18% YoY driven by cloud segment')).toBeInTheDocument()
    expect(screen.getByText(/Key Finding/i)).toBeInTheDocument()
  })

  it('does not show key finding block when keyFinding is empty', () => {
    render(
      <StepContent
        step={makeStep({ status: 'done', keyFinding: '', citations: [] })}
        stepDef={stepDef}
      />
    )
    expect(screen.queryByText(/Key Finding/i)).toBeNull()
  })

  it('shows sources when done and citations array is non-empty', () => {
    // Use citations that are not part of the fed data sources for step 3
    // (fed sources are: XBRL Facts, 10-K §7, 10-K §7A, 10-K §8)
    // so [10-K §1] and [Synthesis] will appear as AI citations
    render(
      <StepContent
        step={makeStep({
          status: 'done',
          keyFinding: 'Some finding',
          citations: ['[10-K §1]', '[Synthesis]'],
        })}
        stepDef={stepDef}
      />
    )
    expect(screen.getByText('AI citations')).toBeInTheDocument()
    expect(screen.getByText('[10-K §1]')).toBeInTheDocument()
    expect(screen.getByText('[Synthesis]')).toBeInTheDocument()
  })

  it('does not show sources section when citations array is empty', () => {
    render(
      <StepContent
        step={makeStep({ status: 'done', keyFinding: 'Finding', citations: [] })}
        stepDef={stepDef}
      />
    )
    expect(screen.queryByText('Sources')).toBeNull()
  })
})
