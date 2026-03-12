export function extractKeyFinding(content: string): string {
  const m = content.match(/KEY FINDING[:\s]+(.+?)(?:\n|$)/i)
  return m ? m[1].trim() : ''
}

export function extractVerdict(content: string): 'BULLISH' | 'NEUTRAL' | 'BEARISH' | null {
  const m = content.match(/STEP VERDICT[:\s]+(BULLISH|NEUTRAL|BEARISH)/i)
  if (!m) return null
  return m[1].toUpperCase() as 'BULLISH' | 'NEUTRAL' | 'BEARISH'
}

export function extractCitations(content: string): string[] {
  const matches = content.matchAll(/\[10-[KQ]\s*§[\d.A-Za-z]+[^\]]*\]/g)
  return [...new Set([...matches].map(m => m[0]))]
}

export function renderMarkdown(text: string): string {
  // Bold **text** → <strong>
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-[var(--t1)] font-medium">$1</strong>')
    // Citations [10-K §x] → styled badge
    .replace(
      /\[(10-[KQ]\s*§[\d.A-Za-z]+[^\]]*)\]/g,
      '<span class="font-mono text-[10px] text-[var(--t3)] bg-[var(--s3)] border border-[var(--b1)] rounded px-1 py-0.5 mx-0.5 whitespace-nowrap">$1</span>'
    )
}
