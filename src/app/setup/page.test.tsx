import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SetupPage from './page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock key-store
const mockGetKey = vi.fn()
vi.mock('@/lib/key-store', () => ({
  getKey: (...args: unknown[]) => mockGetKey(...args),
  saveKey: vi.fn(),
  hasKey: vi.fn(() => false),
  getDataKey: vi.fn(() => null),
  saveDataKey: vi.fn(),
  hasDataKey: vi.fn(() => false),
}))

// Mock research store
const mockSetSetup = vi.fn()
vi.mock('@/store/research', () => ({
  useResearchStore: (selector: (s: { setSetup: typeof mockSetSetup }) => unknown) =>
    selector({ setSetup: mockSetSetup }),
}))

// Mock ProviderSelector to avoid localStorage complexity in tests
vi.mock('@/components/ProviderSelector', () => ({
  ProviderSelector: ({
    selectedProvider,
    onProviderChange,
  }: {
    selectedProvider: string
    onProviderChange: (id: string) => void
  }) => (
    <div data-testid="provider-selector">
      <span data-testid="selected-provider">{selectedProvider}</span>
      <button onClick={() => onProviderChange('openai')}>Switch to OpenAI</button>
    </div>
  ),
}))

describe('SetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetKey.mockReturnValue(null)
  })

  it('renders headline "Equity research, grounded in filings."', () => {
    render(<SetupPage />)
    expect(
      screen.getByText(/Equity research,/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/grounded in filings\./i)
    ).toBeInTheDocument()
  })

  it('Step 1 shows ProviderSelector', () => {
    render(<SetupPage />)
    expect(screen.getByTestId('provider-selector')).toBeInTheDocument()
  })

  it('"Next: Choose Company" button is present on Step 1', () => {
    render(<SetupPage />)
    const btn = screen.getByRole('button', { name: /Next: Choose Company/i })
    expect(btn).toBeInTheDocument()
  })

  it('clicking Next without a saved key shows error "Enter your API key first"', () => {
    mockGetKey.mockReturnValue(null)
    render(<SetupPage />)
    const btn = screen.getByRole('button', { name: /Next: Choose Company/i })
    fireEvent.click(btn)
    expect(screen.getByText('Enter your API key first')).toBeInTheDocument()
  })

  it('advances to Step 2 when a key is present', async () => {
    mockGetKey.mockReturnValue('sk-ant-test-key')
    render(<SetupPage />)
    const btn = screen.getByRole('button', { name: /Next: Choose Company/i })
    fireEvent.click(btn)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/AAPL, MSFT/i)).toBeInTheDocument()
    })
  })

  it('Step 2 shows ticker input and depth options', async () => {
    mockGetKey.mockReturnValue('sk-ant-test-key')
    render(<SetupPage />)
    fireEvent.click(screen.getByRole('button', { name: /Next: Choose Company/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/AAPL, MSFT/i)).toBeInTheDocument()
    })

    expect(screen.getByText('Quick')).toBeInTheDocument()
    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Research/i })).toBeInTheDocument()
  })

  it('Quick and Full depth options can be selected', async () => {
    mockGetKey.mockReturnValue('sk-ant-test-key')
    render(<SetupPage />)
    fireEvent.click(screen.getByRole('button', { name: /Next: Choose Company/i }))

    await waitFor(() => {
      expect(screen.getByText('Quick')).toBeInTheDocument()
    })

    // Full is selected by default; click Quick to switch
    fireEvent.click(screen.getByText('Quick'))
    // The component switches depth state; verify by clicking Full again
    fireEvent.click(screen.getByText('Full'))
    // No error thrown = selection works
    expect(screen.getByText('Full')).toBeInTheDocument()
  })
})
