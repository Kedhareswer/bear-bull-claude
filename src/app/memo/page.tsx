'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useResearchStore } from '@/store/research'
import { RESEARCH_STEPS } from '@/lib/research-steps'
import { StepContent } from '@/components/StepContent'

export default function MemoPage() {
  const router = useRouter()
  const { memo, ticker, company, steps, notes, setNotes, filingUrl } = useResearchStore()
  const [openSections, setOpenSections] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!memo) router.replace('/research')
  }, [memo, router])

  if (!memo) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--t2)', fontSize: '13px' }}>Loading memo…</div>
      </div>
    )
  }

  const resolvedMemo = memo

  function toggleSection(stepId: number) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  async function copyMemo() {
    const text = buildPlainTextMemo()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function buildPlainTextMemo(): string {
    const lines = [
      `INVESTMENT MEMO: ${company} (${ticker})`,
      `Date: ${new Date().toLocaleDateString()}`,
      '',
      `VERDICT: ${resolvedMemo.verdict}`,
      `CONVICTION: ${resolvedMemo.conviction}/5`,
      '',
      `THESIS:`,
      resolvedMemo.thesis,
      '',
      'BULL CASE:',
      ...resolvedMemo.bullBullets.map(b => `• ${b}`),
      '',
      'BEAR CASE:',
      `• ${resolvedMemo.bearBullet}`,
      '',
      `FAIR VALUE: $${resolvedMemo.fairValueLo}–$${resolvedMemo.fairValueHi}`,
      `ENTRY TRIGGER: ${resolvedMemo.entryTrigger}`,
    ]
    if (notes.trim()) lines.push('', 'MY NOTES:', notes)
    return lines.join('\n')
  }

  const isBuy = resolvedMemo.verdict === 'BUY'
  const isAvoid = resolvedMemo.verdict === 'AVOID'
  const verdictColor = isBuy ? 'var(--up)' : isAvoid ? 'var(--dn)' : 'var(--t2)'
  const verdictBg = isBuy
    ? 'var(--color-bullish-muted-bg)'
    : isAvoid
    ? 'var(--color-bearish-muted-bg)'
    : 'var(--s2)'
  const verdictBorder = isBuy
    ? 'var(--color-bullish-border)'
    : isAvoid
    ? 'var(--color-bearish-border)'
    : 'var(--b1)'

  const doneSteps = steps.filter(s => s.status === 'done')
  const bearStep = doneSteps.find(s => s.stepId === 7)
  const otherSteps = doneSteps.filter(s => s.stepId !== 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--t1)' }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 32px', borderBottom: '1px solid var(--b1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        background: 'var(--s1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h1 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)' }}>{company}</h1>
              <span style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--t3)',
                background: 'var(--s3)', border: '1px solid var(--b1)', borderRadius: '3px', padding: '2px 6px',
              }}>
                {ticker}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
              Investment Memo
              <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              <span style={{ margin: '0 6px', opacity: 0.4 }}>·</span>
              {filingUrl
                ? <a href={filingUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-bullish-link)', textDecoration: 'none' }}>↗ SEC EDGAR 10-K</a>
                : <span style={{ color: 'var(--color-bullish-link)' }}>SEC EDGAR 10-K</span>
              }
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={copyMemo}
            style={{
              background: 'transparent', border: '1px solid var(--b1)', color: copied ? 'var(--up)' : 'var(--t2)',
              fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--r)', cursor: 'pointer',
            }}
          >
            {copied ? '✓ Copied' : 'Copy Memo'}
          </button>
          <button
            onClick={() => router.push('/research')}
            style={{
              background: 'transparent', border: '1px solid var(--b1)', color: 'var(--t2)',
              fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--r)', cursor: 'pointer',
            }}
          >
            ← Research
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 32px 80px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>

          {/* === VERDICT HERO === */}
          <div style={{
            background: verdictBg,
            border: `1px solid ${verdictBorder}`,
            borderRadius: '10px',
            padding: '28px 32px',
            marginBottom: '28px',
          }}>
            {/* Verdict + conviction + price row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                  color: verdictColor, letterSpacing: '-0.02em', lineHeight: 1,
                }}>
                  {resolvedMemo.verdict}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)' }}>
                    Conviction
                  </div>
                  <div style={{ fontSize: '18px', color: verdictColor, letterSpacing: '3px', lineHeight: 1 }}>
                    {'★'.repeat(resolvedMemo.conviction)}
                    <span style={{ opacity: 0.2 }}>{'★'.repeat(5 - resolvedMemo.conviction)}</span>
                  </div>
                </div>
              </div>

              {(resolvedMemo.fairValueLo > 0 || resolvedMemo.fairValueHi > 0) && (
                <div style={{ display: 'flex', gap: '28px', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '4px' }}>
                      Fair Value
                    </div>
                    <div style={{ fontSize: '22px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--t1)' }}>
                      ${resolvedMemo.fairValueLo}–${resolvedMemo.fairValueHi}
                    </div>
                  </div>
                  {resolvedMemo.entryTrigger && (
                    <div style={{ maxWidth: '200px' }}>
                      <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '4px' }}>
                        Entry Trigger
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>
                        {resolvedMemo.entryTrigger}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Thesis */}
            <p style={{ fontSize: '14px', color: 'var(--t1)', lineHeight: 1.75, marginBottom: '16px', margin: '0 0 16px' }}>
              {resolvedMemo.thesis}
            </p>

            {/* Bullets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {resolvedMemo.bullBullets.map((b, i) => (
                <div key={i} style={{ fontSize: '13px', color: 'var(--t2)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: 'var(--up)', flexShrink: 0, fontSize: '9px', marginTop: '4px' }}>▲</span>
                  <span style={{ lineHeight: 1.6 }}>{b}</span>
                </div>
              ))}
              {resolvedMemo.bearBullet && (
                <div style={{ fontSize: '13px', color: 'var(--t2)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: 'var(--dn)', flexShrink: 0, fontSize: '9px', marginTop: '4px' }}>▼</span>
                  <span style={{ lineHeight: 1.6 }}>{resolvedMemo.bearBullet}</span>
                </div>
              )}
            </div>
          </div>

          {/* === STEP ACCORDION === */}
          <div style={{ borderTop: '1px solid var(--b1)', marginBottom: '28px' }}>
            {otherSteps.map(stepResult => {
              const stepDef = RESEARCH_STEPS.find(s => s.id === stepResult.stepId)
              if (!stepDef) return null
              const isOpen = openSections.has(stepResult.stepId)
              return (
                <div key={stepResult.stepId} style={{ borderBottom: '1px solid var(--b1)' }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection(stepResult.stepId)}
                    onKeyDown={e => e.key === 'Enter' && toggleSection(stepResult.stepId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '15px 4px', cursor: 'pointer', userSelect: 'none',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--t3)', width: '24px', flexShrink: 0 }}>
                      {String(stepResult.stepId).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', flex: 1 }}>
                      {stepDef.name}
                    </span>
                    {stepResult.citations.length > 0 && (
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}>
                        {stepResult.citations.length} refs
                      </span>
                    )}
                    <span style={{ fontSize: '14px', color: 'var(--t3)', flexShrink: 0, width: '20px', textAlign: 'center' }}>
                      {isOpen ? '−' : '+'}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '0 4px 20px 4px' }}>
                      <StepContent step={stepResult} stepDef={stepDef} filingUrl={filingUrl} />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Bear Case — always open */}
            {bearStep && (() => {
              const bearDef = RESEARCH_STEPS.find(s => s.id === 7)
              return (
                <div style={{ borderBottom: '1px solid var(--b1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '15px 4px' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--dn)', width: '24px', flexShrink: 0 }}>07</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--dn)', flex: 1 }}>
                      {bearDef?.name ?? 'Bear Case'}
                    </span>
                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--t3)' }}>Always visible</span>
                  </div>
                  <div style={{ padding: '0 4px 20px 4px' }}>
                    <StepContent step={bearStep} stepDef={bearDef ?? RESEARCH_STEPS[6]} filingUrl={filingUrl} />
                  </div>
                </div>
              )
            })()}
          </div>

          {/* === YOUR NOTES === */}
          <div>
            <div style={{
              fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '10px',
            }}>
              Your Notes
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Record your own thesis, entry price, conviction level…"
              style={{
                width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)',
                borderRadius: 'var(--r)', padding: '14px 16px', color: 'var(--t1)',
                fontSize: '13px', lineHeight: 1.7, resize: 'vertical', minHeight: '100px',
                outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--b2)')}
              onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
            />
          </div>

        </div>
      </div>
    </div>
  )
}
