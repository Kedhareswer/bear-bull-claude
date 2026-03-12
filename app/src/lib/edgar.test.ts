import { describe, it, expect } from 'vitest'
import { buildSearchUrl, parseFilingHits } from './edgar'

describe('edgar', () => {
  it('builds correct search URL', () => {
    const url = buildSearchUrl('AAPL', '10-K')
    expect(url).toContain('AAPL')
    expect(url).toContain('10-K')
    expect(url).toContain('efts.sec.gov')
  })

  it('uppercases ticker in URL', () => {
    const url = buildSearchUrl('aapl', '10-K')
    expect(url).toContain('AAPL')
  })

  it('parses filing hits', () => {
    const mockHits = [{
      _source: {
        period_of_report: '2024-09-28',
        file_date: '2024-11-01',
        entity_name: 'Apple Inc.',
        form_type: '10-K',
        file_num: '000-00001',
        tickers: ['AAPL'],
      }
    }]
    const filings = parseFilingHits(mockHits)
    expect(filings).toHaveLength(1)
    expect(filings[0].period).toBe('2024-09-28')
    expect(filings[0].entityName).toBe('Apple Inc.')
    expect(filings[0].ticker).toBe('AAPL')
  })

  it('returns empty array for no hits', () => {
    expect(parseFilingHits([])).toEqual([])
  })
})
