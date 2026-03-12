export interface Metric {
  label: string
  value: string
  delta: string
  direction: 'up' | 'down' | 'flat'
}

export interface DataPoint {
  num: number
  text: string
  direction: 'up' | 'down' | 'neutral'
}

export interface TrendBar {
  label: string  // e.g. "FY24"
  value: string  // e.g. "$391B"
  raw: number    // numeric for bar width calc
}

export interface ValuationData {
  pe: string
  fairLow: number
  fairHigh: number
}

// Extracts METRICS: line → array of Metric objects
export function extractMetrics(content: string): Metric[] {
  const m = content.match(/METRICS:\s*(.+?)(?:\n|$)/i)
  if (!m) return []
  return m[1].split(',').map(chunk => {
    chunk = chunk.trim()
    // Format: Label=Value(delta)direction
    const itemMatch = chunk.match(/^([^=]+)=([^(↑↓→]+)(?:\(([^)]*)\))?([↑↓→]?)/)
    if (!itemMatch) return null
    const dir = itemMatch[4] === '↑' ? 'up' : itemMatch[4] === '↓' ? 'down' : 'flat'
    return {
      label: itemMatch[1].trim(),
      value: itemMatch[2].trim(),
      delta: itemMatch[3]?.trim() ?? '',
      direction: dir,
    } as Metric
  }).filter((x): x is Metric => x !== null)
}

// Extracts numbered data points from the content
export function extractDataPoints(content: string): DataPoint[] {
  const results: DataPoint[] = []
  // Remove KEY FINDING line and METRICS line to avoid false matches
  const cleaned = content
    .replace(/KEY FINDING[:\s]+.+/i, '')
    .replace(/METRICS:[^\n]+/i, '')
    .replace(/STEP VERDICT[:\s]+.+/i, '')
    .replace(/TREND:[^\n]+/i, '')
    .replace(/VALUATION:[^\n]+/i, '')

  const lines = cleaned.split('\n')
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)[.)]\s*(.+)/)
    if (!m) continue
    const text = m[2].trim()
    const dir = text.includes('(↑)') || text.includes('↑') ? 'up'
      : text.includes('(↓)') || text.includes('↓') ? 'down'
      : 'neutral'
    results.push({ num: parseInt(m[1]), text, direction: dir })
  }
  return results
}

// Extracts TREND: line → array of TrendBar for a bar chart
export function extractTrend(content: string): TrendBar[] {
  const m = content.match(/TREND:\s*(.+?)(?:\n|$)/i)
  if (!m) return []
  const bars: TrendBar[] = []
  const parts = m[1].match(/FY\d{2,4}=\$[\d.]+[BMK]?/gi) ?? []
  for (const part of parts) {
    const pm = part.match(/(FY\d{2,4})=\$?([\d.]+)([BMK]?)/i)
    if (!pm) continue
    const multiplier = pm[3].toUpperCase() === 'B' ? 1 : pm[3].toUpperCase() === 'M' ? 0.001 : 1
    bars.push({ label: pm[1], value: `$${pm[2]}${pm[3]}`, raw: parseFloat(pm[2]) * multiplier })
  }
  return bars
}

// Extracts VALUATION: line
export function extractValuation(content: string): ValuationData | null {
  const m = content.match(/VALUATION:\s*(.+?)(?:\n|$)/i)
  if (!m) return null
  const pe = m[1].match(/pe=([\d.]+x?)/i)?.[1] ?? ''
  const lo = parseFloat(m[1].match(/fair_low=\$?([\d.]+)/i)?.[1] ?? '0')
  const hi = parseFloat(m[1].match(/fair_high=\$?([\d.]+)/i)?.[1] ?? '0')
  if (!lo && !hi) return null
  return { pe, fairLow: lo, fairHigh: hi }
}

export function extractKeyFinding(content: string): string {
  const m = content.match(/KEY FINDING[:\s]+(.+?)(?:\n|$)/i)
  return m ? m[1].trim() : ''
}

export function extractVerdict(content: string): 'BULLISH' | 'NEUTRAL' | 'BEARISH' | null {
  const m = content.match(/STEP VERDICT[:\s]+(BULLISH|NEUTRAL|BEARISH)/i)
  if (!m) return null
  return m[1].toUpperCase() as 'BULLISH' | 'NEUTRAL' | 'BEARISH'
}

// Matches: [10-K §7], [10-Q §2], [XBRL], [XBRL Facts], [13F], [13F Filings], [DEF 14A], [Proxy], [Synthesis]
const CITATION_RE = /\[(10-[KQ]\s*§[\d.A-Za-z]+[^\]]*|XBRL[^\]]*|13F[^\]]*|DEF\s*14A[^\]]*|Proxy[^\]]*|Synthesis[^\]]*)\]/gi

export function extractCitations(content: string): string[] {
  const matches = content.matchAll(CITATION_RE)
  return [...new Set([...matches].map(m => m[0]))]
}

function processInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--t1);font-weight:500">$1</strong>')
    .replace(
      new RegExp(CITATION_RE.source, 'gi'),
      (_, inner) => `<span style="font-family:var(--font-mono);font-size:10px;color:var(--t3);background:var(--s3);border:1px solid var(--b1);border-radius:3px;padding:1px 5px;margin:0 2px;white-space:nowrap;vertical-align:middle">${inner}</span>`
    )
}

export function renderMarkdown(text: string): string {
  // 1. Escape raw HTML
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 2. Split into paragraphs on double newlines
  const paragraphs = escaped.split(/\n{2,}/).filter(p => p.trim())

  if (paragraphs.length === 0) return ''

  return paragraphs
    .map(para => {
      const inner = para
        .replace(/\n/g, '<br>')
        .trim()
      return `<p style="margin:0 0 0.9em;line-height:1.75">${processInline(inner)}</p>`
    })
    .join('')
}
