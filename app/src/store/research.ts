import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderId } from '@/lib/providers'

export type StepStatus = 'pending' | 'running' | 'done' | 'error'

export interface StepResult {
  stepId:     number
  status:     StepStatus
  content:    string
  keyFinding: string
  verdict:    'BULLISH' | 'NEUTRAL' | 'BEARISH' | null
  citations:  string[]
}

export interface MemoSummary {
  verdict:      string
  conviction:   number
  thesis:       string
  bullBullets:  string[]
  bearBullet:   string
  fairValueLo:  number
  fairValueHi:  number
  entryTrigger: string
}

interface ResearchState {
  // Setup
  ticker:     string
  company:    string
  provider:   ProviderId
  model:      string
  depth:      'quick' | 'full'
  filingUrl:  string

  // Progress
  currentStep: number
  steps:       StepResult[]
  isRunning:   boolean

  // Final memo
  memo: MemoSummary | null

  // User notes
  notes: string

  // Actions
  setSetup:      (ticker: string, company: string, provider: ProviderId, model: string, depth: 'quick' | 'full', filingUrl?: string) => void
  setCurrentStep:(stepId: number) => void
  startStep:     (stepId: number) => void
  appendContent: (stepId: number, chunk: string) => void
  completeStep:  (stepId: number, keyFinding: string, verdict: StepResult['verdict'], citations: string[]) => void
  setStepError:  (stepId: number) => void
  setMemo:       (memo: MemoSummary) => void
  setNotes:      (notes: string) => void
  reset:         () => void
}

const makeSteps = (): StepResult[] =>
  Array.from({ length: 9 }, (_, i) => ({
    stepId: i + 1, status: 'pending' as StepStatus,
    content: '', keyFinding: '', verdict: null, citations: [],
  }))

export const useResearchStore = create<ResearchState>()(
  persist(
    (set) => ({
      ticker: '', company: '', provider: 'anthropic', model: 'claude-sonnet-4-6',
      depth: 'full', filingUrl: '', currentStep: 1, steps: makeSteps(), isRunning: false,
      memo: null, notes: '',

      setSetup: (ticker, company, provider, model, depth, filingUrl = '') =>
        set({ ticker, company, provider, model, depth, filingUrl, steps: makeSteps(), currentStep: 1, memo: null }),

      setCurrentStep: (stepId) => set({ currentStep: stepId }),

      startStep: (stepId) => set(s => ({
        currentStep: stepId,
        isRunning: true,
        steps: s.steps.map(st =>
          st.stepId === stepId ? { ...st, status: 'running', content: '' } : st
        ),
      })),

      appendContent: (stepId, chunk) => set(s => ({
        steps: s.steps.map(st =>
          st.stepId === stepId ? { ...st, content: st.content + chunk } : st
        ),
      })),

      completeStep: (stepId, keyFinding, verdict, citations) => set(s => ({
        isRunning: false,
        steps: s.steps.map(st =>
          st.stepId === stepId ? { ...st, status: 'done', keyFinding, verdict, citations } : st
        ),
      })),

      setStepError: (stepId) => set(s => ({
        isRunning: false,
        steps: s.steps.map(st =>
          st.stepId === stepId ? { ...st, status: 'error' } : st
        ),
      })),

      setMemo: (memo) => set({ memo }),
      setNotes: (notes) => set({ notes }),
      reset: () => set({ ticker: '', company: '', filingUrl: '', steps: makeSteps(), currentStep: 1, isRunning: false, memo: null, notes: '' }),
    }),
    {
      name: 'claude-bull-research',
      partialize: (state) => ({
        ticker: state.ticker, company: state.company, filingUrl: state.filingUrl,
        provider: state.provider, model: state.model,
        depth: state.depth, steps: state.steps,
        currentStep: state.currentStep, memo: state.memo, notes: state.notes,
      }),
    }
  )
)
