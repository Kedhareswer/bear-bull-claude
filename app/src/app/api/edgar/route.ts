import { NextRequest, NextResponse } from 'next/server'

const UA = 'claude-bull research@claude-bull.app'
const hdrs = { 'User-Agent': UA, 'Accept': 'application/json' }

async function edgarFetch(url: string, acceptHtml = false) {
  const headers = acceptHtml
    ? { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' }
    : hdrs
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`EDGAR ${url} → ${res.status}`)
  return res
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

// Parse stripped 10-K text into named sections by finding Item headings.
// For each item key, picks the occurrence with the MOST content after it
// (real section >> TOC reference in character count).
function parseSections(html: string): Record<string, string> {
  const text = stripHtml(html)

  const patterns: Array<{ key: string; regex: RegExp }> = [
    { key: 'item1',  regex: /ITEM\s+1[.:\s]{1,5}BUSINESS/gi },
    { key: 'item1a', regex: /ITEM\s+1A[.:\s]{1,5}RISK\s+FACTOR/gi },
    { key: 'item2',  regex: /ITEM\s+2[.:\s]{1,5}PROPERT/gi },
    { key: 'item3',  regex: /ITEM\s+3[.:\s]{1,5}LEGAL/gi },
    { key: 'item7',  regex: /ITEM\s+7[.:\s]{1,5}MANAGEMENT/gi },
    { key: 'item7a', regex: /ITEM\s+7A[.:\s]/gi },
    { key: 'item8',  regex: /ITEM\s+8[.:\s]{1,5}FINANCIAL\s+STATEMENT/gi },
    { key: 'item9',  regex: /ITEM\s+9[.:\s]/gi },
    { key: 'item10', regex: /ITEM\s+10[.:\s]/gi },
    { key: 'item11', regex: /ITEM\s+11[.:\s]/gi },
    { key: 'item12', regex: /ITEM\s+12[.:\s]/gi },
    { key: 'item13', regex: /ITEM\s+13[.:\s]/gi },
  ]

  const allPositions: Array<{ key: string; pos: number }> = []
  for (const { key, regex } of patterns) {
    regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      allPositions.push({ key, pos: match.index })
    }
  }
  allPositions.sort((a, b) => a.pos - b.pos)

  const candidates: Record<string, { pos: number; length: number }> = {}
  for (let i = 0; i < allPositions.length; i++) {
    const { key, pos } = allPositions[i]
    const end = allPositions[i + 1]?.pos ?? text.length
    const length = end - pos
    if (!candidates[key] || length > candidates[key].length) {
      candidates[key] = { pos, length }
    }
  }

  const sections: Record<string, string> = {}
  for (const [key, { pos, length }] of Object.entries(candidates)) {
    if (length > 200) {
      sections[key] = text.slice(pos, pos + Math.min(length, 28000))
    }
  }
  return sections
}

// Fetch XBRL company facts and return a compact financial summary string
async function fetchXbrlFacts(cikPadded: string): Promise<string> {
  try {
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded}.json`
    const res = await edgarFetch(url)
    const data = await res.json()
    const usgaap = data.facts?.['us-gaap'] ?? {}

    type XbrlEntry = { form: string; fp: string; val: number; end: string }

    function getAnnual(tags: string[], unit = 'USD'): XbrlEntry[] {
      for (const tag of tags) {
        const entries: XbrlEntry[] | undefined = usgaap[tag]?.units?.[unit]
        if (entries && entries.length > 0) {
          return entries
            .filter(e => e.form === '10-K' && e.fp === 'FY')
            .sort((a, b) => b.end.localeCompare(a.end))
            .slice(0, 4)
            .reverse()
        }
      }
      return []
    }

    function fmtUSD(v: number): string {
      if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
      if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
      return `$${v.toLocaleString()}`
    }

    const metrics: Array<{ label: string; tags: string[]; unit?: string; fmt?: (v: number) => string }> = [
      { label: 'Revenue', tags: ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'] },
      { label: 'Gross Profit', tags: ['GrossProfit'] },
      { label: 'Operating Income', tags: ['OperatingIncomeLoss'] },
      { label: 'Net Income', tags: ['NetIncomeLoss'] },
      { label: 'EPS (diluted)', tags: ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], unit: 'USD/shares', fmt: v => `$${v.toFixed(2)}` },
      { label: 'Cash & Equivalents', tags: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsAndShortTermInvestments'] },
      { label: 'Long-term Debt', tags: ['LongTermDebt', 'LongTermDebtNoncurrent'] },
      { label: 'Total Assets', tags: ['Assets'] },
    ]

    const lines: string[] = ['=== XBRL FINANCIAL FACTS (exact SEC-reported figures, no estimation) ===']
    for (const m of metrics) {
      const unit = m.unit ?? 'USD'
      const fmt = m.fmt ?? fmtUSD
      const entries = getAnnual(m.tags, unit)
      if (entries.length === 0) continue
      const series = entries.map(e => `${e.end.slice(0, 4)}: ${fmt(e.val)}`).join('  |  ')
      lines.push(`${m.label}: ${series}`)
    }

    if (lines.length <= 1) return ''
    return lines.join('\n')
  } catch {
    return ''
  }
}

// Fetch recent 13F institutional filers that have mentioned this ticker
async function fetchInstitutionalHolders(ticker: string): Promise<string> {
  try {
    const startYear = new Date().getFullYear() - 1
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(ticker)}%22&forms=13F-HR&dateRange=custom&startdt=${startYear}-01-01`
    const res = await edgarFetch(url)
    const data = await res.json()
    const hits: Array<{ _source?: { entity_name?: string; file_date?: string } }> = data.hits?.hits ?? []

    const seen = new Set<string>()
    const holders: string[] = []
    for (const hit of hits) {
      const name = hit._source?.entity_name
      const date = hit._source?.file_date
      if (name && !seen.has(name)) {
        seen.add(name)
        holders.push(`• ${name}${date ? ` (filed ${date.slice(0, 7)})` : ''}`)
      }
      if (holders.length >= 12) break
    }

    if (holders.length === 0) return ''
    return `=== INSTITUTIONAL 13F FILERS (recent filings mentioning ${ticker}) ===\n` + holders.join('\n')
  } catch {
    return ''
  }
}

interface EdgarItem { type?: string; name?: string }

async function fetchFilingHtml(
  cik: string,
  accNoDashes: string,
  accessionNumber: string,
  formType: string,
): Promise<{ mainDocName: string; html: string }> {
  let mainDocName = ''
  try {
    const indexUrl = `https://data.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${accessionNumber}-index.json`
    const idxRes = await edgarFetch(indexUrl)
    const idxData = await idxRes.json()
    const docs: EdgarItem[] = idxData.directory?.item ?? []
    const mainDoc = docs.find(d => d.type === formType && (d.name?.endsWith('.htm') || d.name?.endsWith('.html')))
      ?? docs.find(d => d.name?.endsWith('.htm') || d.name?.endsWith('.html'))
    mainDocName = mainDoc?.name ?? ''
  } catch {
    return { mainDocName: '', html: '' }
  }

  if (!mainDocName) return { mainDocName, html: '' }

  try {
    const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes}/${mainDocName}`
    const docRes = await edgarFetch(docUrl, true)
    const html = await docRes.text()
    return { mainDocName, html }
  } catch {
    return { mainDocName, html: '' }
  }
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase()
  if (!ticker) {
    return NextResponse.json({ error: 'ticker required' }, { status: 400 })
  }

  try {
    // Step 1: Search EFTS for CIK
    const searchUrl = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(ticker)}&forms=10-K&dateRange=custom&startdt=2020-01-01`
    const searchRes = await edgarFetch(searchUrl)
    const searchData = await searchRes.json()
    const firstHit = searchData.hits?.hits?.[0]?._source
    if (!firstHit) {
      return NextResponse.json({ error: `No filings found for ${ticker}` }, { status: 404 })
    }

    const rawCik: string = String(firstHit.entity_id ?? firstHit.ciks?.[0] ?? '')
    const cik = rawCik.replace(/^0+/, '')
    const cikPadded = cik.padStart(10, '0')

    // Step 2: Fetch submissions
    const submissionsUrl = `https://data.sec.gov/submissions/CIK${cikPadded}.json`
    const subRes = await edgarFetch(submissionsUrl)
    const subData = await subRes.json()
    const companyName: string = subData.name ?? firstHit.entity_name ?? ticker

    const recentFilings = subData.filings?.recent ?? {}
    const forms: string[] = recentFilings.form ?? []
    const accessions: string[] = recentFilings.accessionNumber ?? []
    const dates: string[] = recentFilings.filingDate ?? []

    const tenKIdx = forms.findIndex((f: string) => f === '10-K')
    if (tenKIdx === -1) {
      return NextResponse.json({ error: `No 10-K found for ${ticker}` }, { status: 404 })
    }

    const tenKAccession = accessions[tenKIdx]
    const filedAt = dates[tenKIdx] ?? ''
    const tenKAccNoDashes = tenKAccession.replace(/-/g, '')

    const tenQIdx = forms.findIndex((f: string) => f === '10-Q')
    const tenQAccession = tenQIdx >= 0 ? accessions[tenQIdx] : null
    const tenQAccNoDashes = tenQAccession?.replace(/-/g, '') ?? null

    // Find 8-K and DEF 14A accession numbers
    const eightKIdx = forms.findIndex((f: string) => f === '8-K')
    const eightKAccession = eightKIdx >= 0 ? accessions[eightKIdx] : null
    const eightKAccNoDashes = eightKAccession?.replace(/-/g, '') ?? null

    const def14aIdx = forms.findIndex((f: string) => f === 'DEF 14A')
    const def14aAccession = def14aIdx >= 0 ? accessions[def14aIdx] : null
    const def14aAccNoDashes = def14aAccession?.replace(/-/g, '') ?? null

    // Fetch all filings, XBRL facts, and 13F holders in parallel
    const [tenKResult, tenQResult, eightKResult, def14aResult, xbrlFacts, institutionalHolders] = await Promise.all([
      fetchFilingHtml(cik, tenKAccNoDashes, tenKAccession, '10-K'),
      tenQAccNoDashes && tenQAccession
        ? fetchFilingHtml(cik, tenQAccNoDashes, tenQAccession, '10-Q')
        : Promise.resolve({ mainDocName: '', html: '' }),
      eightKAccNoDashes && eightKAccession
        ? fetchFilingHtml(cik, eightKAccNoDashes, eightKAccession, '8-K')
        : Promise.resolve({ mainDocName: '', html: '' }),
      def14aAccNoDashes && def14aAccession
        ? fetchFilingHtml(cik, def14aAccNoDashes, def14aAccession, 'DEF 14A')
        : Promise.resolve({ mainDocName: '', html: '' }),
      fetchXbrlFacts(cikPadded),
      fetchInstitutionalHolders(ticker),
    ])

    // Parse 10-K into sections and flat fallback text
    let sections: Record<string, string> = {}
    let filingText = ''
    if (tenKResult.html) {
      sections = parseSections(tenKResult.html)
      filingText = stripHtml(tenKResult.html).slice(0, 40000)
    } else {
      filingText = `[Company: ${companyName}, Ticker: ${ticker}, Filed: ${filedAt}. Full document unavailable.]`
    }

    const tenQText = tenQResult.html ? stripHtml(tenQResult.html).slice(0, 35000) : ''
    const eightKText = eightKResult.html ? stripHtml(eightKResult.html).slice(0, 25000) : ''
    const proxyText = def14aResult.html ? stripHtml(def14aResult.html).slice(0, 30000) : ''

    const filingUrl = tenKResult.mainDocName
      ? `https://www.sec.gov/Archives/edgar/data/${cik}/${tenKAccNoDashes}/${tenKResult.mainDocName}`
      : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikPadded}&type=10-K`

    const filings = [
      { type: '10-K', period: recentFilings.reportDate?.[tenKIdx] ?? '', filed: filedAt },
      ...(tenQIdx >= 0 ? [{ type: '10-Q', period: recentFilings.reportDate?.[tenQIdx] ?? '', filed: dates[tenQIdx] ?? '' }] : []),
      ...(eightKIdx >= 0 ? [{ type: '8-K', period: '', filed: dates[eightKIdx] ?? '' }] : []),
      ...(def14aIdx >= 0 ? [{ type: 'DEF 14A', period: '', filed: dates[def14aIdx] ?? '' }] : []),
    ]

    return NextResponse.json({
      name: companyName,
      cik,
      filingText,           // backwards compat flat text
      sections,             // targeted section text per Item
      xbrlFacts,            // exact XBRL financial figures
      institutionalHolders, // recent 13F filer names
      tenQText,             // latest 10-Q text for Step 8
      eightKText,           // latest 8-K earnings press release
      proxyText,            // latest DEF 14A proxy statement
      filedAt,
      filings,
      filingUrl,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'EDGAR fetch failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
