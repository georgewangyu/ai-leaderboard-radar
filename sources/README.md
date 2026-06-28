# AI Leaderboard Radar Sources

The active source of truth is the private sibling repo:

```text
../george-ai-leaderboard/companies/*.md
```

Sync normalizes those company notes into `data/companies.json`.

Do not edit generated company data by hand. Update the private company note,
then run:

```sh
npm run sync:leaderboard
```
