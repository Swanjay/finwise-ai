# 🔍 FinWise Full Audit Report
## https://finny.biz.id | June 19, 2026

---

## 🔴 CRITICAL (4 issues)

### 1. Vercel Preview URL Public + Wildcard CORS
- `finwise-ai-teal.vercel.app` is publicly accessible
- Returns `Access-Control-Allow-Origin: *`
- Any website can make cross-origin requests to preview deployment
- **Fix:** Enable Vercel Deployment Protection (Password/Auth)

### 2. API Key Exposed in URL Query String
- File: `app/api/advisor/route.ts:362`
- Gemini API key appended as `?key=${key}` — visible in server logs, CDN cache, browser history
- **Fix:** Use `Authorization` or `x-goog-api-key` header instead

### 3. TypeScript Build Errors Silently Ignored
- File: `next.config.mjs:3-5`
- `typescript: { ignoreBuildErrors: true }` hides all type errors in production
- **Fix:** Set to `false` and fix actual type errors

### 4. In-Memory OTP Store (Not Production-Ready)
- File: `app/api/telegram-login/route.ts:12`
- OTP codes in `Map<>` — lost on Vercel cold start
- User on instance A, verify on instance B = fails
- **Fix:** Use Redis/Upstash or Supabase for OTP storage

---

## 🟠 HIGH (5 issues)

### 5. CSP Allows `unsafe-eval` + `unsafe-inline`
- `script-src` has both — effectively nullifies XSS protection
- **Fix:** Use nonce-based CSP (Next.js supports this)

### 6. 25 console.log Statements in Production
- `scan-receipt/route.ts` leaks OCR text to server logs
- Various SW registration logs
- **Fix:** Remove all console.log, keep console.error for debugging

### 7. Hardcoded URLs (Not Using Env Vars)
- `layout.tsx` — `https://finny.biz.id` hardcoded as metadataBase
- `next.config.mjs` — both domains hardcoded in CSP/CORS
- `capacitor.config.ts` — Vercel URL hardcoded
- **Fix:** Use `process.env.NEXT_PUBLIC_APP_URL` everywhere

### 8. CORS Hardcoded to Single Origin
- `next.config.mjs:61` — `Access-Control-Allow-Origin: https://finny.biz.id`
- Won't work for dev/staging environments
- **Fix:** Use dynamic origin from env var

### 9. No Input Validation on Backup Import
- `app/page.tsx:184-201` — parses JSON, writes directly to localStorage
- Malicious backup files could inject arbitrary data
- **Fix:** Validate structure with Zod before importing

---

## 🟡 MEDIUM (8 issues)

### 10. Auth Provider Enumeration
- `/api/auth/providers` publicly exposes auth methods + callback URLs

### 11. Supabase Wildcard in CSP
- `*.supabase.co` in connect-src — should be specific project URL

### 12. PIN Stored in Plain Text (localStorage)
- `fw.pin.v1` — readable via DevTools or XSS
- **Fix:** Hash PIN before storing

### 13. Non-JSON POST Returns HTTP 500
- `/api/telegram-login` with wrong Content-Type = 500 instead of 400

### 14. Missing Error Boundaries
- Global `app/error.tsx` exists but no per-component boundaries
- One component crash can take down the whole app

### 15. Hardcoded Background Colors
- `about/page.tsx` and `mascot.tsx` use `bg-[#F5F3FF]` — breaks in dark mode

### 16. Missing COOP/COEP/CORP Headers
- No Cross-Origin-Opener-Policy, Embedder-Policy, or Resource-Policy

### 17. No Custom 404 Page for Unauthenticated Users
- 404 paths redirect to login — no "page not found" experience

---

## 🟢 LOW (6 issues)

- `camera=(self)` in Permissions-Policy (intentional for scan receipt)
- `unsafe-inline` in style-src (minor CSS injection risk)
- No CSP violation reporting (`report-uri`/`report-to`)
- Accessibility: empty alt text on avatars, no aria-labels on icon buttons
- Supabase placeholder client created silently when env vars missing
- Service Worker cache exposes app routes (`/expenses`, `/reports`, `/score`)

---

## ✅ WHAT'S WORKING WELL

- **SSL/TLS:** TLS 1.3, strong ciphers, HSTS with preload
- **Security Headers:** Full suite (X-Frame-Options DENY, X-Content-Type-Options nosniff, etc.)
- **API Protection:** All sensitive endpoints return 401 for unauthenticated users
- **Rate Limiting:** Active on login endpoints (~13 req/min threshold, 429 response)
- **CSRF Protection:** NextAuth CSRF tokens properly enforced
- **No Debug Endpoints Exposed:** .env, .git, /admin all redirect to login
- **Cloudflare Proxy:** Active with origin IP protection
- **Input Validation:** API routes use Zod validation
- **HMAC Signature Verification:** Telegram auth properly verified
- **PWA:** Manifest, service worker, offline support all configured
- **Performance:** Static assets <60ms, API endpoints 300-400ms

---

## 📊 SUMMARY BY SEVERITY

🔴 Critical: 4
🟠 High: 5
🟡 Medium: 8
🟢 Low: 6
✅ Positive: 11

## 🎯 PRIORITY FIX ORDER

1. Disable Vercel preview public access (5 min)
2. Move Gemini API key to header (15 min)
3. Set `ignoreBuildErrors: false` (1 min)
4. Replace CSP unsafe-eval/inline with nonces (30 min)
5. Move all hardcoded URLs to env vars (20 min)
6. Remove console.log statements (10 min)
7. Add OTP persistence (Redis/Supabase) (1 hr)
8. Add backup import validation (15 min)
9. Hash PIN in localStorage (20 min)
10. Add component error boundaries (30 min)
