# AI Leaderboard Radar

Study lean AI-native companies.

AI Leaderboard Radar is a public leaderboard and digest layer for companies
with unusually high revenue per employee. It follows the Books Radar / Loops
Radar model: generated public data, weekly markdown feeds, source receipts, and
an installable agent skill.

Live site: https://aileaderboardradar.snackoverflowgeorge.com

Design contract: [DESIGN.md](DESIGN.md)

## What You Get

- Searchable leaderboard of lean AI-native companies.
- Revenue per employee, annual revenue, team size, profitability, funding, and
  source labels.
- Company website links and source labels for each row.
- Weekly feed generated from synced source data.
- Daily company-to-study rotation from the latest weekly feed.
- Agent skill for setup, recommendations, and digests.
- Public update form backed by GitHub issue creation.

## Quick Start

### Codex

```bash
mkdir -p ~/.codex/skills && git clone https://github.com/georgewangyu/ai-leaderboard-radar.git ~/.codex/skills/ai-leaderboard-radar
```

Or use the skill installer:

```bash
npx skills add georgewangyu/ai-leaderboard-radar --skill ai-leaderboard-radar -g
```

```text
set up AI Leaderboard Radar
```

### Claude Code / Cursor / Other Agents

```bash
git clone https://github.com/georgewangyu/ai-leaderboard-radar.git ~/skills/ai-leaderboard-radar
```

```text
Use ~/skills/ai-leaderboard-radar/skills/ai-leaderboard-radar/SKILL.md and set up AI Leaderboard Radar.
```

The agent walks users through:

- daily, weekly, or on-demand company digests
- delivery time and timezone
- language: English, Chinese, or bilingual
- tone: concise, operator, or investor
- delivery: current chat, Telegram, email, or an OpenClaw channel

Settings are saved locally in `~/.ai-leaderboard-radar/config.json`. Delivery
keys, if used, are saved locally in `~/.ai-leaderboard-radar/.env`.

## Source Sync

The active source repo is private:

```text
../george-ai-leaderboard/companies/*.md
```

Sync generated data:

```sh
npm run sync:leaderboard
```

Generated company data lives in:

```text
data/companies.json
```

Do not edit generated company content by hand. Update
`../george-ai-leaderboard/companies/<company-id>.md`, then run:

```sh
npm run sync:leaderboard
npm run feed:weekly
npm run --silent feed:latest
```

## Weekly Feed

Feed files live under:

```text
feeds/YYYY/MM/YYYY-MM-DD.md
```

Generate a feed:

```sh
npm run feed:weekly
```

Read the newest feed:

```sh
npm run --silent feed:latest
```

## Local Development

```sh
npm install
npm run dev -- --port 4194
```

Open `http://localhost:4194`.

## Try The Main Flow

1. Search for a company by name, market, source, or location.
2. Sort by revenue per employee, annual revenue, team size, or update date.
3. Filter by location, source type, or qualification mode.
4. Open a company website from the leaderboard.
5. Check the row's source label before citing metrics.
6. Submit a company or correction.
7. Install the skill and ask for today's company to study.

## Verification

```sh
npm run sync:leaderboard
npm run feed:weekly
npm run --silent feed:latest
npm run check   # typecheck and lint
npm run build
npm run test:ui
```

CI (`.github/workflows/ci.yml`) runs `npm run check` and `npm run build` on
every push to `main` and on pull requests.

`npm run test:ui` runs the Playwright suite against a production `next start`
server. It covers search/filtering, detail pages, copy-to-clipboard, mocked
issue submission, setup command copying, and mobile overflow.

## Website Lead Capture

The homepage install card asks for name and email before revealing the copyable
install command. Submissions are saved server-side into a shared Supabase table
called `radar_leads`; no Supabase key is exposed to the browser.

Create or update the table with:

```sh
psql "$SUPABASE_DB_URL" -f docs/radar-leads-supabase.sql
```

Required deployment environment variables:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-side-service-role-key>
```

`radar_leads` upserts by `(product, email)`, so repeated unlocks update the
existing lead instead of creating duplicates.

## Request Intake

Server-side GitHub issue creation uses:

```env
GITHUB_TOKEN=
GITHUB_OWNER=georgewangyu
GITHUB_REPO=audience-request-form
GITHUB_PRIVATE_REPO=audience-private-intake
AI_LEADERBOARD_REQUEST_ALLOWED_ORIGIN=
```

Public submissions create issues in `georgewangyu/audience-request-form`.
Private submissions create issues in `georgewangyu/audience-private-intake`.
AI Leaderboard Radar adds `ai-leaderboard-radar` and
`source-repo:ai-leaderboard-radar` labels so the shared queue remains triageable.

Keep tokens server-side. Do not prefix them with `NEXT_PUBLIC_`.
