import type { MemoSummary } from '@/store/research'

export function parseMemoText(text: string): MemoSummary {
  const get = (key: string) => {
    const m = text.match(new RegExp(key + '[:\\s]+(.+?)(?:\\n|$)', 'i'))
    return m ? m[1].trim() : ''
  }
  const verdictRaw = get('VERDICT')
  const thesis = get('THESIS')
  const bull1 = get('BULL BULLET 1')
  const bull2 = get('BULL BULLET 2')
  const bear = get('BEAR BULLET')
  const fvRaw = get('FAIR VALUE')
  const entryTrigger = get('ENTRY TRIGGER')
  const fvMatch = fvRaw.match(/\$?([\d.]+)\s*[–\-]\s*\$?([\d.]+)/)
  return {
    verdict: verdictRaw || 'NEUTRAL',
    conviction: parseInt(get('CONVICTION')) || 3,
    thesis,
    bullBullets: [bull1, bull2].filter(Boolean),
    bearBullet: bear,
    fairValueLo: fvMatch ? parseFloat(fvMatch[1]) : 0,
    fairValueHi: fvMatch ? parseFloat(fvMatch[2]) : 0,
    entryTrigger,
  }
}

export async function consumeStream(
  res: Response,
  onChunk: (text: string) => void,
): Promise<string> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('0:')) {
        try {
          const text = JSON.parse(line.slice(2)) as string
          full += text
          onChunk(text)
        } catch { /* ignore malformed line */ }
      }
    }
  }
  // flush TextDecoder and process any remaining buffered line
  buffer += decoder.decode() // no options = flush remaining bytes
  if (buffer.startsWith('0:')) {
    try {
      const text = JSON.parse(buffer.slice(2)) as string
      full += text
      onChunk(text)
    } catch { /* ignore */ }
  }
  return full
}
