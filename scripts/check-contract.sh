#!/usr/bin/env bash
# Asserts the registry's public contract: the catalog and item payloads are
# reachable as JSON, and the shadcn root content negotiation in src/start.ts
# answers `npx shadcn@latest add <url>` while leaving ordinary browser
# requests alone. This is the guard that makes plans/005-static-prerendering.md
# safe to attempt — see docs/deployment.md.
#
# Usage:
#   scripts/check-contract.sh
#     No base URL: boots the already-built Node server
#     (.output/server/index.mjs, from `pnpm build`) on 127.0.0.1:3998 and
#     checks it, then stops it.
#
#   scripts/check-contract.sh <base-url>
#     Checks an already-running server or a deployed site instead of
#     starting one.
#
#   scripts/check-contract.sh <base-url> --production-headers
#     Also asserts the CORS/Cache-Control headers that public/_headers
#     applies on Cloudflare Workers Static Assets. Off by default, and
#     meaningless locally: the Nitro Node server this script boots never
#     sees public/_headers — that file is a Workers Static Assets feature,
#     applied only in front of the deployed Worker.
#
# Requires a prior `pnpm build` when no base URL is given (models the server
# lifecycle in scripts/smoke-install.sh: the port-in-use refusal, the `exec`
# subshell so $! is node's own pid, and the readiness poll loop).
set -euo pipefail

PRODUCTION_HEADERS=0
BASE_URL=""
for arg in "$@"; do
  case "$arg" in
    --production-headers) PRODUCTION_HEADERS=1 ;;
    *) BASE_URL="$arg" ;;
  esac
done

PORT="${PORT:-3998}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SMOKE_DIR="$ROOT/.smoke"
TMP_DIR="$(mktemp -d)"
SERVER_PID=""
STARTED_SERVER=0

PASS=0
FAIL=0

ok() {
  echo "✔ $1"
  PASS=$((PASS + 1))
}

bad() {
  echo "✖ $1"
  FAIL=$((FAIL + 1))
}

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [ -z "$BASE_URL" ]; then
  BASE_URL="http://127.0.0.1:$PORT"
  STARTED_SERVER=1

  # Refuse to run against a server this script did not start. A leftover one
  # serves the current files on disk but with the Content-Length and ETag
  # from its own build — see scripts/smoke-install.sh for the same guard.
  if curl -fsS -o /dev/null "$BASE_URL/r/registry.json" 2>/dev/null; then
    echo "✖ something is already serving :$PORT — stop it first (lsof -nP -iTCP:$PORT -sTCP:LISTEN)"
    exit 1
  fi

  mkdir -p "$SMOKE_DIR"
  echo "▸ serving the built registry on :$PORT"
  # `exec` so the subshell is replaced by node and $! is node's own pid.
  # Without it the trap kills the wrapper and leaks the server, which the
  # next run then silently talks to.
  (cd "$ROOT" && exec env PORT="$PORT" node .output/server/index.mjs >"$SMOKE_DIR/contract-server.log" 2>&1) &
  SERVER_PID=$!

  for _ in $(seq 1 30); do
    if curl -fsS "$BASE_URL/r/registry.json" >/dev/null 2>&1; then break; fi
    sleep 1
  done
  curl -fsS "$BASE_URL/r/registry.json" >/dev/null
fi

echo "▸ checking contract against $BASE_URL"

# Evaluates a JS expression against the parsed JSON body of a file and
# prints the result. Kept as a tiny reusable helper instead of shelling out
# to jq, which is not a project dependency.
json_eval() {
  local file="$1" expr="$2"
  node -e '
    const fs = require("fs")
    const d = JSON.parse(fs.readFileSync(process.argv[1], "utf8"))
    const result = new Function("d", "return (" + process.argv[2] + ")")(d)
    process.stdout.write(String(result))
  ' "$file" "$expr"
}

# Performs a GET, capturing status, headers and body to files under TMP_DIR,
# and echoes the status code.
do_get() {
  local name="$1" url="$2"
  local hdr_file="$TMP_DIR/$name.headers" body_file="$TMP_DIR/$name.body"
  shift 2
  curl -sS -o "$body_file" -D "$hdr_file" -w '%{http_code}' "$url" "$@"
}

header_contains() {
  local hdr_file="$1" header="$2" needle="$3"
  grep -i "^$header:" "$hdr_file" | grep -qi "$needle"
}

assert_status_and_header() {
  local label="$1" name="$2" status="$3" expected_status="$4" header="$5" needle="$6"
  if [ "$status" != "$expected_status" ]; then
    bad "$label (status $status, expected $expected_status)"
    return 1
  fi
  if ! header_contains "$TMP_DIR/$name.headers" "$header" "$needle"; then
    bad "$label ($header did not contain '$needle')"
    return 1
  fi
  return 0
}

# 1. GET /r/registry.json → 200, JSON content-type, non-empty items[]
STATUS=$(do_get registry "$BASE_URL/r/registry.json")
if assert_status_and_header "GET /r/registry.json" registry "$STATUS" 200 content-type application/json; then
  if HAS_ITEMS=$(json_eval "$TMP_DIR/registry.body" "Array.isArray(d.items) && d.items.length > 0" 2>/dev/null) && [ "$HAS_ITEMS" = "true" ]; then
    ok "GET /r/registry.json (200, JSON, non-empty items[])"
  else
    bad "GET /r/registry.json (body did not parse as JSON with a non-empty items[])"
  fi
fi

# 2. GET / with Accept: application/vnd.shadcn.v1+json → 200, JSON, .name == tanfust
# This is the load-bearing assertion: it is what
# `npx shadcn@latest add https://ui.tanfust.com` depends on.
STATUS=$(do_get shadcn_accept "$BASE_URL/" -H 'Accept: application/vnd.shadcn.v1+json')
if [ "$STATUS" != "200" ]; then
  bad "GET / with shadcn Accept header (status $STATUS, expected 200)"
elif NAME=$(json_eval "$TMP_DIR/shadcn_accept.body" "d.name" 2>/dev/null) && [ "$NAME" = "tanfust" ]; then
  ok "GET / with shadcn Accept header (200, JSON, .name === tanfust)"
else
  bad "GET / with shadcn Accept header (body did not parse as JSON with .name === tanfust)"
fi

# 3. GET / with User-Agent: shadcn → same as (2); src/start.ts accepts either signal.
STATUS=$(do_get shadcn_ua "$BASE_URL/" -H 'User-Agent: shadcn')
if [ "$STATUS" != "200" ]; then
  bad "GET / with User-Agent: shadcn (status $STATUS, expected 200)"
elif NAME=$(json_eval "$TMP_DIR/shadcn_ua.body" "d.name" 2>/dev/null) && [ "$NAME" = "tanfust" ]; then
  ok "GET / with User-Agent: shadcn (200, JSON, .name === tanfust)"
else
  bad "GET / with User-Agent: shadcn (body did not parse as JSON with .name === tanfust)"
fi

# 4. GET / with an ordinary browser Accept: text/html → 200, text/html.
# Counter-assertion: the negotiation must not hijack browser traffic.
STATUS=$(do_get browser "$BASE_URL/" -H 'Accept: text/html')
assert_status_and_header "GET / with browser Accept header" browser "$STATUS" 200 content-type text/html \
  && ok "GET / with browser Accept header (200, text/html)"

# 5. GET /llms.txt → 200, text/plain.
STATUS=$(do_get llms "$BASE_URL/llms.txt")
assert_status_and_header "GET /llms.txt" llms "$STATUS" 200 content-type text/plain \
  && ok "GET /llms.txt (200, text/plain)"

# 6. GET /r/use-debounce.json → 200, .name === use-debounce.
# Proves individual item payloads are reachable, not just the catalog.
STATUS=$(do_get item "$BASE_URL/r/use-debounce.json")
if [ "$STATUS" != "200" ]; then
  bad "GET /r/use-debounce.json (status $STATUS, expected 200)"
elif NAME=$(json_eval "$TMP_DIR/item.body" "d.name" 2>/dev/null) && [ "$NAME" = "use-debounce" ]; then
  ok "GET /r/use-debounce.json (200, .name === use-debounce)"
else
  bad "GET /r/use-debounce.json (body did not parse as JSON with .name === use-debounce)"
fi

if [ "$PRODUCTION_HEADERS" = "1" ]; then
  echo "▸ checking production-only headers (public/_headers, Cloudflare Workers Static Assets)"

  STATUS=$(do_get registry_headers "$BASE_URL/r/registry.json")
  if [ "$STATUS" = "200" ] \
    && header_contains "$TMP_DIR/registry_headers.headers" access-control-allow-origin '\*' \
    && header_contains "$TMP_DIR/registry_headers.headers" cache-control 'public, max-age=300, s-maxage=3600' \
    && header_contains "$TMP_DIR/registry_headers.headers" vary accept; then
    ok "GET /r/registry.json (production headers: CORS, cache-control, vary)"
  else
    bad "GET /r/registry.json (production headers missing or wrong — expected public/_headers to apply)"
  fi

  STATUS=$(do_get llms_headers "$BASE_URL/llms.txt")
  if [ "$STATUS" = "200" ] \
    && header_contains "$TMP_DIR/llms_headers.headers" cache-control 'public, max-age=300, s-maxage=3600'; then
    ok "GET /llms.txt (production headers: cache-control)"
  else
    bad "GET /llms.txt (production headers missing or wrong — expected public/_headers to apply)"
  fi
else
  echo "▸ skipping CORS/Cache-Control assertions on /r/* and /llms.txt (--production-headers not passed)"
  echo "  Those headers come from public/_headers, a Cloudflare Workers Static Assets feature the"
  echo "  Nitro Node server this script boots locally does not apply. Verify them with:"
  echo "    bash scripts/check-contract.sh https://ui.tanfust.com --production-headers"
fi

echo "▸ $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
