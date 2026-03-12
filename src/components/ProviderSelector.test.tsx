import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProviderSelector } from './ProviderSelector'

// Mock key-store
vi.mock('@/lib/key-store', () => ({
  saveKey: vi.fn(),
  getKey: vi.fn().mockReturnValue(null),
  hasKey: vi.fn().mockReturnValue(false),
}))

import { saveKey, getKey, hasKey } from '@/lib/key-store'

const mockSaveKey = vi.mocked(saveKey)
const mockGetKey = vi.mocked(getKey)
const mockHasKey = vi.mocked(hasKey)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetKey.mockReturnValue(null)
  mockHasKey.mockReturnValue(false)
})

describe('ProviderSelector', () => {
  it('renders all 5 provider buttons', () => {
    render(
      <ProviderSelector
        selectedProvider="anthropic"
        onProviderChange={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: 'Anthropic' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OpenAI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Google' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Groq' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OpenRouter' })).toBeInTheDocument()
  })

  it('calls onProviderChange with the correct provider ID when a card is clicked', () => {
    const onProviderChange = vi.fn()

    render(
      <ProviderSelector
        selectedProvider="anthropic"
        onProviderChange={onProviderChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'OpenAI' }))
    expect(onProviderChange).toHaveBeenCalledWith('openai')

    fireEvent.click(screen.getByRole('button', { name: 'Google' }))
    expect(onProviderChange).toHaveBeenCalledWith('google')

    fireEvent.click(screen.getByRole('button', { name: 'Groq' }))
    expect(onProviderChange).toHaveBeenCalledWith('groq')

    fireEvent.click(screen.getByRole('button', { name: 'OpenRouter' }))
    expect(onProviderChange).toHaveBeenCalledWith('openrouter')
  })

  it('calls onKeyChange with the new value when typing in the API key input', () => {
    const onKeyChange = vi.fn()

    render(
      <ProviderSelector
        selectedProvider="anthropic"
        onProviderChange={() => {}}
        onKeyChange={onKeyChange}
      />
    )

    // password inputs have role="textbox" hidden; query by type instead
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement

    fireEvent.change(passwordInput, { target: { value: 'sk-ant-test-key' } })
    expect(onKeyChange).toHaveBeenCalledWith('sk-ant-test-key')
  })

  it('loads saved key on mount via getKey', () => {
    mockGetKey.mockReturnValue('sk-ant-saved-key')
    const onKeyChange = vi.fn()

    render(
      <ProviderSelector
        selectedProvider="anthropic"
        onProviderChange={() => {}}
        onKeyChange={onKeyChange}
      />
    )

    expect(mockGetKey).toHaveBeenCalledWith('anthropic')
    expect(onKeyChange).toHaveBeenCalledWith('sk-ant-saved-key')

    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    expect(passwordInput.value).toBe('sk-ant-saved-key')
  })

  it('calls saveKey when the API key input value changes to a non-empty value', () => {
    render(
      <ProviderSelector
        selectedProvider="openai"
        onProviderChange={() => {}}
      />
    )

    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    fireEvent.change(passwordInput, { target: { value: 'sk-new-key' } })

    expect(mockSaveKey).toHaveBeenCalledWith('openai', 'sk-new-key')
  })
})
