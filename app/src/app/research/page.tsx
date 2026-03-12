'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RESEARCH_STEPS } from '@/lib/research-steps'
import { extractKeyFinding, extractVerdict, extractCitations } from '@/lib/parse-step'
import { getKey } from '@/lib/key-store'
import { useResearchStore } from '@/store/research'
import { type ProviderId } from '@/lib/providers'
import { StepContent } from '@/components/StepContent'
import { parseMemoText, consumeStream } from '@/lib/parse-memo'

async function runStep(
  stepId: number,
  params: {
    provider: string
    model: string
    ticker: string
    companyName: string
    filingText: string
    sections?: Record<string, string>
    xbrlFacts?: string
    institutionalHolders?: string
    tenQText?: string
    eightKText?: string
    proxyText?: string
    quoteText?: string
  },
  actions: {
    startStep: (id: number) => void
    appendContent: (id: number, chunk: string) => void
    completeStep: (id: number, kf: string, v: 'BULLISH' | 'NEUTRAL' | 'BEARISH' | null, c: string[]) => void
    setStepError: (id: number) => void
  },
) {
  const apiKey = getKey(params.provider as ProviderId) ?? ''
  if (!apiKey) {
    actions.setStepError(stepId)
    return
  }

  actions.startStep(stepId)
  try {
    const res = await fetch('/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: params.provider,
        model: params.model,
        apiKey,
        stepId,
        ticker: params.ticker,
        companyName: params.companyName,
        filingText: params.filingText,
        sections: params.sections,
        xbrlFacts: params.xbrlFacts,
        institutionalHolders: params.institutionalHolders,
        tenQText: params.tenQText,
        eightKText: params.eightKText,
        proxyText: params.proxyText,
        quoteText: params.quoteText,
      }),
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const full = await consumeStream(res, chunk => actions.appendContent(stepId, chunk))
    const kf = extractKeyFinding(full)
    const verdict = extractVerdict(full)
    const citations = extractCitations(full)
    actions.completeStep(stepId, kf, verdict, citations)
  } catch {
    actions.setStepError(stepId)
  }
}

export default function ResearchPage() {
  const router = useRouter()
  const store = useResearchStore()
  const {
    ticker, company, provider, model, depth, steps, currentStep, filingUrl, memo,
    startStep, appendContent, completeStep, setStepError, setMemo,
  } = store

  const [filingText, setFilingText] = useState('')
  const [sections, setSections] = useState<Record<string, string>>({})
  const [xbrlFacts, setXbrlFacts] = useState('')
  const [institutionalHolders, setInstitutionalHolders] = useState('')
  const [tenQText, setTenQText] = useState('')
  const [eightKText, setEightKText] = useState('')
  const [proxyText, setProxyText] = useState('')
  const [quoteText, setQuoteText] = useState('')
  const [runError, setRunError] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [memoRunning, setMemoRunning] = useState(false)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!ticker) {
      router.replace('/setup')
      return
    }
    // Load filing data from sessionStorage
    try {
      const raw = sessionStorage.getItem('claude-bull-filing')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.ticker === ticker) {
          setFilingText(parsed.filingText ?? '')
          setSections(parsed.sections ?? {})
          setXbrlFacts(parsed.xbrlFacts ?? '')
          setInstitutionalHolders(parsed.institutionalHolders ?? '')
          setTenQText(parsed.tenQText ?? '')
          setEightKText(parsed.eightKText ?? '')
          setProxyText(parsed.proxyText ?? '')
          setQuoteText(parsed.quoteText ?? '')
        }
      }
    } catch { /* ignore */ }
  }, [ticker, router])

  // Determine which steps to run
  const stepsToRun = depth === 'quick'
    ? RESEARCH_STEPS.filter(s => s.mandatory)
    : RESEARCH_STEPS

  const doneCount = steps.filter(
    s => stepsToRun.some(r => r.id === s.stepId) && s.status === 'done'
  ).length
  const totalToRun = stepsToRun.length
  const progressPct = totalToRun > 0 ? Math.round((doneCount / totalToRun) * 100) : 0

  async function startResearch() {
    if (hasStarted.current) return
    hasStarted.current = true
    setIsResearching(true)
    setRunError('')

    const params = { provider, model, ticker, companyName: company, filingText, sections, xbrlFacts, institutionalHolders, tenQText, eightKText, proxyText, quoteText }
    const actions = { startStep, appendContent, completeStep, setStepError }

    for (const step of stepsToRun) {
      // Skip if already done (e.g. page reload)
      const existing = steps.find(s => s.stepId === step.id)
      if (existing?.status === 'done') continue
      await runStep(step.id, params, actions)
    }

    // Memo synthesis
    setMemoRunning(true)
    try {
      const stepResults: Record<string, string> = {}
      useResearchStore.getState().steps
        .filter(s => stepsToRun.some(r => r.id === s.stepId) && s.status === 'done')
        .forEach(s => { stepResults[s.stepId] = s.content })

      const apiKey = getKey(provider as ProviderId) ?? ''
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider, model, apiKey,
          ticker, companyName: company,
          stepResults, isMemo: true,
        }),
      })
      if (!res.ok) throw new Error(`Memo API error: ${res.status}`)
      let memoText = ''
      await consumeStream(res, chunk => { memoText += chunk })
      const memo = parseMemoText(memoText)
      setMemo(memo)
      router.push('/memo')
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Memo synthesis failed')
    } finally {
      setMemoRunning(false)
      setIsResearching(false)
    }
  }

  const activeStep = RESEARCH_STEPS.find(s => s.id === currentStep)
  const activeStepResult = steps.find(s => s.stepId === currentStep)

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--bg)', color: 'var(--t1)',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '188px', minWidth: '188px', background: 'var(--s1)',
        borderRight: '1px solid var(--b1)', display: 'flex', flexDirection: 'column',
        overflowY: 'auto', padding: '18px 0 80px', flexShrink: 0,
      }}>
        {/* Ticker */}
        <div style={{
          padding: '0 16px 14px', borderBottom: '1px solid var(--b1)', marginBottom: '6px',
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>{ticker}</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
            {company.length > 22 ? company.slice(0, 22) + '\u2026' : company}
          </div>
        </div>

        {/* Progress */}
        <div style={{
          padding: '10px 16px 6px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{
            flex: 1, height: '2px', background: 'var(--b1)', borderRadius: '1px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'var(--t3)', borderRadius: '1px',
              width: `${progressPct}%`, transition: 'width 0.3s',
            }} />
          </div>
          <span style={{
            fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--t3)', flexShrink: 0,
          }}>
            {doneCount}/{totalToRun}
          </span>
        </div>

        {/* Step list */}
        {RESEARCH_STEPS.map(step => {
          const result = steps.find(s => s.stepId === step.id)
          const isActive = step.id === currentStep
          const isDone = result?.status === 'done'
          const isRunning = result?.status === 'running'
          const isSkipped = depth === 'quick' && !step.mandatory
          const verdict = result?.verdict ?? null
          const verdictDot = isDone && verdict === 'BULLISH'
            ? 'var(--up)'
            : isDone && verdict === 'BEARISH'
            ? 'var(--dn)'
            : isDone
            ? 'var(--t3)'
            : null
          return (
            <div
              key={step.id}
              onClick={() => !isSkipped && store.setCurrentStep(step.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '9px', padding: '7px 16px',
                cursor: isSkipped ? 'default' : 'pointer',
                background: isActive ? 'var(--s2)' : 'transparent',
                opacity: isSkipped ? 0.35 : 1,
                borderLeft: isActive ? '2px solid var(--t1)' : '2px solid transparent',
              }}
            >
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontFamily: 'var(--font-mono)',
                border: `1px solid ${isActive ? 'var(--t1)' : isDone ? 'var(--b2)' : 'var(--b1)'}`,
                background: isActive ? 'var(--t1)' : isDone ? 'var(--s3)' : 'transparent',
                color: isActive ? 'var(--bg)' : isDone ? 'var(--t2)' : isRunning ? 'var(--t2)' : 'var(--t3)',
              }}>
                {isDone ? '✓' : isRunning ? '…' : step.id}
              </div>
              <span style={{
                fontSize: '12px', flex: 1,
                color: isActive ? 'var(--t1)' : isDone ? 'var(--t2)' : 'var(--t3)',
              }}>
                {step.name}
              </span>
              {verdictDot && (
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: verdictDot, flexShrink: 0,
                }} />
              )}
            </div>
          )
        })}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '14px 22px', borderBottom: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>{activeStep?.name ?? 'Research'}</h2>
            <p style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
              {activeStep?.subtitle}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {activeStep && (
              <span style={{
                fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--t3)',
                background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '4px',
                padding: '3px 6px',
              }}>
                {activeStep.sections}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '20px 22px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {!isResearching && !memoRunning && doneCount === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '16px', paddingTop: '40px',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--t2)', textAlign: 'center' }}>
                Ready to analyze {company} ({ticker}).<br />
                This will read the latest 10-K and 10-Q from SEC EDGAR.
              </div>
              {runError && (
                <div style={{ fontSize: '12px', color: 'var(--dn)' }}>{runError}</div>
              )}
              <button
                onClick={startResearch}
                style={{
                  padding: '10px 24px', background: 'var(--t1)', color: 'var(--bg)',
                  fontWeight: 500, fontSize: '13px', border: 'none',
                  borderRadius: 'var(--r)', cursor: 'pointer',
                }}
              >
                Start Research \u2192
              </button>
            </div>
          )}

          {memoRunning && (
            <div style={{ fontSize: '13px', color: 'var(--t2)', paddingTop: '20px' }}>
              Synthesizing investment memo\u2026
            </div>
          )}

          {activeStepResult && (
            <StepContent
              step={activeStepResult}
              stepDef={activeStep ?? RESEARCH_STEPS[0]}
              filingUrl={filingUrl}
            />
          )}

          {runError && isResearching && (
            <div style={{ fontSize: '12px', color: 'var(--dn)' }}>{runError}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 22px', borderTop: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
            Step {currentStep}/9 \u00b7 {depth === 'quick' ? '~$0.10' : '~$0.40'}
          </span>
          <div style={{ display: 'flex', gap: '7px' }}>
            <button
              onClick={() => router.push('/setup')}
              style={{
                padding: '7px 14px', borderRadius: 'var(--r)', fontSize: '13px',
                background: 'transparent', border: '1px solid var(--b1)',
                color: 'var(--t2)', cursor: 'pointer',
              }}
            >
              ← Back
            </button>
            {memo && (
              <button
                onClick={() => router.push('/memo')}
                style={{
                  padding: '7px 14px', borderRadius: 'var(--r)', fontSize: '13px',
                  background: 'var(--t1)', border: 'none',
                  color: 'var(--bg)', cursor: 'pointer', fontWeight: 500,
                }}
              >
                View Memo →
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
