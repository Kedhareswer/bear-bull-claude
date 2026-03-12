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

export function buildStepPrompt(
  stepId:      number,
  ticker:      string,
  companyName: string,
  filingText:  string,
): string {
  const step = RESEARCH_STEPS.find(s => s.id === stepId)
  if (!step) throw new Error(`Unknown step: ${stepId}`)

  return `You are an expert equity research analyst. Perform Step ${stepId}: ${step.name} for ${companyName} (${ticker}).

Focus: ${step.subtitle}
Filing sections to reference: ${step.sections}

FILING CONTEXT:
${filingText.slice(0, 40000)}

REQUIRED OUTPUT FORMAT:
1. Start with exactly: "KEY FINDING: [one sentence with the most important insight]"
2. List 3-5 specific data points with exact numbers from the filing
3. Write 2-3 paragraphs of analysis
4. After each specific claim, add a citation like [10-K §8.1] referencing the exact section
5. End with: "STEP VERDICT: BULLISH / NEUTRAL / BEARISH — [one sentence why]"

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
