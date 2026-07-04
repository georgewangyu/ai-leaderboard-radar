---
version: "alpha"
name: "AI Leaderboard Radar"
description: "Public lean-company leaderboard using George Design Language research-desk mode."
mode: "research-desk"
source: "../george-design-language/modes/research-desk.DESIGN.md"
colors:
  primary: "#176E45"
  ink: "#141414"
  muted: "#64615A"
  page: "#E9E4DC"
  paper: "#FBFAF6"
  surface: "#FFFFFF"
  line: "#D7D0C1"
  blue: "#1457FF"
  signal: "#D7FF55"
---

# AI Leaderboard Radar Design Contract

AI Leaderboard Radar should feel like a source-backed operating desk for lean
AI-native companies. It is not a finance terminal, fundraising rumor board, or
growth-at-all-costs ranking page.

## First Screen

The first viewport should show:

- the leaderboard promise
- the most useful company-to-study path
- source/caveat discipline for metrics
- search, sort, and submit/correction affordances

## Layout

- Tables and sortable lists are allowed because comparison is the product.
- Each company detail should show metrics, caveats, website/source links, and
  one operating pattern to inspect.
- Keep uncertainty visible when revenue, employee, funding, or valuation data
  is estimated.

## Typography And Color

- Use George Research Desk tokens as the baseline.
- Green is the primary trust/accent color; blue is secondary action.
- Avoid a single-color green wash.
- Use mono labels for source and qualification tags only where they help scan.

## Do

- Put source labels close to metrics.
- Make check/update submission paths easy to find.
- Preserve generated-data and private-source boundaries.

## Do Not

- Present estimates as verified facts.
- Use casino, stock, or finance-terminal styling.
- Hide caveats behind hover-only UI.
- Let cards nest inside other cards.
