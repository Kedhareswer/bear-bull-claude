const EDGAR_SEARCH = 'https://efts.sec.gov/LATEST/search-index'
const EDGAR_DATA   = 'https://data.sec.gov'
const USER_AGENT   = 'claude-bull research@claude-bull.app'

export interface Filing {
  accessionNumber: string
  period:     string
  filedAt:    string
  formType:   string
  ticker:     string
  entityName: string
}

export function buildSearchUrl(ticker: string, formType: '10-K' | '10-Q'): string {
  return `${EDGAR_SEARCH}?q=${encodeURIComponent(ticker.toUpperCase())}&forms=${formType}&dateRange=custom&startdt=2022-01-01`
}

export function parseFilingHits(hits: any[]): Filing[] {
  return hits.map(h => ({
    accessionNumber: h._source?.file_num ?? '',
    period:          h._source?.period_of_report ?? '',
    filedAt:         h._source?.file_date ?? '',
    formType:        h._source?.form_type ?? '',
    ticker:          h._source?.tickers?.[0] ?? '',
    entityName:      h._source?.entity_name ?? '',
  }))
}

export async function searchFilings(ticker: string, formType: '10-K' | '10-Q'): Promise<Filing[]> {
  const url = buildSearchUrl(ticker, formType)
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  })
  if (!res.ok) throw new Error(`EDGAR search failed: ${res.status}`)
  const data = await res.json()
  return parseFilingHits(data.hits?.hits ?? [])
}

export async function getCompanyInfo(ticker: string): Promise<{ name: string; cik: string } | null> {
  const url = `${EDGAR_SEARCH}?q=${encodeURIComponent(ticker.toUpperCase())}&forms=10-K&dateRange=custom&startdt=2022-01-01`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) return null
  const data = await res.json()
  const hit = data.hits?.hits?.[0]?._source
  if (!hit) return null
  return {
    name: hit.entity_name ?? ticker,
    cik:  hit.entity_id ?? '',
  }
}

export async function getFilingSummary(ticker: string): Promise<string> {
  const [annuals, quarters] = await Promise.all([
    searchFilings(ticker, '10-K'),
    searchFilings(ticker, '10-Q'),
  ])
  const recent = [...annuals.slice(0, 2), ...quarters.slice(0, 4)]
  return JSON.stringify(
    recent.map(f => ({ type: f.formType, period: f.period, filed: f.filedAt })),
    null, 2
  )
}
