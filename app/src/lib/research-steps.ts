export interface ResearchStep {
  id:        number
  name:      string
  subtitle:  string
  sections:  string
  mandatory: boolean
}

export const RESEARCH_STEPS: ResearchStep[] = [
  { id: 1, name: 'Business Overview',   subtitle: 'Products · Markets · Customers',           sections: '10-K §1, §1A',       mandatory: false },
  { id: 2, name: 'Industry Scan',       subtitle: 'Competitive Landscape · Macro Trends',      sections: '10-K §1, §1A',       mandatory: false },
  { id: 3, name: 'Financial Deep Dive', subtitle: 'Revenue · Margins · FCF · Balance Sheet',   sections: '10-K §7, §8',        mandatory: true  },
  { id: 4, name: 'Moat Analysis',       subtitle: 'Competitive Advantages · Switching Costs',  sections: '10-K §1, §7',        mandatory: false },
  { id: 5, name: 'Management Review',   subtitle: 'Track Record · Incentives · Ownership',     sections: '10-K §10, §11, §12', mandatory: false },
  { id: 6, name: 'Valuation',           subtitle: 'P/E · DCF · Comps · Entry Price',           sections: '10-K §7, §8',        mandatory: true  },
  { id: 7, name: 'Bear Case',           subtitle: 'Risks · Headwinds · What Must Be True',     sections: '10-K §1A, §7',       mandatory: true  },
  { id: 8, name: 'Earnings Update',     subtitle: 'Latest Quarter · Guidance · Surprises',     sections: '10-Q §1, §2',        mandatory: false },
  { id: 9, name: 'Decision Journal',    subtitle: 'Conviction · Entry Triggers · Thesis',      sections: 'synthesis',          mandatory: false },
]

// Human-readable data sources shown in the UI for each step
export const STEP_DATA_SOURCES: Record<number, string[]> = {
  1: ['10-K §1'],
  2: ['10-K §1', '10-K §1A'],
  3: ['XBRL Facts', '10-K §7', '10-K §7A', '10-K §8'],
  4: ['10-K §1', '10-K §7'],
  5: ['DEF 14A', '13F Holders', '10-K §10', '10-K §11', '10-K §12'],
  6: ['Live Quote', 'XBRL Facts', '10-K §7', '10-K §8'],
  7: ['10-K §1A', '10-K §7'],
  8: ['8-K Earnings', '10-Q §1', '10-Q §2'],
  9: ['Synthesis'],
}

// Map each step to the section keys it needs (from parseSections output)
const STEP_SECTION_KEYS: Record<number, string[]> = {
  1: ['item1'],
  2: ['item1', 'item1a'],
  3: ['item7', 'item7a', 'item8'],
  4: ['item1', 'item7'],
  5: ['item10', 'item11', 'item12'],
  6: ['item7', 'item8'],
  7: ['item1a', 'item7'],
  8: [],   // uses tenQText
  9: [],   // synthesis — no filing context
}

function getFilingContext(
  stepId:               number,
  sections:             Record<string, string> | undefined,
  filingText:           string,
  xbrlFacts:            string,
  institutionalHolders: string,
  tenQText:             string,
  eightKText:           string,
  proxyText:            string,
  quoteText:            string,
): string {
  if (stepId === 8) return eightKText || tenQText || filingText.slice(0, 40000)
  if (stepId === 9) return ''

  const keys = STEP_SECTION_KEYS[stepId] ?? []
  let context = ''

  if (sections && keys.length > 0) {
    const parts = keys
      .map(k => sections[k])
      .filter((s): s is string => Boolean(s) && s.length > 50)
    context = parts.join('\n\n')
  }

  if (!context) context = filingText.slice(0, 40000)

  if ((stepId === 3 || stepId === 6) && xbrlFacts) {
    context = xbrlFacts + '\n\n' + context
  }

  if (stepId === 5 && institutionalHolders) {
    context = institutionalHolders + '\n\n' + context
  }

  if (stepId === 5 && proxyText) {
    context = proxyText + '\n\n' + context
  }

  if (stepId === 6 && quoteText) {
    context = quoteText + '\n\n' + context
  }

  return context.slice(0, 55000)
}

export function buildStepPrompt(
  stepId:                number,
  ticker:                string,
  companyName:           string,
  filingText:            string,
  sections?:             Record<string, string>,
  xbrlFacts?:            string,
  institutionalHolders?: string,
  tenQText?:             string,
  eightKText?:           string,
  proxyText?:            string,
  quoteText?:            string,
): string {
  const step = RESEARCH_STEPS.find(s => s.id === stepId)
  if (!step) throw new Error(`Unknown step: ${stepId}`)

  const context = getFilingContext(
    stepId, sections, filingText,
    xbrlFacts ?? '', institutionalHolders ?? '', tenQText ?? '',
    eightKText ?? '', proxyText ?? '', quoteText ?? '',
  )

  const chartLine = stepId === 3
    ? '\n7. Output one line: "TREND: FY[yr]=$[X]B FY[yr]=$[X]B FY[yr]=$[X]B" with 3-4 years of revenue from the filing'
    : stepId === 6
    ? '\n7. Output one line: "VALUATION: pe=[X]x fair_low=$[X] fair_high=$[X]" with your estimated fair value range'
    : ''

  const xbrlNote = xbrlFacts && (stepId === 3 || stepId === 6)
    ? '\nNote: XBRL FINANCIAL FACTS at the top are exact SEC-reported numbers — use them directly without modification.'
    : ''

  return `You are an expert equity research analyst. Perform Step ${stepId}: ${step.name} for ${companyName} (${ticker}).

Focus: ${step.subtitle}
Filing sections to reference: ${step.sections}${xbrlNote}

FILING CONTEXT:
${context}

REQUIRED OUTPUT FORMAT:
1. Start with exactly: "KEY FINDING: [one sentence with the most important insight]"
2. Output one line: "METRICS: Label=Value(delta)direction, ..." with 3-4 headline KPIs. Use ↑ for positive, ↓ for negative, → for flat. Example: METRICS: Revenue=$391B(+9%)↑, Op Margin=29.6%(+2pp)↑, FCF=$112B→
3. List 3-5 numbered data points with exact figures (one per line). Prefix bullish data with (↑) and bearish with (↓)
4. Write 2-3 paragraphs of analysis
5. After each specific claim, add a citation like [10-K §7] referencing the exact section
6. End with: "STEP VERDICT: BULLISH / NEUTRAL / BEARISH — [one sentence why]"${chartLine}

Rules: cite everything, no hallucinations, only state what filings confirm.`
}

export function buildMemoPrompt(
  ticker:      string,
  companyName: string,
  stepResults: Record<number, string>,
): string {
  const summaries = Object.entries(stepResults)
    .map(([id, text]) => {
      const step = RESEARCH_STEPS.find(s => s.id === Number(id))
      return `### Step ${id}: ${step?.name ?? ''}\n${text.slice(0, 3000)}`
    })
    .join('\n\n')

  return `Synthesize a final investment memo for ${companyName} (${ticker}).

RESEARCH RESULTS:
${summaries}

OUTPUT (use these exact labels):
VERDICT: BUY / WATCH / AVOID
CONVICTION: [1-5]
THESIS: [2-3 sentences]
BULL BULLET 1: [reason to be positive]
BULL BULLET 2: [second reason]
BEAR BULLET: [key risk]
FAIR VALUE: $[low]–$[high] per share
ENTRY TRIGGER: [specific condition to buy]

Be direct. A retail investor should understand this in 30 seconds.`
}
