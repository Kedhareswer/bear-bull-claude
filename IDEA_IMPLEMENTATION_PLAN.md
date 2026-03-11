# Implementation Plan & Execution Motion: AI-Assisted Equity Research Workflow

## 1) Objective
Build a repeatable research operating system that turns SEC filings/transcripts into decision-grade investment memos, while preserving human judgment and auditability.

Success condition:
- less manual data wrangling,
- more time spent on thesis quality,
- every conclusion traceable to source text.

## 2) What to implement (product scope)
### In-scope (MVP)
- Ticker workspace model (one workspace per company).
- Document ingestion (10-K, 10-Q, 8-K, earnings transcripts, proxy statements).
- Source-grounded prompt templates for the 9-step workflow.
- Structured memo generation with citation formatting.
- Quarterly update flow and decision journal logging.

### Out-of-scope (MVP)
- Fully autonomous trading.
- Price-target automation as a primary feature.
- Unsourced web-scrape summarization without document-level traceability.

## 3) User roles
- Primary user: self-directed retail investor / fundamental analyst.
- Secondary user: small investment team sharing memos.
- Tertiary user: non-technical investor who needs a guided UI and low-friction onboarding.

## 4) Functional architecture
1. **Ingestion layer**
   - Pull filings/transcripts from reliable providers (SEC EDGAR, earnings call sources).
   - Normalize file names and metadata.
2. **Knowledge layer**
   - Store source documents + parsed chunks + metadata.
   - Maintain versioned history by period.
3. **Prompt orchestration layer**
   - Enforce global research rules (citation-first; no unsupported claims).
   - Execute step templates (1-9) in sequence.
4. **Output layer**
   - Generate markdown memos.
   - Link memos together and maintain changelog.
5. **Review layer**
   - Human approval checkpoint before thesis-changing conclusions are accepted.
6. **UX layer (non-technical mode)**
   - Offer wizard-style step-by-step flow ("Next" guided journey).
   - Hide complexity by default and expose advanced controls progressively.

## 5) Data model (minimum viable)
- `company`
- `filing` (type, period, filing_date, source_url)
- `source_chunk` (doc_id, section, page_ref, text)
- `memo` (step_type, generated_at, period, status)
- `citation` (memo_id, filing_id, quote, location)
- `decision_log_entry` (action, date, price, thesis, wrong_if)

## 6) Prompt system design
### Global guardrails (always-on)
- "Only use project documents for facts."
- "If absent, say: Not found in available filings."
- "Mark inferences explicitly."
- "Prefer newest period; tag stale data if used."

### Step templates
Implement one template per step:
1. Business Overview
2. Industry Scan
3. Financial Deep Dive
4. Moat Analysis
5. Management Review
6. Valuation Check (sanity framing)
7. Bear Case (adversarial posture)
8. Earnings Update (guidance vs reality)
9. Decision Journal (interactive Q&A then append)

## 7) Quality & risk controls
- **Hallucination control:** no metric allowed without citation object.
- **Freshness control:** every memo header includes data cutoff date.
- **Contradiction control:** compare new memo claims to prior quarter claims and flag drift.
- **Bias control:** force bear-case completion before "buy/add" decision journaling.
- **Human-in-loop:** final decision remains manual.

## 8) Non-technical UX and UI design requirements
Design this like a consumer finance app, not an engineering tool.

### UX principles
- **Clarity first:** plain language labels ("What changed this quarter?" instead of "QoQ delta analysis").
- **Guided progression:** one major decision per screen.
- **Trust by transparency:** every claim has a visible "View source" action.
- **Low cognitive load:** default to summaries, let users expand details.
- **Error tolerance:** friendly empty states and recovery prompts.

### Core UI components
- **Ticker setup wizard:** collect ticker, risk profile, and strategy intent in 2-3 minutes.
- **Document inbox:** drag-and-drop + auto-categorization (10-K, 10-Q, transcript).
- **Research timeline:** quarterly event stream with filings, memo updates, and decisions.
- **Memo viewer:** split view (summary on left, citations on right).
- **Decision journal card:** structured form with required fields and confidence level.
- **Bear-case badge:** visual warning if bear case is missing/outdated.

### Accessibility and inclusivity
- WCAG-friendly contrast, keyboard navigation, readable typography.
- Mobile-responsive layout so non-technical users can review on phone/tablet.
- Glossary tooltips for financial terms (ROIC, SBC, DSO, etc.).

### UX acceptance criteria
- New user can complete first ticker setup in under 10 minutes.
- User can find the source behind any claim in <= 2 clicks.
- Quarterly update flow can be completed without command-line use.

## 9) Execution motion (phased rollout)
### Phase 0 - Setup (Week 1)
- Define naming schema and folder conventions.
- Add global research rules template.
- Build step prompt files and output templates.
- Create low-fidelity UI wireframes for the guided non-technical flow.

### Phase 1 - MVP for one ticker (Weeks 2-3)
- Ingest last 3 years of annual/quarterly docs.
- Run steps 1-7 and produce baseline memo set.
- Create first decision log entry.
- User test with one non-technical participant and capture friction points.

### Phase 2 - Quarterly cadence (Weeks 4-8)
- Add Step 8 runbook triggered on earnings dates.
- Re-run valuation and bear-case where needed.
- Record every position change in step 9.
- Release simplified dashboard + source drill-down interactions.

### Phase 3 - Scale to watchlist (Month 3+)
- Replicate workflow to 5-10 tickers.
- Add portfolio-level dashboard: thesis status, credibility trend, unresolved risks.
- Add role-based views (basic mode vs advanced analyst mode).

## 10) KPI framework
Track metrics at four levels:

### Process KPIs
- Time-to-first-memo per ticker.
- Percentage of claims with valid citations.
- Quarterly update latency (days from filing to updated memo).

### Research quality KPIs
- Number of thesis changes caught pre-earnings.
- Frequency of identified "thesis killer" items.
- Management guidance hit/miss tracking accuracy.

### Decision KPIs
- Win/loss does not solely define quality; evaluate process adherence.
- % of decisions with explicit "wrong if" conditions.
- Post-mortem calibration score (were invalidation triggers respected?).

### UX KPIs (non-technical friendliness)
- First-session completion rate.
- Median time to upload first filing.
- Citation click-through rate (proxy for trust behavior).
- User-reported clarity score (1-5) after quarterly update.

## 11) Operating cadence (recommended)
- **Weekly (light):** scan new filings/transcripts; queue ingestion.
- **Quarterly (heavy):** run step 8 + refresh impacted memos.
- **Semiannual:** revisit moat and management sections.
- **Annual:** full rerun including bear case and base assumptions.

## 12) Tooling suggestions
- Storage: markdown + git for version history.
- Notes UI: Obsidian or equivalent markdown graph.
- Automation: CLI commands for each analysis step.
- Optional: lightweight database for citation traceability.
- Front-end: React/Next.js (or similar) for guided non-technical UX.

## 13) Non-negotiables for trust
- No unsourced facts in final memos.
- Every valuation statement includes assumptions.
- Bear case is mandatory before position sizing changes.
- Decision journal required for Buy/Sell/Add/Trim actions.

## 14) Immediate starter checklist (next 48 hours)
1. Pick one current holding.
2. Collect latest 10-K, latest two 10-Qs, and last two transcripts.
3. Create workspace + apply global research rules.
4. Run steps 1-3 first.
5. Run step 7 (bear case) before valuation confidence hardens.
6. Log a decision entry, even if action is "Hold".
7. Have one non-technical friend test whether the workflow is understandable.

## 15) Reference sources
- BearBull guide: https://www.bearbull.io/blog/Guide/Research-With-Claude-AI
- SEC EDGAR search: https://www.sec.gov/edgar/search/
- Anthropic Claude overview: https://www.anthropic.com/claude
- Obsidian: https://obsidian.md/
- WCAG quick reference: https://www.w3.org/WAI/WCAG21/quickref/

## 16) Strategic interpretation
Your idea is strong because it reallocates investor effort:
- away from mechanical extraction,
- toward judgment, disconfirmation, and risk framing.

The implementation priority is not adding more model complexity. It's enforcing process discipline, citation integrity, continuous review cycles, and a UI that non-technical users can trust and use consistently.
