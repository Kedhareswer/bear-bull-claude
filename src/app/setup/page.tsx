'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProviderSelector } from '@/components/ProviderSelector'
import { ModelSelector } from '@/components/ModelSelector'
import { PROVIDERS, type ProviderId } from '@/lib/providers'
import { getKey, getDataKey, saveDataKey } from '@/lib/key-store'
import { useResearchStore } from '@/store/research'

export default function SetupPage() {
  const router = useRouter()
  const setSetup = useResearchStore(s => s.setSetup)

  const [step, setStep] = useState<1 | 2>(1)
  const [provider, setProvider] = useState<ProviderId>('anthropic')
  const [model, setModel] = useState(() => PROVIDERS.find(p => p.id === 'anthropic')!.models[0].id)
  const [ticker, setTicker] = useState('')
  const [depth, setDepth] = useState<'quick' | 'full'>('full')
  const [avKey, setAvKey] = useState(() => {
    if (typeof window === 'undefined') return ''
    return getDataKey('alphavantage') ?? ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleProviderChange(id: ProviderId) {
    setProvider(id)
    setModel(PROVIDERS.find(p => p.id === id)!.models[0].id)
  }

  function handleNext() {
    const key = getKey(provider)
    if (!key) {
      setError('Enter your API key first')
      return
    }
    setError('')
    setStep(2)
  }

  async function handleStart() {
    if (!ticker.trim()) {
      setError('Enter a ticker symbol')
      return
    }
    const key = getKey(provider)
    if (!key) {
      setError('Go back and enter your API key')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/edgar?ticker=${encodeURIComponent(ticker.trim().toUpperCase())}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Company lookup failed (${res.status})`)
      }
      const data = await res.json()

      // Fetch live quote if Alpha Vantage key is present
      let quoteText = ''
      if (avKey.trim()) {
        try {
          const qRes = await fetch('/api/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker: ticker.trim().toUpperCase(), avKey: avKey.trim() }),
          })
          if (qRes.ok) {
            const qData = await qRes.json()
            quoteText = qData.quoteText ?? ''
          }
        } catch { /* quote is optional */ }
      }

      setSetup(ticker.trim().toUpperCase(), data.name, provider, model, depth, data.filingUrl ?? '')
      // Store filing data for research page
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('claude-bull-filing', JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          filingText: data.filingText ?? '',
          sections: data.sections ?? {},
          xbrlFacts: data.xbrlFacts ?? '',
          institutionalHolders: data.institutionalHolders ?? '',
          tenQText: data.tenQText ?? '',
          eightKText: data.eightKText ?? '',
          proxyText: data.proxyText ?? '',
          quoteText,
        }))
      }
      router.push('/research')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch company data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', padding: '0 24px',
        display: 'flex', flexDirection: 'column', gap: '32px', textAlign: 'center',
      }}>
        {/* Headline */}
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.4px', lineHeight: 1.3, marginBottom: '9px', color: 'var(--t1)' }}>
            Equity research,<br />grounded in filings.
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.65 }}>
            Reads 10-K and 10-Q end to end.<br />Every insight cites the exact paragraph.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--s1)', border: '1px solid var(--b1)',
          borderRadius: '10px', overflow: 'hidden', textAlign: 'left',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--b1)' }}>
            {[
              { num: step > 1 ? '✓' : '1', label: 'Provider', idx: 1 },
              { num: '2', label: 'Company', idx: 2 },
            ].map(t => (
              <div
                key={t.idx}
                style={{
                  flex: 1, padding: '11px 0', textAlign: 'center', fontSize: '12px',
                  color: step >= t.idx ? 'var(--t1)' : 'var(--t3)',
                  borderBottom: `1px solid ${step >= t.idx ? 'var(--t1)' : 'transparent'}`,
                  marginBottom: '-1px',
                  cursor: t.idx < step ? 'pointer' : 'default',
                }}
                onClick={() => { if (t.idx < step) setStep(t.idx as 1 | 2) }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '16px', height: '16px', borderRadius: '50%',
                  background: step >= t.idx ? (step === t.idx ? 'var(--t1)' : 'var(--t3)') : 'var(--s3)',
                  fontSize: '10px', marginRight: '5px',
                  color: step >= t.idx ? (step === t.idx ? 'var(--bg)' : 'var(--bg)') : 'var(--t3)',
                }}>
                  {t.num}
                </span>
                {t.label}
              </div>
            ))}
          </div>

          {/* Step 1: Provider */}
          {step === 1 && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ProviderSelector
                selectedProvider={provider}
                onProviderChange={handleProviderChange}
              />
              <ModelSelector
                provider={provider}
                selectedModel={model}
                onModelChange={setModel}
              />
              {error && (
                <div style={{ fontSize: '12px', color: 'var(--dn)' }}>{error}</div>
              )}
              <button
                onClick={handleNext}
                style={{
                  width: '100%', padding: '10px', background: 'var(--t1)', color: 'var(--bg)',
                  fontWeight: 500, fontSize: '13px', border: 'none',
                  borderRadius: 'var(--r)', cursor: 'pointer',
                }}
              >
                Next: Choose Company →
              </button>
            </div>
          )}

          {/* Step 2: Company */}
          {step === 2 && (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {/* Ticker input */}
              <div style={{ marginBottom: '6px', fontSize: '10px', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--t3)' }}>
                Ticker or Company Name
              </div>
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleStart() }}
                placeholder="AAPL, MSFT, NVDA, Tesla…"
                style={{
                  width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)',
                  borderRadius: 'var(--r)', padding: '10px 12px', color: 'var(--t1)',
                  fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--b2)')}
                onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
              />
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '6px', marginBottom: '20px' }}>
                We&apos;ll pull the latest 10-K and 10-Q from SEC EDGAR automatically.
              </div>

              {/* Depth toggle */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '8px' }}>
                  Research Depth
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {([
                    { id: 'quick' as const, name: 'Quick', desc: '3 core steps · ~$0.10' },
                    { id: 'full' as const, name: 'Full', desc: '9 steps + bear case · ~$0.40' },
                  ]).map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setDepth(opt.id)}
                      style={{
                        flex: 1, padding: '10px 12px', cursor: 'pointer',
                        background: depth === opt.id ? 'var(--s3)' : 'var(--s2)',
                        border: `1px solid ${depth === opt.id ? 'var(--b2)' : 'var(--b1)'}`,
                        borderRadius: 'var(--r)',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--t1)' }}>{opt.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alpha Vantage key (optional) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--t3)' }}>
                    Alpha Vantage Key
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--t3)', fontFamily: 'var(--font-mono)' }}>
                    optional
                  </span>
                  {avKey && (
                    <span style={{ fontSize: '10px', color: 'var(--up)', fontFamily: 'var(--font-mono)' }}>✓ Saved</span>
                  )}
                </div>
                <input
                  type="password"
                  value={avKey}
                  onChange={e => {
                    setAvKey(e.target.value)
                    if (e.target.value.trim()) saveDataKey('alphavantage', e.target.value.trim())
                  }}
                  placeholder="For live price · free at alphavantage.co"
                  autoComplete="off"
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--b1)',
                    borderRadius: 'var(--r)', padding: '10px 12px', color: 'var(--t1)',
                    fontFamily: 'var(--font-mono)', fontSize: '12px', outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--b2)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
                />
              </div>

              {error && (
                <div style={{ fontSize: '12px', color: 'var(--dn)', marginBottom: '8px' }}>{error}</div>
              )}

              <button
                onClick={handleStart}
                disabled={loading}
                style={{
                  width: '100%', padding: '10px', background: 'var(--t1)', color: 'var(--bg)',
                  fontWeight: 500, fontSize: '13px', border: 'none',
                  borderRadius: 'var(--r)', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Looking up company…' : 'Start Research →'}
              </button>
            </div>
          )}
        </div>

        {/* Trust line */}
        <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.8 }}>
          Key never leaves your device &nbsp;·&nbsp; SEC EDGAR only &nbsp;·&nbsp; ~$0.40 per analysis
        </div>
      </div>
    </div>
  )
}
