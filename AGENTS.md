## Health Stack

- typecheck: `(cd backend && npx tsc --noEmit) && (cd frontend && npx tsc -b)`
- lint: `npm --prefix frontend run lint`
- test: `npm --prefix backend test -- --runInBand && npm --prefix frontend test`
- deadcode: skipped (Knip is not installed)
- shell: skipped (no shell scripts detected)
- gbrain: skipped (GBrain is not configured)
