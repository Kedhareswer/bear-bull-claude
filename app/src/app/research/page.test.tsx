import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next/navigation
const mockReplace = vi.fn()
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}))

// Mock zustand store — default to empty ticker (redirect scenario)
const mockStore = {
  ticker: '',
  company: '',
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  depth: 'full',
  steps: [],
  currentStep: 1,
  startStep: vi.fn(),
  appendContent: vi.fn(),
  completeStep: vi.fn(),
  setStepError: vi.fn(),
  setMemo: vi.fn(),
  setCurrentStep: vi.fn(),
  getState: vi.fn(() => ({ steps: [] })),
}

vi.mock('@/store/research', () => ({
  useResearchStore: vi.fn(() => mockStore),
}))

vi.mock('@/lib/key-store', () => ({
  getKey: vi.fn(() => null),
}))

vi.mock('@/components/StepContent', () => ({
  StepContent: () => null,
}))

import ResearchPage from './page'

describe('ResearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.ticker = ''
  })

  it('redirects to /setup when ticker is empty', () => {
    mockStore.ticker = ''
    render(<ResearchPage />)
    expect(mockReplace).toHaveBeenCalledWith('/setup')
  })

  it('does not redirect when ticker is set', () => {
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = Array.from({ length: 9 }, (_, i) => ({
      stepId: i + 1, status: 'pending', content: '', keyFinding: '', verdict: null, citations: [],
    }))
    render(<ResearchPage />)
    expect(mockReplace).not.toHaveBeenCalledWith('/setup')
  })

  it('shows ticker and company in sidebar when ticker is set', () => {
    mockStore.ticker = 'MSFT'
    mockStore.company = 'Microsoft Corporation'
    mockStore.steps = Array.from({ length: 9 }, (_, i) => ({
      stepId: i + 1, status: 'pending', content: '', keyFinding: '', verdict: null, citations: [],
    }))
    render(<ResearchPage />)
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })
})
