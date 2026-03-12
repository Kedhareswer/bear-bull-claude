import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Helper to build a NextRequest with query params
function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/edgar')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return new NextRequest(url.toString())
}

// Mock fetch at the global level
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper: build a mock Response
function mockResponse(body: unknown, status = 200): Response {
  const json = JSON.stringify(body)
  return new Response(json, {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockHtmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  })
}

// Default EFTS search result
const SEARCH_RESPONSE = {
  hits: {
    hits: [{
      _source: {
        entity_id: '0000320193',
        entity_name: 'Apple Inc.',
      }
    }]
  }
}

// Default submissions response
const SUBMISSIONS_RESPONSE = {
  name: 'Apple Inc.',
  filings: {
    recent: {
      form: ['10-K', '10-Q'],
      accessionNumber: ['0000320193-24-000123', '0000320193-24-000456'],
      filingDate: ['2024-11-01', '2024-08-02'],
      reportDate: ['2024-09-28', '2024-06-29'],
    }
  }
}

// Default filing index response
const INDEX_RESPONSE = {
  directory: {
    item: [
      { name: 'aapl-20240928.htm', type: '10-K' },
      { name: 'exhibit31.htm', type: 'EX-31' },
    ]
  }
}

import { GET } from './route'

describe('GET /api/edgar', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns 400 if ticker query param is missing', async () => {
    const req = makeReq()
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/ticker required/i)
  })

  it('returns 404 if EDGAR returns no hits', async () => {
    // EFTS search returns empty hits
    mockFetch.mockResolvedValueOnce(
      mockResponse({ hits: { hits: [] } })
    )
    const req = makeReq({ ticker: 'UNKNOWN' })
    const res = await GET(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/no filings found/i)
  })

  it('returns correct response shape on successful flow', async () => {
    // Call 1: EFTS search
    mockFetch.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE))
    // Call 2: submissions
    mockFetch.mockResolvedValueOnce(mockResponse(SUBMISSIONS_RESPONSE))
    // Call 3: filing index
    mockFetch.mockResolvedValueOnce(mockResponse(INDEX_RESPONSE))
    // Call 4: filing document HTML
    mockFetch.mockResolvedValueOnce(
      mockHtmlResponse('<html><body><p>Annual report content.</p></body></html>')
    )

    const req = makeReq({ ticker: 'AAPL' })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveProperty('name', 'Apple Inc.')
    expect(body).toHaveProperty('cik', '320193')
    expect(body).toHaveProperty('filingText')
    expect(typeof body.filingText).toBe('string')
    expect(body.filingText.length).toBeGreaterThan(0)
    expect(body).toHaveProperty('filedAt', '2024-11-01')
    expect(body).toHaveProperty('filings')
    expect(Array.isArray(body.filings)).toBe(true)
    expect(body.filings[0]).toMatchObject({ type: '10-K' })
  })

  it('returns 500 if EDGAR fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))

    const req = makeReq({ ticker: 'AAPL' })
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Network failure/)
  })

  it('strips HTML tags from filing text', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE))
    mockFetch.mockResolvedValueOnce(mockResponse(SUBMISSIONS_RESPONSE))
    mockFetch.mockResolvedValueOnce(mockResponse(INDEX_RESPONSE))
    mockFetch.mockResolvedValueOnce(
      mockHtmlResponse('<html><body><h1>Title</h1><p>Plain text content here.</p><script>evil()</script></body></html>')
    )

    const req = makeReq({ ticker: 'AAPL' })
    const res = await GET(req)
    const body = await res.json()

    expect(body.filingText).not.toContain('<html>')
    expect(body.filingText).not.toContain('<script>')
    expect(body.filingText).toContain('Plain text content here')
  })

  it('truncates filing text to 40000 characters', async () => {
    const longHtml = '<p>' + 'x'.repeat(100000) + '</p>'
    mockFetch.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE))
    mockFetch.mockResolvedValueOnce(mockResponse(SUBMISSIONS_RESPONSE))
    mockFetch.mockResolvedValueOnce(mockResponse(INDEX_RESPONSE))
    mockFetch.mockResolvedValueOnce(mockHtmlResponse(longHtml))

    const req = makeReq({ ticker: 'AAPL' })
    const res = await GET(req)
    const body = await res.json()

    expect(body.filingText.length).toBeLessThanOrEqual(40000)
  })

  it('returns 404 if submissions has no 10-K in filing list', async () => {
    const noTenKSubs = {
      name: 'Some Corp.',
      filings: {
        recent: {
          form: ['10-Q', '8-K'],
          accessionNumber: ['0000999999-24-000001', '0000999999-24-000002'],
          filingDate: ['2024-08-01', '2024-05-01'],
          reportDate: ['2024-06-30', '2024-03-31'],
        }
      }
    }
    mockFetch.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE))
    mockFetch.mockResolvedValueOnce(mockResponse(noTenKSubs))

    const req = makeReq({ ticker: 'CORP' })
    const res = await GET(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/no 10-k found/i)
  })

  it('falls back gracefully when filing index fetch fails', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(SEARCH_RESPONSE))
    mockFetch.mockResolvedValueOnce(mockResponse(SUBMISSIONS_RESPONSE))
    // Index fetch fails
    mockFetch.mockRejectedValueOnce(new Error('index not found'))

    const req = makeReq({ ticker: 'AAPL' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.filingText).toContain('Full document unavailable')
  })
})
