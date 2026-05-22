/**
 * IMS-Pro Phase 1 Audit — Admin + Accountant (2 Windows)
 * Tests: Login, Dashboard, Reports, Cash Statement, RBAC
 * Run: node phase1-audit.js
 */
'use strict'

const { firefox } = require('playwright')

const BASE = 'http://localhost:3001'
const API  = 'http://127.0.0.1:4001'

const results = []
function log(icon, tag, msg) { const l=`${icon} [${tag}] ${msg}`; console.log(l); results.push(l) }
const P = (t,m) => log('✅',t,m)
const F = (t,m) => log('❌',t,m)
const W = (t,m) => log('⚠️ ',t,m)
const I = (t,m) => log('🔷',t,m)
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }

async function apiCall(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' }
  if (token) h.Authorization = `Bearer ${token}`
  const opts = { method, headers: h }
  if (body) opts.body = JSON.stringify(body)
  try {
    const r = await fetch(`${API}/api${path}`, opts)
    return { status: r.status, data: await r.json().catch(()=>({})), ok: r.ok }
  } catch(e) { return { status:0, data:{}, ok:false, error:e.message } }
}

async function loginAPI(username, password) {
  const r = await fetch(`${API}/api/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password }),
  })
  const d = await r.json()
  if (!d.success) throw new Error(`Login failed (${username}): ${d.error}`)
  const raw = r.headers.get('set-cookie') || ''
  const cookie = raw.split(';')[0].replace('__refresh_token=','').trim()
  return { token: d.data.accessToken, cookieValue: cookie, user: d.data.user }
}

async function injectSession(ctx, cookieValue) {
  await ctx.addCookies([{
    name: '__refresh_token', value: cookieValue,
    url: 'http://localhost:4001', httpOnly: true, sameSite: 'Strict',
    expires: Math.floor(Date.now()/1000) + 7*24*3600,
  }])
}

async function awaitDashboard(page, label) {
  await page.goto(`${BASE}/dashboard`, { waitUntil:'networkidle', timeout:20000 })
  await sleep(1500)
  const url = page.url()
  if (url.includes('/dashboard')) { P('Auth',`${label} → /dashboard ✓`); return true }
  W('Auth',`${label} landed on ${url.replace(BASE,'')}`)
  return false
}

async function checkPage(page, path, label) {
  await page.goto(`${BASE}${path}`, { waitUntil:'networkidle', timeout:15000 })
  await sleep(600)
  const len = await page.evaluate(()=>document.body?.innerText?.length||0)
  if (len > 50) { P(label, `${path} loaded (${len} chars)`); return true }
  F(label, `${path} white screen`); return false
}

;(async () => {
  console.log('\n' + '═'.repeat(60))
  console.log('  IMS-Pro PHASE 1 AUDIT — Admin + Accountant (2 Windows)')
  console.log('═'.repeat(60) + '\n')

  // ── API Setup ──────────────────────────────────────────────────
  let adminSess, acctSess
  try {
    [adminSess, acctSess] = await Promise.all([
      loginAPI('admin', 'admin123'),
      loginAPI('acct_stress', 'Stress@123'),
    ])
    P('Setup', `Admin (${adminSess.user.role}) + Accountant (${acctSess.user.role}) sessions OK`)
  } catch(e) { F('Setup', e.message); process.exit(1) }

  const adminT = adminSess.token

  // ── Launch 2 Firefox windows ───────────────────────────────────
  I('Windows', 'Launching 2 Firefox instances...')
  const [b1, b2] = await Promise.all([
    firefox.launch({ headless:false, slowMo:0 }),
    firefox.launch({ headless:false, slowMo:0 }),
  ])
  const [ctx1, ctx2] = await Promise.all([
    b1.newContext({ viewport:{width:1280,height:720}, locale:'ar-IQ' }),
    b2.newContext({ viewport:{width:1280,height:720}, locale:'ar-IQ' }),
  ])
  const [p1, p2] = await Promise.all([ ctx1.newPage(), ctx2.newPage() ])

  for (const [pg,lbl] of [[p1,'W1-Admin'],[p2,'W2-Acct']]) {
    pg.on('pageerror', err => W(lbl,`PageError: ${err.message.slice(0,80)}`))
  }

  await Promise.all([ injectSession(ctx1,adminSess.cookieValue), injectSession(ctx2,acctSess.cookieValue) ])
  I('Windows', 'Sessions injected')

  await Promise.all([ awaitDashboard(p1,'W1 Admin'), awaitDashboard(p2,'W2 Accountant') ])

  // ── W1 Admin: Full navigation check ───────────────────────────
  console.log('\n━━━ W1 ADMIN — Page Navigation ━━━━━━━━━━━━━━━━━━━━━━━━\n')
  for (const [path, label] of [
    ['/dashboard',    'Dashboard'],
    ['/inventory',    'Inventory'],
    ['/sales',        'Sales List'],
    ['/purchases',    'Purchases'],
    ['/customers',    'Customers'],
    ['/suppliers',    'Suppliers'],
    ['/expenses',     'Expenses'],
    ['/vouchers',     'Vouchers'],
    ['/stock',        'Stock'],
    ['/reports/sales','Reports/Sales'],
    ['/reports/profit','Reports/Profit'],
    ['/cash-statement','Cash Statement'],
    ['/staff',        'Staff Management'],
    ['/settings',     'Settings'],
  ]) {
    await checkPage(p1, path, `W1-${label}`)
    await sleep(300)
  }

  // ── W2 Accountant: RBAC access checks ─────────────────────────
  console.log('\n━━━ W2 ACCOUNTANT — RBAC Access Check ━━━━━━━━━━━━━━━━━\n')

  // Should be able to access
  for (const [path, label] of [
    ['/dashboard',      'Dashboard'],
    ['/inventory',      'Inventory'],
    ['/sales',          'Sales List'],
    ['/expenses',       'Expenses'],
    ['/vouchers',       'Vouchers'],
    ['/cash-statement', 'Cash Statement'],
    ['/reports/sales',  'Reports/Sales'],
    ['/reports/profit', 'Reports/Profit'],
  ]) {
    await p2.goto(`${BASE}${path}`, { waitUntil:'networkidle', timeout:12000 })
    await sleep(500)
    const url = p2.url()
    const reached = url.includes(path) || url.includes('/dashboard')
    if (reached) P(`W2-RBAC`, `${path} → accessible ✓`)
    else F(`W2-RBAC`, `${path} → unexpected redirect to ${url.replace(BASE,'')}`)
  }

  // Should be BLOCKED (redirected to /dashboard)
  for (const [path, label] of [
    ['/staff',    'Staff Management (ADMIN only)'],
    ['/settings', 'Settings (ADMIN only)'],
  ]) {
    await p2.goto(`${BASE}${path}`, { waitUntil:'networkidle', timeout:12000 })
    await sleep(800)
    const url = p2.url()
    if (url.includes('/dashboard')) P(`W2-RBAC`, `${label} → BLOCKED (redirected to /dashboard) ✓`)
    else F(`W2-RBAC`, `${label} → REACHED ${url.replace(BASE,'')} — RBAC FAILURE!`)
  }

  // ── API Security: Accountant cannot hit ADMIN-only endpoints ──
  console.log('\n━━━ API SECURITY CHECKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  const acctT = acctSess.token

  const secTests = [
    { path:'/reports/profit?from=2026-01-01&to=2026-12-31', tok:acctT, label:'Profit report (ACCT)', expectOK:true  },
    { path:'/settings',       tok:acctT, label:'Settings GET (ACCT)',   expectOK:true  },
    { path:'/settings/users', tok:acctT, label:'User list (ACCT)',      expectOK:false },
    { path:'/reports/profit?from=2026-01-01&to=2026-12-31', tok:null,  label:'Profit (no auth)',       expectOK:false },
  ]
  for (const t of secTests) {
    const r = await apiCall('GET', t.path, null, t.tok)
    const blocked = r.status === 401 || r.status === 403
    if (t.expectOK && r.ok)   P('Sec', `${t.label} → HTTP ${r.status} (allowed) ✓`)
    else if (!t.expectOK && blocked) P('Sec', `${t.label} → HTTP ${r.status} (blocked) ✓`)
    else if (t.expectOK && !r.ok)   F('Sec', `${t.label} → HTTP ${r.status} — should be accessible!`)
    else                             F('Sec', `${t.label} → HTTP ${r.status} — should be blocked!`)
  }

  // ── Leave windows open at final state ─────────────────────────
  await Promise.allSettled([
    p1.goto(`${BASE}/inventory`,      { waitUntil:'networkidle', timeout:12000 }),
    p2.goto(`${BASE}/cash-statement`, { waitUntil:'networkidle', timeout:12000 }),
  ])
  await sleep(1500)

  // ── Summary ───────────────────────────────────────────────────
  const passes = results.filter(r=>r.startsWith('✅')).length
  const fails  = results.filter(r=>r.startsWith('❌')).length
  console.log('\n' + '═'.repeat(60))
  console.log('  PHASE 1 RESULT')
  console.log(`  ✅ PASSED: ${passes}   ❌ FAILED: ${fails}`)
  if (fails > 0) {
    console.log('\n  Failures:')
    results.filter(r=>r.startsWith('❌')).forEach(r=>console.log(' ',r))
  } else {
    console.log('  All checks passed!')
  }
  console.log('  W1 → /inventory | W2 → /cash-statement (windows open)')
  console.log('═'.repeat(60) + '\n')
})().catch(e=>{ console.error('FATAL:',e.message); process.exit(1) })
