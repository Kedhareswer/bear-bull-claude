'use client'

import { useState, useEffect } from 'react'
import { PROVIDERS, type ProviderId } from '@/lib/providers'
import { saveKey, getKey, hasKey } from '@/lib/key-store'

interface ProviderSelectorProps {
  selectedProvider: ProviderId
  onProviderChange: (id: ProviderId) => void
  onKeyChange?: (key: string) => void
  className?: string
}

export function ProviderSelector({
  selectedProvider,
  onProviderChange,
  onKeyChange,
  className,
}: ProviderSelectorProps) {
  const [apiKey, setApiKey] = useState('')

  // Load saved key when provider changes
  useEffect(() => {
    const saved = getKey(selectedProvider)
    const val = saved ?? ''
    setApiKey(val)
    onKeyChange?.(val)
  }, [selectedProvider]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyChange(val: string) {
    setApiKey(val)
    if (val.trim()) saveKey(selectedProvider, val.trim())
    onKeyChange?.(val)
  }

  const provider = PROVIDERS.find(p => p.id === selectedProvider)!

  return (
    <div className={className}>
      {/* Provider selection pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => onProviderChange(p.id)}
            style={{
              padding: '6px 12px',
              background: p.id === selectedProvider ? 'var(--s3)' : 'var(--s2)',
              border: `1px solid ${p.id === selectedProvider ? 'var(--b2)' : 'var(--b1)'}`,
              borderRadius: '4px',
              color: p.id === selectedProvider ? 'var(--t1)' : 'var(--t3)',
              font: '12px var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* API key input */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--t3)',
            }}
          >
            API Key · {provider.label}
          </span>
          {hasKey(selectedProvider) && (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--up)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ✓ Saved
            </span>
          )}
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => handleKeyChange(e.target.value)}
          placeholder={provider.keyPlaceholder}
          autoComplete="off"
          style={{
            width: '100%',
            background: 'var(--s2)',
            border: '1px solid var(--b1)',
            borderRadius: 'var(--r)',
            padding: '10px 12px',
            color: 'var(--t1)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--b2)')}
          onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
        />
        <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '6px' }}>
          Stored locally · Never sent to a server ·{' '}
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--t2)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--b1)',
            }}
          >
            Get a key →
          </a>
        </div>
      </div>
    </div>
  )
}
