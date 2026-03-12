'use client'

import {
  renderMarkdown,
  extractMetrics,
  extractDataPoints,
  extractTrend,
  extractValuation,
} from '@/lib/parse-step'
import type { StepResult } from '@/store/research'
import type { ResearchStep } from '@/lib/research-steps'
import { STEP_DATA_SOURCES } from '@/lib/research-steps'

interface Props {
  step: StepResult
  stepDef: ResearchStep
  filingUrl?: string
}

function cleanContent(content: string): string {
  return content
    .replace(/KEY FINDING[:\s]+.+/gi, '')
    .replace(/METRICS:[^\n]+/gi, '')
    .replace(/STEP VERDICT[:\s]+.+/gi, '')
    .replace(/TREND:[^\n]+/gi, '')
    .replace(/VALUATION:[^\n]+/gi, '')
    .replace(/^\s*\d+[.)]\s*.+/gm, '') // remove numbered data points (shown separately)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function StepContent({ step, stepDef, filingUrl }: Props) {
  const isRunning = step.status === 'running'
  const isDone = step.status === 'done'
  const isError = step.status === 'error'

  if (isError) {
    return (
      <div style={{
        padding: '12px 14px', background: 'var(--s2)', border: '1px solid var(--b1)',
        borderRadius: 'var(--r)', fontSize: '13px', color: 'var(--dn)',
      }}>
        Step failed. Check your API key and try again.
      </div>
    )
  }

  if (!isRunning && !isDone) return null

  const metrics = isDone ? extractMetrics(step.content) : []
  const dataPoints = isDone ? extractDataPoints(step.content) : []
  const trend = isDone && stepDef.id === 3 ? extractTrend(step.content) : []
  const valuation = isDone && stepDef.id === 6 ? extractValuation(step.content) : null
  const prose = isDone ? cleanContent(step.content) : step.content

  const maxTrend = trend.length > 0 ? Math.max(...trend.map(t => t.raw)) : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Status bar */}
      {isRunning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px',
          background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r)',
          fontSize: '12px', color: 'var(--t2)',
        }}>
          <div style={{
            width: '5px', height: '5px', borderRadius: '50%', background: 'var(--t2)', flexShrink: 0,
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          Reading <em style={{ color: 'var(--t1)', fontStyle: 'normal', marginLeft: '4px' }}>
            {stepDef.sections}
          </em>
        </div>
      )}

      {/* Key Finding */}
      {isDone && step.keyFinding && (
        <div style={{
          padding: '14px 16px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 'var(--r)',
          borderLeft: `3px solid ${
            step.verdict === 'BULLISH' ? 'var(--up)' :
            step.verdict === 'BEARISH' ? 'var(--dn)' :
            'var(--b2)'
          }`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--t3)',
            }}>
              Key Finding
            </span>
            {step.verdict && (
              <span style={{
                fontSize: '9px', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                color: step.verdict === 'BULLISH' ? 'var(--up)' : step.verdict === 'BEARISH' ? 'var(--dn)' : 'var(--t3)',
                textTransform: 'uppercase',
              }}>
                {step.verdict}
              </span>
            )}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)', lineHeight: 1.55 }}>
            {step.keyFinding}
          </div>
        </div>
      )}

      {/* Metric chips */}
      {metrics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {metrics.map((m, i) => (
            <div key={i} style={{
              background: 'var(--s2)', border: '1px solid var(--b1)',
              borderRadius: '6px', padding: '8px 12px', minWidth: '90px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '3px', letterSpacing: '0.04em' }}>
                {m.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--t1)', fontFamily: 'var(--font-mono)' }}>
                  {m.value}
                </span>
                {m.delta && (
                  <span style={{
                    fontSize: '11px',
                    color: m.direction === 'up' ? 'var(--up)' : m.direction === 'down' ? 'var(--dn)' : 'var(--t3)',
                  }}>
                    {m.direction === 'up' ? '↑' : m.direction === 'down' ? '↓' : '→'} {m.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revenue trend chart (Step 3) */}
      {trend.length > 0 && (
        <div style={{
          background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', padding: '14px 16px',
        }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '12px' }}>
            Revenue Trend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {trend.map((bar, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {bar.label}
                </div>
                <div style={{ flex: 1, background: 'var(--s3)', borderRadius: '2px', height: '18px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    background: 'var(--t3)',
                    width: `${Math.max(4, (bar.raw / maxTrend) * 100)}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ width: '52px', fontSize: '11px', color: 'var(--t1)', fontFamily: 'var(--font-mono)', flexShrink: 0, textAlign: 'right' }}>
                  {bar.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valuation gauge (Step 6) */}
      {valuation && (
        <div style={{
          background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--r)', padding: '14px 16px',
        }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '12px' }}>
            Fair Value Range
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              ${valuation.fairLow}
            </span>
            <div style={{ flex: 1, position: 'relative', height: '8px', background: 'var(--s3)', borderRadius: '4px' }}>
              <div style={{
                position: 'absolute', left: '10%', right: '10%', top: 0, bottom: 0,
                background: 'var(--t3)', borderRadius: '4px', opacity: 0.6,
              }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              ${valuation.fairHigh}
            </span>
          </div>
          {valuation.pe && (
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '8px' }}>
              P/E: <span style={{ color: 'var(--t2)', fontFamily: 'var(--font-mono)' }}>{valuation.pe}</span>
            </div>
          )}
        </div>
      )}

      {/* Numbered data points */}
      {dataPoints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {dataPoints.map((dp, i) => {
            const cleanText = dp.text
              .replace(/^\s*\([↑↓→]\)\s*/, '')
              .replace(/^\s*[↑↓→]\s*/, '')
            return (
              <div key={i} style={{
                display: 'flex', gap: '10px', padding: '8px 10px',
                borderRadius: '5px',
                background: dp.direction === 'up'
                  ? 'var(--color-bullish-bg)'
                  : dp.direction === 'down'
                  ? 'var(--color-bearish-bg)'
                  : 'var(--s2)',
                borderLeft: `2px solid ${
                  dp.direction === 'up' ? 'var(--up)' :
                  dp.direction === 'down' ? 'var(--dn)' :
                  'var(--b1)'
                }`,
              }}>
                <span style={{
                  fontSize: '9px', flexShrink: 0, paddingTop: '3px',
                  color: dp.direction === 'up' ? 'var(--up)' : dp.direction === 'down' ? 'var(--dn)' : 'var(--t3)',
                }}>
                  {dp.direction === 'up' ? '▲' : dp.direction === 'down' ? '▼' : '●'}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.55 }}>
                  {cleanText}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Prose analysis */}
      {prose && (
        <div
          style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.75 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(prose) }}
        />
      )}

      {/* Data sources */}
      {isDone && (() => {
        const fed = STEP_DATA_SOURCES[stepDef.id] ?? []
        const aiCitations = step.citations.filter(c => !fed.some(f => c.includes(f.replace('10-K ', '').replace('10-Q ', ''))))
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {fed.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '5px' }}>
                  Data fed to this step
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {fed.map((src, i) => {
                    type Accent = { fg: string; bg: string; border: string }
                    const accent: Accent | null =
                      src.startsWith('XBRL')       ? { fg: 'var(--accent-xbrl)',  bg: 'var(--accent-xbrl-bg)',  border: 'var(--accent-xbrl-border)'  }
                      : src.startsWith('13F')       ? { fg: 'var(--accent-13f)',   bg: 'var(--accent-13f-bg)',   border: 'var(--accent-13f-border)'   }
                      : src.startsWith('DEF 14A')   ? { fg: 'var(--accent-proxy)', bg: 'var(--accent-proxy-bg)', border: 'var(--accent-proxy-border)' }
                      : src.startsWith('Live Quote') ? { fg: 'var(--accent-quote)', bg: 'var(--accent-quote-bg)', border: 'var(--accent-quote-border)' }
                      : src.startsWith('8-K')        ? { fg: 'var(--accent-8k)',   bg: 'var(--accent-8k-bg)',   border: 'var(--accent-8k-border)'   }
                      : null
                    return (
                      <span key={i} style={{
                        fontSize: '11px', fontFamily: 'var(--font-mono)',
                        color: accent ? accent.fg : 'var(--t2)',
                        background: accent ? accent.bg : 'var(--s2)',
                        border: `1px solid ${accent ? accent.border : 'var(--b1)'}`,
                        borderRadius: '4px', padding: '3px 8px',
                      }}>
                        {src}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            {aiCitations.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '5px' }}>
                  AI citations
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {aiCitations.map((c, i) => (
                    <span key={i} style={{
                      fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--t2)',
                      background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: '4px', padding: '3px 8px',
                    }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* SEC.gov filing link */}
      {isDone && filingUrl && (
        <div style={{ paddingTop: '4px' }}>
          <a
            href={filingUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '11px', color: 'var(--t3)', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', border: '1px solid var(--b1)', borderRadius: 'var(--r)',
              background: 'var(--s2)', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
          >
            ↗ View filing on SEC.gov
          </a>
        </div>
      )}
    </div>
  )
}
