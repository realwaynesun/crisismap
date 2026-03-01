# ACLED API Access — Status & Migration Notes

> Date: 2026-03-01

## Current Status: Blocked

ACLED API is **not accessible** with our current account. The existing `acled.ts` source
returns empty results because we have no valid `ACLED_API_KEY`.

## What Happened

1. **Old API key system deprecated** — ACLED retired the `key=xxx&email=xxx` query string
   authentication in September 2025. Our `acled.ts` still uses this legacy format.

2. **New auth system: OAuth tokens** — ACLED now requires OAuth token-based auth
   (`POST /oauth/token` → `Authorization: Bearer xxx`). Token valid 24h, refresh valid 14d.

3. **Free tier (Open myACLED) has no API access** — Our account (`ewanesun@gmail.com`)
   was registered with Gmail and auto-assigned to "Open myACLED" tier. This tier only
   provides dashboard access and aggregated data downloads. **API access is restricted to
   higher tiers** (Research, Partner, Enterprise).

4. **Gmail = lowest tier** — ACLED auto-classifies public email domains (Gmail, Yahoo, etc.)
   as Open tier. Institutional emails (university, organization) get higher default access.

## What We Tried

| Method | Result |
|--------|--------|
| OAuth token (`POST /oauth/token`) | Token issued successfully |
| Bearer token → `/api/acled/read` | `"Access denied"` |
| Cookie-based auth (`POST /user/login`) | Session created, uid=163709 |
| Session cookie → `/api/acled/read` | `"Access denied"` |

Authentication works fine — the account simply lacks API permissions.

## Options to Unblock

### Option A: Request API access upgrade
Email `access@acleddata.com` explaining the use case (crisis monitoring research tool).
They may upgrade the account to Research tier.

### Option B: Register with institutional email
A `.edu` or organization email automatically qualifies for Research-level access
with full API.

### Option C: Use GDELT as alternative
[GDELT](https://www.gdeltproject.org/) provides similar conflict event data with:
- Free, unlimited API access
- No registration required
- Real-time updates (15-minute lag)
- Global coverage with geocoding
- REST API: `https://api.gdeltproject.org/api/v2/doc/doc?query=...&format=json`

### Option D: Use ACLED CSV exports
Open myACLED allows manual CSV data downloads. We could set up a periodic download
pipeline, but this is less ideal than real-time API access.

## Code Impact

If we get API access, `src/lib/sources/acled.ts` needs migration:

```diff
- // Legacy: key + email in query string
- const url = `https://api.acleddata.com/acled/read?key=${key}&email=${email}&...`

+ // New: OAuth token in Authorization header
+ const tokenRes = await fetch('https://acleddata.com/oauth/token', {
+   method: 'POST',
+   body: new URLSearchParams({
+     username: email,
+     password: password,
+     grant_type: 'password',
+     client_id: 'acled',
+   }),
+ })
+ const { access_token } = await tokenRes.json()
+ const url = `https://acleddata.com/api/acled/read?_format=json&...`
+ const res = await fetch(url, {
+   headers: { Authorization: `Bearer ${access_token}` },
+ })
```

Env vars change: `ACLED_API_KEY` → `ACLED_PASSWORD` (already added to `.env.local`).
