#!/usr/bin/env bash
# Installe les dépendances au démarrage d'une session cloud pour que tests et lint soient immédiatement utilisables.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"
pnpm install --frozen-lockfile
