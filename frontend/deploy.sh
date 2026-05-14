#!/usr/bin/env bash
# CF Pages deploy wrapper — 自動帶英文 commit message，避免中文 commit 導致 API 報錯
set -euo pipefail

cd "$(dirname "$0")"

npm run build

HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DATE=$(date +%Y-%m-%d)
MSG="deploy ${DATE} (${HASH})"

npx wrangler pages deploy dist \
  --project-name=jstock \
  --commit-message="${MSG}" \
  --commit-dirty=true

echo ""
echo "Deployed: ${MSG}"
