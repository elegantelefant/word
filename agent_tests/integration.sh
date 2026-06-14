#!/usr/bin/env bash
# ABOUTME: Integration test script — curls every Elefant API endpoint the plugin uses.
# ABOUTME: Requires ELEFANT_TOKEN env var. Tests response shape, not business logic.
#
# Usage:
#   export ELEFANT_TOKEN="your-jwt-token"
#   export API_URL="https://api.elefant.com"  # optional, defaults to prod
#   bash agent_tests/integration.sh

set -euo pipefail

API_URL="${API_URL:-https://api.elefant.com}"
TOKEN="${ELEFANT_TOKEN:?Set ELEFANT_TOKEN env var}"

PASS=0
FAIL=0
SKIP=0

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1: $2"; FAIL=$((FAIL + 1)); }
skip() { echo "  ○ $1 (skipped: $2)"; SKIP=$((SKIP + 1)); }

# Helper: curl with auth, return body. Sets $HTTP_CODE.
api() {
  local method="$1" path="$2" body="${3:-}"
  local tmpfile
  tmpfile=$(mktemp)

  if [[ -n "$body" ]]; then
    HTTP_CODE=$(curl -s -o "$tmpfile" -w "%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body" \
      "${API_URL}${path}")
  else
    HTTP_CODE=$(curl -s -o "$tmpfile" -w "%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      "${API_URL}${path}")
  fi

  BODY=$(cat "$tmpfile")
  rm -f "$tmpfile"
}

# Check JSON field exists (jq expression returns non-null)
has_field() {
  echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); exec(\"$1\")" 2>/dev/null
}

echo ""
echo "=== Elefant API Integration Tests ==="
echo "API: $API_URL"
echo ""

# ─────────────────────────────────────────────
echo "── Health ──"
# ─────────────────────────────────────────────

api GET /health
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "GET /health → 200"
else
  fail "GET /health" "got $HTTP_CODE"
fi

api GET /ready
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "503" ]]; then
  pass "GET /ready → $HTTP_CODE"
else
  fail "GET /ready" "got $HTTP_CODE"
fi

# ─────────────────────────────────────────────
echo "── Auth / Account ──"
# ─────────────────────────────────────────────

# GET /whoami — used by api/account.ts
api GET /whoami
if [[ "$HTTP_CODE" == "200" ]]; then
  if echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d.get('user_id')" 2>/dev/null; then
    pass "GET /whoami → 200, has user_id"
  else
    fail "GET /whoami" "200 but missing user_id field"
  fi
elif [[ "$HTTP_CODE" == "401" ]]; then
  fail "GET /whoami" "401 — token is invalid or expired"
else
  fail "GET /whoami" "got $HTTP_CODE"
fi

# GET /me — used by api/account.ts, hooks/useAuth.ts
api GET /me
if [[ "$HTTP_CODE" == "200" ]]; then
  CHECKS=0
  echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
checks = 0
assert 'user' in d, 'missing user'
checks += 1
assert 'org' in d, 'missing org'
checks += 1
assert 'id' in d['user'], 'missing user.id'
checks += 1
assert 'email' in d['user'], 'missing user.email'
checks += 1
assert 'name' in d['user'], 'missing user.name'
checks += 1
assert 'id' in d['org'], 'missing org.id'
checks += 1
assert 'name' in d['org'], 'missing org.name'
checks += 1
assert 'slug' in d['org'], 'missing org.slug'
checks += 1
assert 'account_type' in d['org'], 'missing org.account_type'
checks += 1
assert 'entitlements' in d, 'missing entitlements'
checks += 1
print(f'all {checks} fields present')
" 2>&1 && pass "GET /me → 200, correct shape" || fail "GET /me" "200 but wrong shape: $(echo "$BODY" | head -c 200)"
else
  fail "GET /me" "got $HTTP_CODE"
fi

# ─────────────────────────────────────────────
echo "── Review (paid) ──"
# ─────────────────────────────────────────────

# POST /review — used by api/review.ts (reviewPaid)
api POST /review '{"text":"This agreement shall be governed by the laws of Singapore. The parties agree to submit to the exclusive jurisdiction of the Singapore courts. Either party may terminate this agreement with 30 days written notice."}'
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" || "$HTTP_CODE" == "202" ]]; then
  JOB_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('job_id',''))" 2>/dev/null)
  if [[ -n "$JOB_ID" && "$JOB_ID" != "None" ]]; then
    pass "POST /review → $HTTP_CODE, job_id=$JOB_ID"
  else
    fail "POST /review" "$HTTP_CODE but no job_id in response"
  fi
elif [[ "$HTTP_CODE" == "422" ]]; then
  fail "POST /review" "422 validation error: $(echo "$BODY" | head -c 200)"
else
  fail "POST /review" "got $HTTP_CODE"
fi

# ─────────────────────────────────────────────
echo "── Jobs ──"
# ─────────────────────────────────────────────

# GET /jobs — used by api/jobs.ts (listJobs)
api GET /jobs
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert 'jobs' in d, 'missing jobs array'
if len(d['jobs']) > 0:
  j = d['jobs'][0]
  assert 'id' in j, 'missing id'
  assert 'type' in j, 'missing type'
  assert 'status' in j, 'missing status'
  print(f'has {len(d[\"jobs\"])} jobs, shape OK')
else:
  print('empty jobs list (OK)')
" 2>&1 && pass "GET /jobs → 200, correct shape" || fail "GET /jobs" "wrong shape"
else
  fail "GET /jobs" "got $HTTP_CODE"
fi

# GET /jobs?status=completed — filtered
api GET "/jobs?status=completed"
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "GET /jobs?status=completed → 200"
else
  fail "GET /jobs?status=completed" "got $HTTP_CODE"
fi

# GET /jobs?type=review — filtered
api GET "/jobs?type=review"
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "GET /jobs?type=review → 200"
else
  fail "GET /jobs?type=review" "got $HTTP_CODE"
fi

# GET /jobs/{id} — used by lib/polling.ts
if [[ -n "${JOB_ID:-}" && "$JOB_ID" != "None" ]]; then
  api GET "/jobs/$JOB_ID"
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert d.get('id') == '$JOB_ID', f'wrong id: {d.get(\"id\")}'
assert d.get('status') in ('queued','running','completed','failed'), f'bad status: {d.get(\"status\")}'
print(f'status={d[\"status\"]}')
" 2>&1 && pass "GET /jobs/$JOB_ID → 200, valid status" || fail "GET /jobs/$JOB_ID" "wrong shape"
  else
    fail "GET /jobs/$JOB_ID" "got $HTTP_CODE"
  fi

  # GET /jobs/{id}/result — used by lib/polling.ts, api/jobs.ts
  # Only test if job is completed
  JOB_STATUS=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
  if [[ "$JOB_STATUS" == "completed" ]]; then
    api GET "/jobs/$JOB_ID/result"
    if [[ "$HTTP_CODE" == "200" ]]; then
      pass "GET /jobs/$JOB_ID/result → 200"
    else
      fail "GET /jobs/$JOB_ID/result" "got $HTTP_CODE"
    fi
  else
    skip "GET /jobs/{id}/result" "job not yet completed (status=$JOB_STATUS)"
  fi
else
  skip "GET /jobs/{id}" "no job_id from POST /review"
  skip "GET /jobs/{id}/result" "no job_id"
fi

# ─────────────────────────────────────────────
echo "── Clause Databases ──"
# ─────────────────────────────────────────────

# GET /clause-databases — used by api/clauses.ts
api GET /clause-databases
if [[ "$HTTP_CODE" == "200" ]]; then
  DB_ID=$(echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert 'databases' in d, 'missing databases'
dbs = d['databases']
print(dbs[0]['id'] if len(dbs) > 0 else '')
print(f'  ({len(dbs)} databases)', file=sys.stderr)
" 2>&1)
  pass "GET /clause-databases → 200"
else
  fail "GET /clause-databases" "got $HTTP_CODE"
  DB_ID=""
fi

# GET /clause-databases/{id}/clauses — used by api/clauses.ts
if [[ -n "$DB_ID" && "$DB_ID" != "" ]]; then
  api GET "/clause-databases/$DB_ID/clauses"
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert 'clauses' in d, 'missing clauses'
if len(d['clauses']) > 0:
  c = d['clauses'][0]
  assert 'id' in c and 'name' in c and 'content' in c
  print(f'{len(d[\"clauses\"])} clauses, shape OK')
else:
  print('empty (OK)')
" 2>&1 && pass "GET /clause-databases/$DB_ID/clauses → 200" || fail "GET /clause-databases/$DB_ID/clauses" "wrong shape"
  else
    fail "GET /clause-databases/$DB_ID/clauses" "got $HTTP_CODE"
  fi

  # POST /clause-databases/{id}/suggest — used by api/clauses.ts
  api POST "/clause-databases/$DB_ID/suggest" '{"context":"indemnification"}'
  if [[ "$HTTP_CODE" == "200" ]]; then
    pass "POST /clause-databases/$DB_ID/suggest → 200"
  elif [[ "$HTTP_CODE" == "404" ]]; then
    skip "POST /clause-databases/{id}/suggest" "endpoint may not be deployed"
  else
    fail "POST /clause-databases/$DB_ID/suggest" "got $HTTP_CODE"
  fi
else
  skip "GET /clause-databases/{id}/clauses" "no databases found"
  skip "POST /clause-databases/{id}/suggest" "no databases found"
fi

# ─────────────────────────────────────────────
echo "── Legal Requests (Mammoth) ──"
# ─────────────────────────────────────────────

# GET /legal-requests — used by api/mammoth.ts
api GET /legal-requests
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "$BODY" | python3 -c "
import json, sys
d = json.load(sys.stdin)
assert 'requests' in d, 'missing requests'
assert 'total' in d, 'missing total'
print(f'{d[\"total\"]} requests')
" 2>&1 && pass "GET /legal-requests → 200, correct shape" || fail "GET /legal-requests" "wrong shape"
else
  fail "GET /legal-requests" "got $HTTP_CODE"
fi

# POST /legal-requests — used by api/mammoth.ts
api POST /legal-requests '{"request_type":"review","title":"Integration test request","description":"Automated test — safe to delete","priority":"low"}'
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" ]]; then
  REQ_ID=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  if [[ -n "$REQ_ID" && "$REQ_ID" != "None" ]]; then
    pass "POST /legal-requests → $HTTP_CODE, id=$REQ_ID"
  else
    fail "POST /legal-requests" "$HTTP_CODE but no id"
  fi
else
  fail "POST /legal-requests" "got $HTTP_CODE"
fi

# GET /legal-requests/{id} — used by api/mammoth.ts
if [[ -n "${REQ_ID:-}" && "$REQ_ID" != "None" ]]; then
  api GET "/legal-requests/$REQ_ID"
  if [[ "$HTTP_CODE" == "200" ]]; then
    pass "GET /legal-requests/$REQ_ID → 200"
  else
    fail "GET /legal-requests/$REQ_ID" "got $HTTP_CODE"
  fi

  # POST /legal-requests/{id}/execute — used by api/mammoth.ts
  api POST "/legal-requests/$REQ_ID/execute" '{}'
  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "202" ]]; then
    pass "POST /legal-requests/$REQ_ID/execute → $HTTP_CODE"
  elif [[ "$HTTP_CODE" == "409" || "$HTTP_CODE" == "422" ]]; then
    # May fail if request is already in wrong state — still validates endpoint exists
    pass "POST /legal-requests/$REQ_ID/execute → $HTTP_CODE (expected state error)"
  else
    fail "POST /legal-requests/$REQ_ID/execute" "got $HTTP_CODE"
  fi
else
  skip "GET /legal-requests/{id}" "no request created"
  skip "POST /legal-requests/{id}/execute" "no request created"
fi

# ─────────────────────────────────────────────
echo "── Research (Full Analysis) ──"
# ─────────────────────────────────────────────

# POST /research — used by FullAnalysisPanel.tsx
api POST /research '{"query":"Analyze legal risks in standard NDA clauses"}'
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "201" || "$HTTP_CODE" == "202" ]]; then
  pass "POST /research → $HTTP_CODE"
elif [[ "$HTTP_CODE" == "404" ]]; then
  skip "POST /research" "endpoint not available"
else
  fail "POST /research" "got $HTTP_CODE"
fi

# ─────────────────────────────────────────────
echo "── Auth Errors ──"
# ─────────────────────────────────────────────

# Test 401 with bad token
BAD_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid-token-xxx" \
  "${API_URL}/me")
if [[ "$BAD_CODE" == "401" ]]; then
  pass "GET /me with bad token → 401"
else
  fail "GET /me with bad token" "expected 401, got $BAD_CODE"
fi

# Test no auth header
NO_AUTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/me")
if [[ "$NO_AUTH_CODE" == "401" || "$NO_AUTH_CODE" == "403" ]]; then
  pass "GET /me with no auth → $NO_AUTH_CODE"
else
  fail "GET /me with no auth" "expected 401/403, got $NO_AUTH_CODE"
fi

# ─────────────────────────────────────────────
echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "  Skipped: $SKIP"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
  echo "SOME TESTS FAILED"
  exit 1
else
  echo "ALL TESTS PASSED"
  exit 0
fi
