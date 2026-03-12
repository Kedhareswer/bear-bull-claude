import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ModelSelector } from './ModelSelector'
import { PROVIDERS } from '@/lib/providers'

describe('ModelSelector', () => {
  it('renders a select element', () => {
    const anthropicModels = PROVIDERS.find(p => p.id === 'anthropic')!.models
    render(
      <ModelSelector
        provider="anthropic"
        selectedModel={anthropicModels[0].id}
        onModelChange={() => {}}
      />
    )
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('select has options matching the models for the given provider', () => {
    const anthropicModels = PROVIDERS.find(p => p.id === 'anthropic')!.models
    render(
      <ModelSelector
        provider="anthropic"
        selectedModel={anthropicModels[0].id}
        onModelChange={() => {}}
      />
    )
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(anthropicModels.length)
    anthropicModels.forEach((m, i) => {
      expect(options[i]).toHaveValue(m.id)
      expect(options[i].textContent).toContain(m.label)
      expect(options[i].textContent).toContain(`${m.contextK}K ctx`)
    })
  })

  it('calls onModelChange when an option is selected', () => {
    const anthropicModels = PROVIDERS.find(p => p.id === 'anthropic')!.models
    const onModelChange = vi.fn()
    render(
      <ModelSelector
        provider="anthropic"
        selectedModel={anthropicModels[0].id}
        onModelChange={onModelChange}
      />
    )
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: anthropicModels[1].id } })
    expect(onModelChange).toHaveBeenCalledWith(anthropicModels[1].id)
  })

  it('updates options when provider prop changes', () => {
    const anthropicModels = PROVIDERS.find(p => p.id === 'anthropic')!.models
    const openaiModels = PROVIDERS.find(p => p.id === 'openai')!.models

    const { rerender } = render(
      <ModelSelector
        provider="anthropic"
        selectedModel={anthropicModels[0].id}
        onModelChange={() => {}}
      />
    )

    let options = screen.getAllByRole('option')
    expect(options).toHaveLength(anthropicModels.length)

    rerender(
      <ModelSelector
        provider="openai"
        selectedModel={openaiModels[0].id}
        onModelChange={() => {}}
      />
    )

    options = screen.getAllByRole('option')
    expect(options).toHaveLength(openaiModels.length)
    openaiModels.forEach((m, i) => {
      expect(options[i]).toHaveValue(m.id)
    })
  })
})
