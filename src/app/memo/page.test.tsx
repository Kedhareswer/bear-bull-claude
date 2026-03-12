import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { MemoSummary, StepResult } from '@/store/research'

// Mock next/navigation
const mockReplace = vi.fn()
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}))

// Mock zustand store
const mockSetNotes = vi.fn()
const mockStore: {
  memo: MemoSummary | null
  ticker: string
  company: string
  steps: StepResult[]
  notes: string
  setNotes: ReturnType<typeof vi.fn>
} = {
  memo: null,
  ticker: '',
  company: '',
  steps: [],
  notes: '',
  setNotes: mockSetNotes,
}

vi.mock('@/store/research', () => ({
  useResearchStore: vi.fn(() => mockStore),
}))

import MemoPage from './page'

const baseMemo: MemoSummary = {
  verdict: 'BUY',
  conviction: 4,
  thesis: 'Strong fundamentals and durable competitive advantages.',
  bullBullets: ['Dominant market position', 'Growing free cash flow'],
  bearBullet: 'Rising interest rates compress multiples',
  fairValueLo: 150,
  fairValueHi: 180,
  entryTrigger: 'Pullback below $155',
}

const makeStep = (stepId: number, overrides?: Partial<StepResult>): StepResult => ({
  stepId,
  status: 'done',
  content: `Content for step ${stepId}`,
  keyFinding: `Key finding for step ${stepId}`,
  verdict: 'BULLISH',
  citations: [],
  ...overrides,
})

describe('MemoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore.memo = null
    mockStore.ticker = ''
    mockStore.company = ''
    mockStore.steps = []
    mockStore.notes = ''
  })

  it('shows "Loading memo…" when memo is null', () => {
    mockStore.memo = null
    render(<MemoPage />)
    expect(screen.getByText('Loading memo…')).toBeInTheDocument()
  })

  it('calls router.replace with /research when memo is null', () => {
    mockStore.memo = null
    render(<MemoPage />)
    expect(mockReplace).toHaveBeenCalledWith('/research')
  })

  it('shows company name and ticker when memo is present', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = []
    render(<MemoPage />)
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
  })

  it('shows verdict in the hero card', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = []
    render(<MemoPage />)
    expect(screen.getByText('BUY')).toBeInTheDocument()
  })

  it('shows bull bullets in the hero card', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = []
    render(<MemoPage />)
    expect(screen.getByText('Dominant market position')).toBeInTheDocument()
    expect(screen.getByText('Growing free cash flow')).toBeInTheDocument()
  })

  it('shows accordion sections for non-bear completed steps', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = [
      makeStep(1),
      makeStep(3),
      makeStep(6),
    ]
    render(<MemoPage />)
    // Step names should appear as accordion headers
    expect(screen.getByText('Business Overview')).toBeInTheDocument()
    expect(screen.getByText('Financial Deep Dive')).toBeInTheDocument()
    expect(screen.getByText('Valuation')).toBeInTheDocument()
  })

  it('renders bear case section when step 7 is done', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = [
      makeStep(7, { content: 'Regulatory headwinds and margin compression.' }),
    ]
    render(<MemoPage />)
    // Bear Case step name should appear
    expect(screen.getByText('Bear Case')).toBeInTheDocument()
  })

  it('bear case content is always visible (not behind accordion)', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = [
      makeStep(7, { content: 'Regulatory headwinds and margin compression.' }),
    ]
    render(<MemoPage />)
    // Bear case content should be rendered directly (not hidden behind toggle)
    expect(screen.getByText(/Regulatory headwinds/)).toBeInTheDocument()
  })

  it('notes textarea shows current notes', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = []
    mockStore.notes = 'My personal thesis here'
    render(<MemoPage />)
    const textarea = screen.getByPlaceholderText(/Record your own thesis/)
    expect(textarea).toHaveValue('My personal thesis here')
  })

  it('calls setNotes when textarea changes', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = []
    mockStore.notes = ''
    render(<MemoPage />)
    const textarea = screen.getByPlaceholderText(/Record your own thesis/)
    fireEvent.change(textarea, { target: { value: 'New note content' } })
    expect(mockSetNotes).toHaveBeenCalledWith('New note content')
  })

  it('accordion sections do not show content when collapsed', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = [makeStep(1)]
    render(<MemoPage />)
    // Content is not visible before click
    expect(screen.queryByText('Content for step 1')).not.toBeInTheDocument()
  })

  it('accordion section shows content when clicked to expand', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = [makeStep(1)]
    render(<MemoPage />)
    // Click the header row to open
    const header = screen.getByText('Business Overview').closest('div[style*="cursor: pointer"]') as HTMLElement
    if (header) fireEvent.click(header)
    // After click, key finding or content should be visible
    expect(screen.getByText('Key finding for step 1')).toBeInTheDocument()
  })

  it('shows fair value range when values are non-zero', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = []
    render(<MemoPage />)
    expect(screen.getByText('$150–$180')).toBeInTheDocument()
  })

  it('shows entry trigger when present', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    mockStore.steps = []
    render(<MemoPage />)
    expect(screen.getByText('Pullback below $155')).toBeInTheDocument()
  })

  it('does not render accordion for step 7 in otherSteps list', () => {
    mockStore.memo = baseMemo
    mockStore.ticker = 'AAPL'
    mockStore.company = 'Apple Inc.'
    // Step 7 done — should only appear as the always-open bear section, not as accordion
    mockStore.steps = [makeStep(7)]
    render(<MemoPage />)
    // Bear Case should appear once (the always-open section renders it)
    const bearCaseElements = screen.getAllByText('Bear Case')
    // There should only be one Bear Case heading
    expect(bearCaseElements.length).toBe(1)
  })
})
