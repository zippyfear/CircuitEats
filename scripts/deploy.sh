#!/usr/bin/env bash
# CircuitEats deploy with a smoke gate + auto-rollback. Run on the target box.
#   PM2_NAME=heartofgold-style name (default: circuiteats)
#   SMOKE_BASE=http://localhost:4600 (default)
# Flow: pull → deps → migrate → build (fails abort, app untouched) → restart →
#       /api/health → smoke; on smoke failure, roll back to the previous commit.
set -euo pipefail
cd "$(dirname "$0")/.."
PM2_NAME="${PM2_NAME:-circuiteats}"
BASE="${SMOKE_BASE:-http://localhost:4600}"
PREV="$(git rev-parse HEAD)"

echo "▶ pull";        git pull --ff-only
echo "▶ deps";        npm install --no-audit --no-fund
echo "▶ migrate";     npx prisma migrate deploy
echo "▶ generate";    npx prisma generate
echo "▶ build";       npm run build          # aborts here on failure — running app untouched
echo "▶ restart";     pm2 restart "$PM2_NAME" --update-env >/dev/null; sleep 3

echo "▶ health";      curl -fsS "$BASE/api/health" >/dev/null || { echo "❌ health check failed"; exit 1; }
echo "▶ smoke gate"
if npm run smoke; then
  echo "✅ deploy OK — $(git rev-parse --short HEAD)"
else
  echo "❌ SMOKE FAILED — rolling back to ${PREV:0:7}"
  git reset --hard "$PREV"
  npm install --no-audit --no-fund; npx prisma generate; npm run build
  pm2 restart "$PM2_NAME" --update-env >/dev/null
  echo "↩ rolled back to ${PREV:0:7}"; exit 1
fi
