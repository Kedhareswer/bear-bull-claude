import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock ai-client before importing route
vi.mock('@/lib/ai-client', () => ({
  createModel: vi.fn(() => 'mock-model'),
}))

// Mock research-steps
vi.mock('@/lib/research-steps', () => ({
  buildStepPrompt: vi.fn(() => 'step-prompt'),
  buildMemoPrompt: vi.fn(() => 'memo-prompt'),
}))

// Mock ai streamText — returns an object with a textStream async iterable
async function* emptyTextStream() { /* no chunks */ }
vi.mock('ai', () => ({
  streamText: vi.fn(() => ({ textStream: emptyTextStream() })),
}))

import { POST } from './route'
import { createModel } from '@/lib/ai-client'
import { buildStepPrompt, buildMemoPrompt } from '@/lib/research-steps'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/research', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validStepBody = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  apiKey: 'sk-ant-test-key',
  stepId: 3,
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  filingText: 'Some filing text here.',
}

const validMemoBody = {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: 'sk-openai-key',
  ticker: 'AAPL',
  companyName: 'Apple Inc.',
  stepResults: { '3': 'Financial analysis result', '6': 'Valuation result' },
  isMemo: true as const,
}

describe('POST /api/research', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(streamText).mockReturnValue({ textStream: emptyTextStream() } as unknown as ReturnType<typeof streamText>)
    vi.mocked(createModel).mockReturnValue('mock-model' as ReturnType<typeof createModel>)
    vi.mocked(buildStepPrompt).mockReturnValue('step-prompt')
    vi.mocked(buildMemoPrompt).mockReturnValue('memo-prompt')
  })

  it('returns 400 for empty body', async () => {
    const req = new NextRequest('http://localhost/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for missing required fields (no provider)', async () => {
    const body = { ...validStepBody }
    // @ts-expect-error intentional
    delete body.provider
    const req = makeRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid provider value', async () => {
    const body = { ...validStepBody, provider: 'fakeprovider' }
    const req = makeRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('calls createModel and streamText with correct args for valid step body', async () => {
    const req = makeRequest(validStepBody)
    const res = await POST(req)

    expect(createModel).toHaveBeenCalledWith('anthropic', 'claude-sonnet-4-6', 'sk-ant-test-key')
    expect(streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mock-model',
        messages: [{ role: 'user', content: 'step-prompt' }],
        maxOutputTokens: 2000,
      }),
    )
    expect(res.status).toBe(200)
  })

  it('calls buildMemoPrompt for valid memo body', async () => {
    const req = makeRequest(validMemoBody)
    await POST(req)

    expect(buildMemoPrompt).toHaveBeenCalledWith(
      'AAPL',
      'Apple Inc.',
      expect.objectContaining({ 3: 'Financial analysis result', 6: 'Valuation result' }),
    )
    expect(buildStepPrompt).not.toHaveBeenCalled()
  })

  it('returns 500 if streamText throws', async () => {
    vi.mocked(streamText).mockImplementation(() => {
      throw new Error('AI provider error')
    })
    const req = makeRequest(validStepBody)
    const res = await POST(req)
    expect(res.status).toBe(500)
    const text = await res.text()
    expect(text).toBe('AI provider error')
  })
})
