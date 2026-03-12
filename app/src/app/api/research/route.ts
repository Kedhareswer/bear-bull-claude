import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { z } from 'zod'
import { createModel } from '@/lib/ai-client'
import { buildStepPrompt, buildMemoPrompt } from '@/lib/research-steps'
import type { ProviderId } from '@/lib/providers'

const StepSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google', 'groq', 'openrouter']),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  stepId: z.number().int().min(1).max(9),
  ticker: z.string().min(1),
  companyName: z.string().min(1),
  filingText: z.string(),
  sections: z.record(z.string(), z.string()).optional(),
  xbrlFacts: z.string().optional(),
  institutionalHolders: z.string().optional(),
  tenQText: z.string().optional(),
  eightKText: z.string().optional(),
  proxyText: z.string().optional(),
  quoteText: z.string().optional(),
  isMemo: z.literal(false).optional(),
})

const MemoSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google', 'groq', 'openrouter']),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  ticker: z.string().min(1),
  companyName: z.string().min(1),
  stepResults: z.record(z.string(), z.string()),
  isMemo: z.literal(true),
})

const BodySchema = z.union([StepSchema, MemoSchema])

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 })
  }

  const data = parsed.data
  const model = createModel(data.provider as ProviderId, data.model, data.apiKey)

  let prompt: string
  if (data.isMemo === true) {
    // Convert Record<string, string> to Record<number, string> for buildMemoPrompt
    const numericResults: Record<number, string> = {}
    for (const [k, v] of Object.entries(data.stepResults)) {
      const num = Number(k)
      if (Number.isFinite(num)) {
        numericResults[num] = v
      }
    }
    prompt = buildMemoPrompt(data.ticker, data.companyName, numericResults)
  } else {
    prompt = buildStepPrompt(
      data.stepId, data.ticker, data.companyName, data.filingText,
      data.sections, data.xbrlFacts, data.institutionalHolders, data.tenQText,
      data.eightKText, data.proxyText, data.quoteText,
    )
  }

  try {
    const result = streamText({
      model,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 2000,
    })
    // Build AI SDK data stream protocol: each text chunk is prefixed "0:" + JSON string + newline
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`))
        }
        controller.close()
      },
    })
    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI stream error'
    return new Response(msg, { status: 500 })
  }
}
