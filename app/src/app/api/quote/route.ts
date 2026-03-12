import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  let body: { ticker: string; avKey: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { ticker, avKey } = body
  if (!ticker || !avKey) {
    return NextResponse.json({ quoteText: '' })
  }

  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(ticker)}&apikey=${avKey}`
    const res = await fetch(url)
    const data = await res.json()
    const quote = data['Global Quote']
    if (!quote || Object.keys(quote).length === 0) {
      return NextResponse.json({ quoteText: '' })
    }

    const price = quote['05. price']
    const change = quote['09. change']
    const changePct = quote['10. change percent']
    const volume = quote['06. volume']
    const high = quote['03. high']
    const low = quote['04. low']
    const prevClose = quote['08. previous close']

    const lines = ['=== CURRENT MARKET DATA (live quote) ===']
    if (price) lines.push(`Current Price: $${parseFloat(price).toFixed(2)}`)
    if (prevClose) lines.push(`Previous Close: $${parseFloat(prevClose).toFixed(2)}`)
    if (change && changePct) lines.push(`Day Change: $${change} (${changePct})`)
    if (high) lines.push(`Day High: $${parseFloat(high).toFixed(2)}`)
    if (low) lines.push(`Day Low: $${parseFloat(low).toFixed(2)}`)
    if (volume) lines.push(`Volume: ${parseInt(volume).toLocaleString()}`)

    return NextResponse.json({ quoteText: lines.join('\n') })
  } catch {
    return NextResponse.json({ quoteText: '' })
  }
}
