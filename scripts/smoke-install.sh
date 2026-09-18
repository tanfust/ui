#!/usr/bin/env bash
# Smoke-installs every public registry item into a fresh consumer project and
# typechecks it. Run once per primitive library to enforce the base-agnostic rule:
#
#   pnpm smoke base    # Base UI consumer (shadcn's default)
#   pnpm smoke radix   # Radix consumer
#
# Requires a prior `pnpm build` (serves public/r via the built Nitro server).
set -euo pipefail

BASE="${1:-base}"
PORT="${PORT:-3999}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE_DIR="$ROOT/.smoke"
APP_DIR="$SMOKE_DIR/consumer-$BASE"
REGISTRY_URL="http://127.0.0.1:$PORT/r/{name}.json"

rm -rf "$APP_DIR"
mkdir -p "$SMOKE_DIR"

# Refuse to run against a server this script did not start. A leftover one
# serves the current files on disk but with the Content-Length and ETag from
# its own build, so a grown item arrives truncated and the CLI fails with an
# opaque "Unterminated string in JSON".
if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/r/registry.json" 2>/dev/null; then
  echo "✖ something is already serving :$PORT — stop it first (lsof -nP -iTCP:$PORT -sTCP:LISTEN)"
  exit 1
fi

echo "▸ serving registry on :$PORT"
# `exec` so the subshell is replaced by node and $! is node's own pid. Without
# it the trap kills the wrapper and leaks the server, which the next run then
# silently talks to.
(cd "$ROOT" && exec env PORT="$PORT" node .output/server/index.mjs >"$SMOKE_DIR/server-$BASE.log" 2>&1) &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/r/registry.json" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$PORT/r/registry.json" >/dev/null

ITEMS=$(node -e '
  const r = require(process.argv[1]);
  const skip = new Set(["registry:example", "registry:internal"]);
  console.log(r.items.filter(i => !skip.has(i.type)).map(i => "@tanfust/" + i.name).join(" "));
' "$ROOT/public/r/registry.json")

echo "▸ creating consumer app ($BASE)"
(cd "$SMOKE_DIR" && npx --yes shadcn@latest init --template vite --base "$BASE" --preset lyra --name "consumer-$BASE" --no-monorepo --yes)
test -d "$APP_DIR" || { echo "✖ consumer app was not created"; exit 1; }

cd "$APP_DIR"
npx --yes shadcn@latest registry add "@tanfust=$REGISTRY_URL"

if [ -z "$ITEMS" ]; then
  echo "▸ no public items yet — catalog reachable, consumer app created. OK."
  exit 0
fi

echo "▸ installing: $ITEMS"
# shellcheck disable=SC2086
npx --yes shadcn@latest add $ITEMS --yes --overwrite

echo "▸ typechecking consumer app"
npx --yes tsc --noEmit -p .

echo "▸ forbidden direct primitive imports in installed files?"
if grep -rEn "from ['\"](@radix-ui/|radix-ui|@base-ui/)" src --include='*.tsx' --include='*.ts' | grep -v "/components/ui/" ; then
  echo "✖ registry items must not import Radix/Base UI directly (see AGENTS.md)"; exit 1
fi

echo "✔ smoke ($BASE) passed"
