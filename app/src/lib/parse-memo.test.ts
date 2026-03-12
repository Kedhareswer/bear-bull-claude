import { describe, it, expect, vi } from 'vitest'
import { parseMemoText, consumeStream } from './parse-memo'

describe('parseMemoText', () => {
  const sampleText = `VERDICT: BUY
CONVICTION: 4
THESIS: Strong moat with recurring revenue. Management has delivered consistent FCF growth. Valuation is reasonable relative to peers.
BULL BULLET 1: Revenue growing 18% YoY with expanding margins
BULL BULLET 2: $2.4B net cash position provides downside protection
BEAR BULLET: Customer concentration risk — top 3 clients = 45% of revenue
FAIR VALUE: $120–$150 per share
ENTRY TRIGGER: Buy on pullback below $118 or on next earnings beat`

  it('parses VERDICT correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.verdict).toBe('BUY')
  })

  it('parses CONVICTION correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.conviction).toBe(4)
  })

  it('parses THESIS correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.thesis).toContain('Strong moat')
  })

  it('parses BULL BULLET 1 correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.bullBullets[0]).toContain('Revenue growing 18%')
  })

  it('parses BULL BULLET 2 correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.bullBullets[1]).toContain('$2.4B net cash')
  })

  it('parses BEAR BULLET correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.bearBullet).toContain('Customer concentration risk')
  })

  it('parses FAIR VALUE range correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.fairValueLo).toBe(120)
    expect(result.fairValueHi).toBe(150)
  })

  it('parses ENTRY TRIGGER correctly', () => {
    const result = parseMemoText(sampleText)
    expect(result.entryTrigger).toContain('Buy on pullback')
  })

  it('returns defaults for empty text', () => {
    const result = parseMemoText('')
    expect(result.verdict).toBe('NEUTRAL')
    expect(result.conviction).toBe(3)
    expect(result.fairValueLo).toBe(0)
    expect(result.fairValueHi).toBe(0)
    expect(result.bullBullets).toHaveLength(0)
  })
})

describe('consumeStream', () => {
  function makeStreamResponse(lines: string[]): Response {
    const body = lines.join('\n') + '\n'
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body))
        controller.close()
      },
    })
    return new Response(stream)
  }

  it('extracts text from AI SDK 0: stream format lines', async () => {
    const res = makeStreamResponse([
      '0:"Hello"',
      '0:" world"',
      'e:{"finishReason":"stop"}',
    ])
    const chunks: string[] = []
    const full = await consumeStream(res, chunk => chunks.push(chunk))
    expect(full).toBe('Hello world')
    expect(chunks).toEqual(['Hello', ' world'])
  })

  it('ignores non-0: lines', async () => {
    const res = makeStreamResponse([
      'e:{"finishReason":"stop"}',
      'd:{"usage":{"promptTokens":10}}',
    ])
    const chunks: string[] = []
    const full = await consumeStream(res, chunk => chunks.push(chunk))
    expect(full).toBe('')
    expect(chunks).toHaveLength(0)
  })

  it('ignores malformed 0: lines', async () => {
    const res = makeStreamResponse([
      '0:not valid json',
      '0:"valid"',
    ])
    const chunks: string[] = []
    const full = await consumeStream(res, chunk => chunks.push(chunk))
    expect(full).toBe('valid')
    expect(chunks).toEqual(['valid'])
  })
})
