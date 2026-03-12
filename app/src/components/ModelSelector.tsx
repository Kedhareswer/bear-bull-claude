'use client'

import { getProviderModels, type ProviderId } from '@/lib/providers'

interface ModelSelectorProps {
  provider: ProviderId
  selectedModel: string
  onModelChange: (model: string) => void
  className?: string
}

export function ModelSelector({ provider, selectedModel, onModelChange, className }: ModelSelectorProps) {
  const models = getProviderModels(provider)

  return (
    <div className={className}>
      <div style={{
        fontSize: '10px', fontWeight: 500, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '6px',
      }}>
        Model
      </div>
      <select
        value={selectedModel}
        onChange={e => onModelChange(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--s2)',
          border: '1px solid var(--b1)',
          borderRadius: 'var(--r)',
          padding: '9px 12px',
          color: 'var(--t1)',
          fontSize: '13px',
          fontFamily: 'var(--font-mono)',
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234c4c52'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '32px',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--b2)')}
        onBlur={e => (e.target.style.borderColor = 'var(--b1)')}
      >
        {models.map(m => (
          <option key={m.id} value={m.id} style={{ background: 'var(--s2)' }}>
            {m.label} · {m.contextK}K ctx
          </option>
        ))}
      </select>
    </div>
  )
}
