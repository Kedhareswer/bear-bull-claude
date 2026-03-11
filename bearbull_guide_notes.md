# Notes from BearBull "Research With Claude AI" guide

## What the guide claims
- Manual filing review is time-consuming; AI-assisted workflows can compress first-pass research from ~12+ hours to ~2 hours.
- The guide emphasizes that AI should be constrained by strict source discipline, not trusted blindly.
- It positions Claude as a research copilot for reading 10-K/10-Q/transcripts and producing structured memos with citations.

## Core setup recommended
1. Create a persistent workspace per ticker (Claude Project or Claude Code folder).
2. Add global "Research Rules" that force citation and disallow unsupported claims.
3. Store outputs in a persistent note system (Obsidian markdown vault) rather than ad hoc chats.
4. Organize memos by company and quarter.

## "Research Rules" pattern (critical)
- Role: long-term equity analyst.
- Source discipline: all factual claims must be tied to uploaded project documents.
- Every metric/KPI must include file + page/section + quote + interpretation.
- If unsourced: explicitly return "Not found in available filings."
- Prefer most recent periods; flag stale periods.
- Mark inferences as inferences.

## 9-step framework in the guide
1. Business Overview
2. Industry Scan
3. Financial Deep Dive
4. Moat Analysis
5. Management Review
6. Valuation Check
7. Bear Case
8. Earnings Update (quarterly cadence)
9. Decision Journal

## Why this structure matters (guide thesis)
- Forces analytical sequence: business -> industry -> financials -> risks -> valuation.
- Uses a journal to separate process from emotion and improve decision calibration.
- Creates a quarter-over-quarter record of management credibility and thesis drift.

## Claimed workflow details
- First-time analysis: run steps 1-7, then step 9.
- Ongoing coverage: each quarter upload new filings and run step 8 + step 9 updates.
- Keep old memos as historical record; update with new versions.
- Revisit bear case at least annually.

## Claimed evidence snippets mentioned by the guide
- Journal of Financial Economics (2024): AI models outperformed 54.5% of human analysts in predicting earnings direction.
- Goldman Sachs productivity claim: ~30% for AI-assisted financial analysis use cases.
- NBIM/Anthropic claim: ~20% time savings (large productivity gains).

## Practical takeaway
The strongest element is not "AI intelligence" itself, but a repeatable, auditable research operating system:
- structured prompts,
- mandatory source citation,
- persistent institutional memory,
- recurring update cycle.

## Source links
- BearBull guide page: https://www.bearbull.io/blog/Guide/Research-With-Claude-AI
- SEC EDGAR company filings search: https://www.sec.gov/edgar/search/
- Anthropic Claude product page (for environment context): https://www.anthropic.com/claude
- Obsidian (knowledge base workspace): https://obsidian.md/

## Source quality note
The productivity statistics cited in the BearBull article should be treated as directional until independently verified from the original publications or primary disclosures. In implementation, always store both:
1) the secondary source that quoted a metric, and
2) the primary source document where the metric originated.
