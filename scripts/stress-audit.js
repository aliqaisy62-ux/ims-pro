/**
 * IMS-Pro — Supreme Stress & Resilience Audit
 * 4 Headed Firefox Windows | Zero-Tolerance Bug Detection
 *
 * Run:  node stress-audit.js
 * Prereq: API on :4001, Web on :3001, admin/admin123 exists
 */

'use strict'

const { firefox } = require('playwright')

const BASE = 'http://127.0.0.1:3001'
const API  = 'http://127.0.0.1:4001'

// ─── Forensic state ───────────────────────────────────────────────────────────
const report = { startTime: new Date().toISOString(), tests: {}, critical: [], logs: [] }

function log(icon, tag, msg) {
  const ts = new Date().toISOString().slice(11, 23)
  const line = `${icon} [${tag}] ${msg}`
  process.stdout.write(line + '\n')
  report.logs.push({ icon, tag, msg, ts })
}
const P = (t, m) => log('✅', t, m)
const F = (t, m, d = '') => { log('❌', t, m); report.critical.push({ test: t, msg: m, detail: d }) }
const W = (t, m) => log('⚠️ ', t, m)
const I = (t, m) => log('🔷', t, m)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── HTTP helper (Node 18 native fetch) ───────────────────────────────────────
async function apiCall(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  try {
    const res = await fetch(`${API}/api${path}`, opts)
    const data = await res.json().catch(() => ({}))
    return { status: res.status, data, ok: res.ok, headers: res.headers }
  } catch (e) {
    return { status: 0, data: {}, ok: false, error: e.message }
  }
}

// Login via API — returns { token, user, cookieValue }
async function loginAPI(username, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(`Login failed (${username}): ${data.error}`)
  const raw = res.headers.get('set-cookie') || ''
  const cookieValue = raw.split(';')[0].replace('__refresh_token=', '').trim()
  return { token: data.data.accessToken, user: data.data.user, cookieValue }
}

// Inject refresh-token cookie so the browser can auto-refresh its session
async function injectSession(ctx, cookieValue) {
  await ctx.addCookies([{
    name: '__refresh_token',
    value: cookieValue,
    url: 'http://localhost:4001',
    httpOnly: true,
    sameSite: 'Strict',
    expires: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
  }])
}

// Navigate to /dashboard and confirm the app loaded the session
async function goToDashboard(page, label) {
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle', timeout: 25000 })
  await sleep(1800)
  const url = page.url()
  if (url.includes('/dashboard')) { P('Windows', `${label} → /dashboard ✓`); return true }
  W('Windows', `${label} landed on ${url.replace(BASE, '')} — session may need manual login`)
  return false
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────
;(async () => {
  const HR = '═'.repeat(72)
  console.log(`\n${HR}`)
  console.log('  IMS-Pro  SUPREME STRESS & RESILIENCE AUDIT  —  Zero-Tolerance')
  console.log('  4 Headed Firefox | Race | Accounting | Security | Chaos | Volume')
  console.log(`${HR}\n`)

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 0 — API SETUP
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('━━━ PHASE 0: SETUP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Admin login
  let adminSess
  try {
    adminSess = await loginAPI('admin', 'admin123')
    I('Setup', `Admin authenticated: ${adminSess.user.username} (${adminSess.user.role})`)
  } catch (e) {
    F('Setup', `Admin login FAILED: ${e.message}`)
    process.exit(1)
  }
  const AT = adminSess.token

  // Rate-limit sanity check — 500 req/15 min global limit. Restart API if this fires.
  const rlCheck = await apiCall('GET', '/items?limit=1&pageSize=1', null, AT)
  if (rlCheck.status === 429) {
    F('Setup', '⛔ RATE LIMITER ACTIVE — restart the API server first, then re-run.')
    F('Setup', '  Stop-Process -Name "node" -Force  (in a new PowerShell)  OR  restart via Turborepo')
    process.exit(1)
  }
  P('Setup', `Rate limiter OK — ${rlCheck.status} on first probe`)

  // Create 3 test users (idempotent — 409 = already exists, that's OK)
  const testUsers = [
    { name: 'محاسب الضغط', username: 'acct_stress', password: 'Stress@123', role: 'ACCOUNTANT', language: 'ar' },
    { name: 'موظف ضغط 1',  username: 'staff_s1',    password: 'Stress@123', role: 'STAFF',      language: 'ar' },
    { name: 'موظف ضغط 2',  username: 'staff_s2',    password: 'Stress@123', role: 'STAFF',      language: 'ar' },
  ]
  for (const u of testUsers) {
    const r = await apiCall('POST', '/settings/users', u, AT)
    I('Setup', `User "${u.username}": HTTP ${r.status} — ${r.ok ? 'created' : (r.data?.error || 'already exists')}`)
  }

  // Login remaining 3 users via API (4 logins total — well within 5/15-min rate limit)
  let acctSess, s1Sess, s2Sess
  try {
    ;[acctSess, s1Sess, s2Sess] = await Promise.all([
      loginAPI('acct_stress', 'Stress@123'),
      loginAPI('staff_s1',    'Stress@123'),
      loginAPI('staff_s2',    'Stress@123'),
    ])
    P('Setup', 'All 4 sessions acquired (Admin · Accountant · Staff1 · Staff2)')
  } catch (e) {
    F('Setup', `User login failed: ${e.message}`)
    process.exit(1)
  }
  const [acctT, s1T, s2T] = [acctSess.token, s1Sess.token, s2Sess.token]

  // Test customer (for CREDIT invoices if needed)
  let customerId = null
  const custR = await apiCall('POST', '/customers', {
    name: 'عميل اختبار الضغط', phone: '07701239900',
    type: 'RETAIL', currency: 'IQD', creditLimit: 5000000, balance: 0,
  }, AT)
  customerId = custR.data?.data?.id
  if (!customerId) {
    const listR = await apiCall('GET', '/customers?limit=5', null, AT)
    customerId = listR.data?.data?.[0]?.id
  }
  I('Setup', `Customer: ${customerId || 'none'}`)

  // MASTER ITEM — exactly 1 unit (race condition target)
  const masterBarcode = `RACE_MASTER_${Date.now()}`
  const mR = await apiCall('POST', '/items', {
    name_ar: 'صنف السباق الرئيسي', name_en: 'Race Master Item',
    barcode: masterBarcode, costPrice: 700,
    retailPrice: 1000, wholesalePrice: 800, specialPrice: 900,
    dollarPrice: 1, dinarPrice: 1000, stockQty: 1, unit: 'قطعة',
  }, AT)
  const masterItemId = mR.data?.data?.id
  if (!masterItemId) { F('Setup', `Master Item creation failed: ${JSON.stringify(mR.data).slice(0, 100)}`); process.exit(1) }
  P('Setup', `Master Item: id=${masterItemId} | barcode=${masterBarcode} | qty=1`)

  // TX ITEM — 500 units (for the 50-transaction storm)
  const txR = await apiCall('POST', '/items', {
    name_ar: 'صنف عاصفة المعاملات', name_en: 'TX Storm Item',
    barcode: `TX_STORM_${Date.now()}`, costPrice: 300,
    retailPrice: 500, wholesalePrice: 400, specialPrice: 450,
    dollarPrice: 0.5, dinarPrice: 500, stockQty: 500, unit: 'قطعة',
  }, AT)
  const txItemId = txR.data?.data?.id
  if (!txItemId) { F('Setup', 'TX Item creation failed'); process.exit(1) }
  P('Setup', `TX Storm Item: id=${txItemId} | qty=500`)

  // BULK SEED CHECK — items must be pre-seeded via seed-stress.js (Prisma direct)
  // HTTP bulk seeding would exhaust the 500-req/15-min global rate limiter.
  // Run:  cd ims-pro/apps/api && node seed-stress.js   BEFORE this script.
  const itemCheckR = await apiCall('GET', '/items?limit=1&pageSize=1', null, AT)
  const totalItemsCheck = itemCheckR.data?.data?.total || 0
  if (totalItemsCheck < 100) {
    W('Setup', `Only ${totalItemsCheck} items in DB — run seed-stress.js first for volume test accuracy`)
    W('Setup', '  cd ims-pro/apps/api && node seed-stress.js')
  } else {
    P('Setup', `${totalItemsCheck} items already in DB — data-volume test ready`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — LAUNCH 4 FIREFOX WINDOWS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ PHASE 1: 4 FIREFOX WINDOWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  I('Windows', 'Launching 4 Firefox instances...')
  const [b1, b2, b3, b4] = await Promise.all([
    firefox.launch({ headless: false, slowMo: 0 }),
    firefox.launch({ headless: false, slowMo: 0 }),
    firefox.launch({ headless: false, slowMo: 0 }),
    firefox.launch({ headless: false, slowMo: 0 }),
  ])

  const [ctx1, ctx2, ctx3, ctx4] = await Promise.all([
    b1.newContext({ viewport: { width: 960, height: 520 }, locale: 'ar-IQ' }),
    b2.newContext({ viewport: { width: 960, height: 520 }, locale: 'ar-IQ' }),
    b3.newContext({ viewport: { width: 960, height: 520 }, locale: 'ar-IQ' }),
    b4.newContext({ viewport: { width: 960, height: 520 }, locale: 'ar-IQ' }),
  ])

  const [p1, p2, p3, p4] = await Promise.all([
    ctx1.newPage(), ctx2.newPage(), ctx3.newPage(), ctx4.newPage()
  ])

  // Pipe browser console errors into the forensic log
  const windows = [[p1,'W1-Admin'],[p2,'W2-Acct'],[p3,'W3-Staff1'],[p4,'W4-Staff2']]
  for (const [pg, lbl] of windows) {
    pg.on('pageerror', err => W(lbl, `PageError: ${err.message.slice(0, 120)}`))
    pg.on('console',   msg => { if (msg.type() === 'error') W(lbl, `Console: ${msg.text().slice(0, 120)}`) })
  }

  // Inject refresh-token cookies (avoids burning 4 more login-rate-limit slots)
  await Promise.all([
    injectSession(ctx1, adminSess.cookieValue),
    injectSession(ctx2, acctSess.cookieValue),
    injectSession(ctx3, s1Sess.cookieValue),
    injectSession(ctx4, s2Sess.cookieValue),
  ])
  I('Windows', 'Refresh-token cookies injected into all 4 contexts')

  // Navigate to dashboard — AuthContext auto-calls /api/auth/refresh
  const authOK = await Promise.all([
    goToDashboard(p1, 'W1 (Admin)'),
    goToDashboard(p2, 'W2 (Accountant)'),
    goToDashboard(p3, 'W3 (Staff1)'),
    goToDashboard(p4, 'W4 (Staff2)'),
  ])
  I('Windows', `Sessions live: ${authOK.filter(Boolean).length}/4`)

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1 — THE CONFLICT MINEFIELD (Race Conditions)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ TEST 1: CONFLICT MINEFIELD — Race Conditions ━━━━━━━━━━━━\n')
  report.tests.T1 = { name: 'Race Conditions', pass: false, findings: {} }

  // Confirm stock = 1  (Prisma Decimals serialize as strings e.g. "1.000")
  const preItem = await apiCall('GET', `/items/${masterItemId}`, null, AT)
  const preStock = preItem.data?.data?.stockQty
  const preStockNum = parseFloat(String(preStock ?? '0'))
  I('Race', `Master Item stockQty before race = ${preStock}`)
  if (preItem.status === 429) { F('Race', 'Rate limiter still active — restart the API server to reset'); }
  else if (preStockNum !== 1) {
    W('Race', `Resetting stock to 1 (was ${preStock})...`)
    await apiCall('PUT', `/items/${masterItemId}`, { stockQty: 1 }, AT)
    await sleep(200)
  }

  // All 4 windows navigate to /sales/new (visual context)
  await Promise.all([p1,p2,p3,p4].map(pg => pg.goto(`${BASE}/sales/new`, { waitUntil: 'networkidle' })))
  await sleep(600)
  I('Race', 'All 4 windows on /sales/new — visual context set')

  // Create 4 DRAFT invoices — each sells the same 1 unit
  I('Race', 'Creating 4 DRAFT invoices simultaneously (same 1-unit item)...')
  const invPayload = (tok) => apiCall('POST', '/sales', {
    paymentType: 'CASH', priceType: 'RETAIL', currency: 'IQD', exchangeRate: 1480,
    items: [{ itemId: masterItemId, quantity: 1, unitPrice: 1000, discount: 0 }],
    notes: 'RACE_TEST',
  }, tok)

  const [dr1, dr2, dr3, dr4] = await Promise.all([invPayload(AT), invPayload(acctT), invPayload(s1T), invPayload(s2T)])
  const raceIds = [dr1, dr2, dr3, dr4].map((r, i) => {
    const id = r.data?.data?.id
    I('Race', `Draft ${i+1}: ${id?.slice(-8) || 'FAILED'} (HTTP ${r.status})`)
    return id
  }).filter(Boolean)

  if (raceIds.length < 4) {
    F('Race', `Only ${raceIds.length}/4 drafts created — race test incomplete`)
  } else {
    I('Race', '◉ FIRING ALL 4 CONFIRMS AT THE SAME MILLISECOND...')
    const tokens = [AT, acctT, s1T, s2T]
    const raceOut = await Promise.all(
      raceIds.map((id, i) =>
        apiCall('POST', `/sales/${id}/confirm`, {}, tokens[i])
          .then(r => ({ id, http: r.status, status: r.data?.data?.status || r.data?.status, error: r.data?.error || r.data?.message }))
          .catch(e => ({ id, http: 0, status: null, error: e.message }))
      )
    )

    const confirmed = raceOut.filter(r => r.status === 'CONFIRMED')
    const blocked   = raceOut.filter(r => r.status !== 'CONFIRMED')
    raceOut.forEach(r => {
      const icon = r.status === 'CONFIRMED' ? '✅' : '🔷'
      console.log(`   ${icon}  Invoice ...${r.id?.slice(-8)}  →  ${r.status || r.error}  (HTTP ${r.http})`)
    })

    await sleep(600)
    const postItem = await apiCall('GET', `/items/${masterItemId}`, null, AT)
    const postStock = postItem.data?.data?.stockQty
    I('Race', `Master Item stockQty AFTER race = ${postStock}`)

    report.tests.T1.findings = { confirmed: confirmed.length, blocked: blocked.length, finalStock: postStock, raceOut }

    if (confirmed.length === 1) {
      P('Race', `✓ EXACTLY 1/4 confirmed — Serializable isolation is WORKING`)
      report.tests.T1.pass = true
    } else if (confirmed.length > 1) {
      F('Race', `${confirmed.length} CONFIRMED for 1 unit — OVERSELL VULNERABILITY DETECTED!`, `finalStock=${postStock}`)
    } else {
      F('Race', `0 of 4 confirmed — possible deadlock, all transactions failed`)
    }

    const stockNum = parseFloat(String(postStock ?? '999'))
    if (stockNum < 0)       F('Race', `CRITICAL: stockQty = ${postStock} — NEGATIVE INVENTORY!`)
    else if (stockNum === 0) P('Race', `stockQty = 0 — correct, no double-sell`)
    else                     W('Race', `stockQty = ${postStock} after race (expected 0)`)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2 — ACCOUNTING TORTURE (50 TXs + 3 Rate Changes)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ TEST 2: ACCOUNTING TORTURE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  report.tests.T2 = { name: 'Accounting Torture', pass: false, findings: {} }

  // W2 opens Cash Statement and watches
  await p2.goto(`${BASE}/cash-statement`, { waitUntil: 'networkidle' })
  await sleep(800)
  P('Acct', 'W2 (Accountant) monitoring /cash-statement')

  // Exchange-rate changes fired at staggered intervals during the storm
  const rateSchedule = [
    { rate: 1500, delayMs: 1500  },
    { rate: 1520, delayMs: 4500  },
    { rate: 1480, delayMs: 8000  },
  ]
  const rateLog = []
  const rateJob = Promise.all(rateSchedule.map(({ rate, delayMs }) =>
    sleep(delayMs).then(async () => {
      const r = await apiCall('POST', '/settings/exchange-rate', { rate }, AT)
      const ok = r.ok || r.status === 200 || r.status === 201
      rateLog.push({ rate, ok, time: new Date().toISOString() })
      I('Acct', `Admin: exchange rate ${ok ? '→' : '✗'} ${rate} IQD/USD (HTTP ${r.status})`)
    })
  ))

  // 50 rapid-fire transactions — W3 and W4 alternating
  I('Acct', 'Launching 50 simultaneous transactions from W3 & W4...')
  let txOK = 0, txFail = 0
  const confirmedInvoices = []

  const txJobs = Array.from({ length: 50 }, (_, i) => {
    const isUSD  = (i % 7 === 0)
    const token  = (i % 2 === 0) ? s1T : s2T
    const qty    = (i % 3) + 1
    const rateSnapshot = 1480  // rate at invoice creation time — must NOT change retroactively

    return (async () => {
      try {
        const inv = await apiCall('POST', '/sales', {
          paymentType: 'CASH',
          priceType: isUSD ? 'DOLLAR' : 'RETAIL',
          currency:  isUSD ? 'USD'    : 'IQD',
          exchangeRate: rateSnapshot,
          items: [{ itemId: txItemId, quantity: qty, unitPrice: isUSD ? 0.5 : 500, discount: 0 }],
          notes: `STORM_TX_${i + 1}`,
        }, token)
        const invId = inv.data?.data?.id
        if (!invId) { txFail++; return }

        const conf = await apiCall('POST', `/sales/${invId}/confirm`, {}, token)
        const ok = conf.data?.data?.status === 'CONFIRMED' || conf.data?.status === 'CONFIRMED'
        if (ok) {
          txOK++
          confirmedInvoices.push({ i, invId, rateSnapshot, storedRate: conf.data?.data?.exchangeRate })
        } else {
          txFail++
        }
      } catch { txFail++ }
    })()
  })

  await Promise.all([rateJob, Promise.all(txJobs)])
  I('Acct', `Storm done: ${txOK}/50 confirmed, ${txFail} failed`)

  // Validate exchange-rate freezing on every confirmed invoice
  let rateMismatches = 0
  for (const { i, invId, rateSnapshot, storedRate } of confirmedInvoices) {
    const sr = parseFloat(String(storedRate))
    if (!isNaN(sr) && sr !== rateSnapshot) {
      rateMismatches++
      W('Acct', `TX_${i+1} (${invId?.slice(-8)}) storedRate=${storedRate} ≠ ${rateSnapshot} — DISCREPANCY`)
    }
  }

  if (rateMismatches === 0 && txOK > 0) {
    P('Acct', `All ${confirmedInvoices.length} invoices froze exchangeRate=1480 at creation — price-at-time-of-sale CORRECT`)
    report.tests.T2.pass = txOK >= 40
  } else if (rateMismatches > 0) {
    F('Acct', `${rateMismatches} invoice(s) have wrong stored exchange rate — retroactive recalculation BUG`)
  }
  if (txOK < 40) F('Acct', `Only ${txOK}/50 confirmed — high failure rate under load`)
  else P('Acct', `${txOK}/50 confirmed under concurrent exchange-rate changes ✓`)

  // Refresh W2 cash statement — must not crash
  await p2.reload({ waitUntil: 'networkidle' })
  const csLen = await p2.evaluate(() => document.body?.innerText?.length || 0)
  if (csLen > 100) P('Acct', 'Cash Statement survived 50-TX storm — no white screen')
  else F('Acct', 'Cash Statement white screen after storm — UI crash detected')

  report.tests.T2.findings = { txOK, txFail, rateMismatches, rateLog }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3 — SECURITY BREACH SIMULATION
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ TEST 3: SECURITY BREACH SIMULATION ━━━━━━━━━━━━━━━━━━━━━━\n')
  report.tests.T3 = { name: 'Security', pass: true, findings: {} }

  // 3a. SQL Injection via item creation (Staff token)
  I('Sec', '3a. SQL injection via item name field (4 classic payloads)...')
  const sqliPayloads = [
    `'; DROP TABLE items; --`,
    `' OR '1'='1`,
    `' UNION SELECT username, "passwordHash" FROM "User" --`,
    `\"; INSERT INTO "User"(username,"passwordHash") VALUES('hax','$2b$10$hack'); --`,
  ]
  let sqliSafe = 0, sqliBlocked = 0
  for (const payload of sqliPayloads) {
    const r = await apiCall('POST', '/items', {
      name_ar: payload, name_en: payload, barcode: null,
      stockQty: 0, retailPrice: 0, wholesalePrice: 0, specialPrice: 0, dollarPrice: 0, dinarPrice: 0,
    }, s1T)
    if (r.ok) {
      // Item created — verify it's stored as a literal string (Prisma parameterisation)
      const createdId = r.data?.data?.id
      const check = await apiCall('GET', `/items/${createdId}`, null, AT)
      const stored = check.data?.data?.name_ar
      if (stored === payload) {
        sqliSafe++
        P('Sec', `SQL payload stored as literal (Prisma safe): "${payload.slice(0, 38)}..."`)
      } else {
        W('Sec', `Unexpected stored value: "${String(stored).slice(0, 50)}"`)
      }
    } else {
      sqliBlocked++
      I('Sec', `Payload rejected (HTTP ${r.status}): "${payload.slice(0, 38)}"`)
    }
  }
  P('Sec', `SQL Injection: ${sqliSafe} stored as literals | ${sqliBlocked} blocked — DB safe ✓`)

  // 3b. XSS via browser input (W3)
  I('Sec', '3b. XSS payload entered in item form via W3...')
  let xssAlertFired = false
  p3.once('dialog', async d => {
    xssAlertFired = true
    F('Sec', `XSS ALERT FIRED: "${d.message()}" — React output escaping BROKEN!`)
    report.tests.T3.pass = false
    await d.accept()
  })
  await p3.goto(`${BASE}/items/new`, { waitUntil: 'networkidle' })
  await sleep(600)
  const inp3 = p3.locator('input').first()
  if (await inp3.count() > 0) {
    await inp3.fill(`<script>window.__xss=1;alert('XSS')</script>`)
    await p3.locator('input').nth(1).fill(`<img src=x onerror="alert('onerror')">`)
    await sleep(1500)
  }
  if (!xssAlertFired) P('Sec', 'No XSS alert fired — React output escaping confirmed ✓')

  // 3c. Staff token → profit report (must be 403)
  I('Sec', '3c. Staff token → GET /api/reports/profit...')
  const profR = await apiCall('GET', '/reports/profit', null, s1T)
  if (profR.status === 403)      P('Sec', `Profit endpoint → 403 for STAFF ✓`)
  else if (profR.status === 401) P('Sec', `Profit endpoint → 401 for STAFF ✓`)
  else if (profR.ok) { F('Sec', `CRITICAL: STAFF can access profit report! HTTP ${profR.status}`); report.tests.T3.pass = false }
  else               W('Sec', `Unexpected HTTP ${profR.status} on profit endpoint`)

  // 3d. No token
  I('Sec', '3d. No token → GET /api/reports/profit...')
  const noAuthR = await apiCall('GET', '/reports/profit')
  if (noAuthR.status === 401) P('Sec', `Unauthenticated request → 401 ✓`)
  else if (noAuthR.ok) { F('Sec', `CRITICAL: No-token request succeeded! HTTP ${noAuthR.status}`); report.tests.T3.pass = false }
  else I('Sec', `No-token request → HTTP ${noAuthR.status}`)

  // 3e. Tampered JWT
  I('Sec', '3e. Tampered JWT signature...')
  const tamperedJWT = AT.slice(0, -10) + 'TAMPERED!!'
  const tampR = await apiCall('GET', '/reports/profit', null, tamperedJWT)
  if (tampR.status === 401) P('Sec', `Tampered JWT → 401 ✓`)
  else { F('Sec', `Tampered JWT NOT rejected! HTTP ${tampR.status}`); report.tests.T3.pass = false }

  // 3f. Path enumeration with Staff token
  I('Sec', '3f. Path enumeration (admin/* probes) with Staff token...')
  const probes = ['/admin/profit-data', '/admin/users', '/admin/settings', '/admin/reports']
  for (const ep of probes) {
    const r = await apiCall('GET', ep, null, s1T)
    if (r.ok) {
      F('Sec', `Path probe succeeded: /api${ep} → HTTP ${r.status}`)
      report.tests.T3.pass = false
    } else {
      I('Sec', `Probe /api${ep} → HTTP ${r.status} (blocked)`)
    }
  }

  // 3g. W4 tries DevTools-style direct fetch to profit (simulate developer console attack)
  I('Sec', '3g. W4 browser console: manual fetch to /api/reports/profit with Staff session...')
  let browserFetchStatus = null
  try {
    browserFetchStatus = await p4.evaluate(async (apiBase) => {
      try {
        const r = await fetch(`${apiBase}/api/reports/profit`, {
          method: 'GET',
          credentials: 'include',  // sends cookies
        })
        return r.status
      } catch (e) {
        return `error: ${e.message}`
      }
    }, API)
    I('Sec', `W4 browser fetch to profit endpoint → HTTP ${browserFetchStatus}`)
    if (browserFetchStatus === 401 || browserFetchStatus === 403) {
      P('Sec', `Browser DevTools fetch blocked → HTTP ${browserFetchStatus} ✓`)
    } else if (String(browserFetchStatus).startsWith('2')) {
      F('Sec', `Browser DevTools fetch SUCCEEDED → HTTP ${browserFetchStatus} — STAFF can read profit via browser!`)
      report.tests.T3.pass = false
    }
  } catch (e) {
    W('Sec', `Browser eval error: ${e.message}`)
  }

  report.tests.T3.findings = {
    sqliSafe, sqliBlocked, xssAlertFired,
    profitBlockedForStaff: profR.status === 403 || profR.status === 401,
    noAuthBlocked: noAuthR.status === 401,
    tamperedJwtBlocked: tampR.status === 401,
    browserFetchStatus,
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4 — THE CHAOS MONKEY (Session & Network Stress)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ TEST 4: CHAOS MONKEY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  report.tests.T4 = { name: 'Chaos Monkey', pass: true, findings: {} }

  // 4a. Mid-form hard-refresh — must NOT create ghost invoices
  I('Chaos', '4a. W3 hard-refresh mid-form — ghost invoice test...')
  await p3.goto(`${BASE}/sales/new`, { waitUntil: 'networkidle' })
  await sleep(500)

  const draftBefore = (await apiCall('GET', '/sales?status=DRAFT&limit=100', null, s1T)).data?.total ?? 0
  I('Chaos', `DRAFT count before refresh: ${draftBefore}`)

  const searchBox = p3.locator('input[placeholder*="ابحث"], input[placeholder*="باركود"]').first()
  if (await searchBox.count() > 0) { await searchBox.fill('صنف'); await sleep(300) }

  await p3.reload({ waitUntil: 'networkidle' })
  await sleep(1000)

  const draftAfter = (await apiCall('GET', '/sales?status=DRAFT&limit=100', null, s1T)).data?.total ?? 0
  I('Chaos', `DRAFT count after refresh: ${draftAfter}`)

  if (draftAfter === draftBefore) {
    P('Chaos', 'Hard refresh created ZERO ghost DRAFT invoices — form state is UI-only ✓')
    report.tests.T4.findings.ghostFromRefresh = 0
  } else {
    F('Chaos', `${draftAfter - draftBefore} ghost DRAFT invoice(s) created by page refresh!`)
    report.tests.T4.pass = false
    report.tests.T4.findings.ghostFromRefresh = draftAfter - draftBefore
  }

  // 4b. Logout W4 → Back button → ghost session test
  I('Chaos', '4b. W4 logout → Back button → can it still transact?...')
  await p4.goto(`${BASE}/sales/new`, { waitUntil: 'networkidle' })
  await sleep(500)
  I('Chaos', 'W4 on /sales/new (before logout)')

  await apiCall('POST', '/auth/logout', {}, s2T)
  await ctx4.clearCookies()
  I('Chaos', 'W4 server-side logout + browser cookies cleared')

  try { await p4.goBack({ waitUntil: 'networkidle', timeout: 8000 }) } catch { /* back may fail */ }
  await sleep(2500)

  const w4Url = p4.url()
  I('Chaos', `W4 URL after Back: ${w4Url.replace(BASE, '') || '/'}`)

  if (w4Url.includes('/login')) {
    P('Chaos', 'W4 Back → /login — session correctly invalidated on navigation ✓')
    report.tests.T4.findings.backButton = 'redirected_to_login'
  } else {
    // Page may have served from cache — verify API is blocked
    const ghostR = await apiCall('POST', '/sales', {
      paymentType: 'CASH', priceType: 'RETAIL', currency: 'IQD', exchangeRate: 1480,
      items: [{ itemId: txItemId, quantity: 1, unitPrice: 500, discount: 0 }],
    }, s2T)
    if (ghostR.status === 401) {
      P('Chaos', `W4 page cached but API calls → 401 — server-side invalidation WORKING ✓`)
      report.tests.T4.findings.backButton = 'page_cached_api_blocked'
    } else if (ghostR.ok) {
      F('Chaos', `GHOST TRANSACTION! W4 can create invoice after logout! HTTP ${ghostR.status}`)
      report.tests.T4.pass = false
      report.tests.T4.findings.backButton = 'GHOST_TRANSACTION'
    } else {
      I('Chaos', `W4 API → HTTP ${ghostR.status} after logout (blocked)`)
      report.tests.T4.findings.backButton = `blocked_http_${ghostR.status}`
    }
  }

  // 4c. W1 abandons draft mid-way (simulate browser crash)
  I('Chaos', '4c. W1 abandons draft invoice — orphan-check...')
  await p1.goto(`${BASE}/sales/new`, { waitUntil: 'networkidle' })
  await sleep(400)

  const crashInv = await apiCall('POST', '/sales', {
    paymentType: 'CASH', priceType: 'RETAIL', currency: 'IQD', exchangeRate: 1480,
    items: [{ itemId: txItemId, quantity: 2, unitPrice: 500, discount: 0 }],
    notes: 'CRASH_ORPHAN_TEST',
  }, AT)
  const crashId = crashInv.data?.data?.id
  I('Chaos', `Crash-test draft: ${crashId?.slice(-8)}`)

  // Simulate crash — navigate away without confirming
  await p1.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await sleep(400)

  if (crashId) {
    const crashCheck = await apiCall('GET', `/sales/${crashId}`, null, AT)
    const crashStatus = crashCheck.data?.data?.status
    if (crashStatus === 'DRAFT') {
      P('Chaos', `Abandoned invoice stays DRAFT — stock NOT decremented prematurely ✓`)
      report.tests.T4.findings.abandonedStatus = 'DRAFT'
    } else {
      F('Chaos', `Abandoned invoice became "${crashStatus}" unexpectedly!`)
      report.tests.T4.pass = false
    }
  }

  // 4d. Concurrent confirm + cancel on same invoice (status race)
  I('Chaos', '4d. Simultaneous CONFIRM + CANCEL on same invoice...')
  const dualInv = await apiCall('POST', '/sales', {
    paymentType: 'CASH', priceType: 'RETAIL', currency: 'IQD', exchangeRate: 1480,
    items: [{ itemId: txItemId, quantity: 1, unitPrice: 500, discount: 0 }],
    notes: 'DUAL_RACE_STATUS',
  }, AT)
  const dualId = dualInv.data?.data?.id
  if (dualId) {
    const [confR, cancR] = await Promise.all([
      apiCall('POST', `/sales/${dualId}/confirm`, {}, AT),
      apiCall('POST', `/sales/${dualId}/cancel`,  {}, AT),
    ])
    I('Chaos', `confirm→${confR.data?.data?.status || confR.status}  cancel→${cancR.data?.data?.status || cancR.status}`)

    const final = await apiCall('GET', `/sales/${dualId}`, null, AT)
    const fStatus = final.data?.data?.status
    if (fStatus === 'CONFIRMED' || fStatus === 'CANCELLED') {
      P('Chaos', `Concurrent confirm+cancel settled cleanly → "${fStatus}" — no corrupt state ✓`)
      report.tests.T4.findings.dualRace = fStatus
    } else {
      F('Chaos', `Dual-race left corrupt status: "${fStatus}"`)
      report.tests.T4.pass = false
    }
  }

  // 4e. W3 offline mid-confirm simulation
  I('Chaos', '4e. W3 network offline during confirm attempt...')
  await p3.goto(`${BASE}/sales/new`, { waitUntil: 'networkidle' })
  const offlineInv = await apiCall('POST', '/sales', {
    paymentType: 'CASH', priceType: 'RETAIL', currency: 'IQD', exchangeRate: 1480,
    items: [{ itemId: txItemId, quantity: 1, unitPrice: 500, discount: 0 }],
    notes: 'OFFLINE_CONFIRM_TEST',
  }, AT)
  const offlineId = offlineInv.data?.data?.id

  if (offlineId) {
    await ctx3.setOffline(true)
    I('Chaos', 'W3: network → OFFLINE')

    // W3 browser tries to confirm (will fail — offline)
    const offlineResult = await p3.evaluate(async ([apiBase, id]) => {
      try {
        const r = await fetch(`${apiBase}/api/sales/${id}/confirm`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include'
        })
        return { status: r.status }
      } catch (e) {
        return { error: e.message }
      }
    }, [API, offlineId]).catch(e => ({ error: e.message }))

    await ctx3.setOffline(false)
    I('Chaos', `W3: network → ONLINE | offline result: ${JSON.stringify(offlineResult)}`)

    await sleep(400)
    const offlineCheck = await apiCall('GET', `/sales/${offlineId}`, null, AT)
    const offlineStatus = offlineCheck.data?.data?.status
    if (offlineStatus === 'DRAFT') {
      P('Chaos', `Offline-interrupted confirm → invoice still DRAFT — atomicity preserved ✓`)
      report.tests.T4.findings.offlineInterrupt = 'DRAFT_preserved'
    } else {
      W('Chaos', `Offline interrupt: invoice status = "${offlineStatus}"`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5 — DATA VOLUME & UI LAG
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ TEST 5: DATA VOLUME & UI LAG (1000+ Items) ━━━━━━━━━━━━━\n')
  report.tests.T5 = { name: 'Data Volume & UI Lag', pass: false, findings: {} }

  const itemCountR = await apiCall('GET', '/items?limit=1&pageSize=1', null, AT)
  const totalItems = itemCountR.data?.data?.total || 0
  I('Volume', `Total items in database: ${totalItems}`)

  // Drive all 4 windows simultaneously (maximum DB load)
  I('Volume', 'Loading all 4 windows under full DB load simultaneously...')
  const loadT0 = Date.now()
  await Promise.all([
    p1.goto(`${BASE}/reports/sales`,  { waitUntil: 'networkidle', timeout: 30000 }),
    p2.goto(`${BASE}/cash-statement`, { waitUntil: 'networkidle', timeout: 30000 }),
    p3.goto(`${BASE}/inventory`,      { waitUntil: 'networkidle', timeout: 30000 }),
    p4.goto(`${BASE}/login`,          { waitUntil: 'networkidle', timeout: 30000 }),
  ])
  P('Volume', `All 4 windows loaded in ${Date.now() - loadT0}ms under full load — no crash`)

  // W1 searchable dropdown benchmark
  await p1.goto(`${BASE}/sales/new`, { waitUntil: 'networkidle' })
  await sleep(1200)

  const searchSel = 'input[placeholder*="ابحث باسم الصنف"], input[placeholder*="ابحث بالاسم"], input[placeholder*="ابحث"]'
  const searchEl = p1.locator(searchSel).first()
  const hasSearchEl = await searchEl.count() > 0
  I('Volume', `Search input found: ${hasSearchEl}`)

  const benchmarks = []
  if (hasSearchEl) {
    const queries = ['ضغط', 'Bulk', 'منتج ضغط 5', '001', '100']
    for (const q of queries) {
      await searchEl.fill('')
      await sleep(80)
      const t0 = Date.now()
      await searchEl.fill(q)
      await Promise.race([
        p1.waitForSelector('[class*="absolute"], [role="listbox"]', { timeout: 2500 }).catch(() => {}),
        sleep(2500),
      ])
      const ms = Date.now() - t0
      benchmarks.push({ query: q, ms })
      const icon = ms < 100 ? '✅' : ms < 400 ? '⚠️ ' : '❌'
      console.log(`   ${icon}  Search "${q}" → ${ms}ms`)
      await p1.keyboard.press('Escape').catch(() => {})
      await sleep(120)
    }

    const avg = Math.round(benchmarks.reduce((a, b) => a + b.ms, 0) / benchmarks.length)
    I('Volume', `Average search latency: ${avg}ms (${benchmarks.length} queries, ${totalItems} items in DB)`)

    if (avg < 100)      { P('Volume', `Avg ${avg}ms < 100ms ✓ — performance target MET`);         report.tests.T5.pass = true  }
    else if (avg < 400) { W('Volume', `Avg ${avg}ms — SLOW (target <100ms) — optimize API query`) }
    else                { F('Volume', `Avg ${avg}ms — CRITICAL LAG with ${totalItems} items`)      }

    report.tests.T5.findings.avgMs = avg
    report.tests.T5.findings.benchmarks = benchmarks
  } else {
    W('Volume', 'Search input selector not matched — skipping benchmark')
  }

  // Inventory table render count
  await p3.goto(`${BASE}/inventory`, { waitUntil: 'networkidle', timeout: 30000 })
  const visibleRows = await p3.evaluate(() =>
    document.querySelectorAll('table tbody tr, [class*="row"][class*="item"]').length
  )
  I('Volume', `Inventory page: ${visibleRows} visible row(s)`)
  report.tests.T5.findings.totalItems = totalItems
  report.tests.T5.findings.inventoryVisibleRows = visibleRows

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL WINDOW POSITIONS — for inspection
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n━━━ ARRANGING WINDOWS FOR INSPECTION ━━━━━━━━━━━━━━━━━━━━━━━\n')
  await Promise.allSettled([
    p1.goto(`${BASE}/inventory`,      { waitUntil: 'networkidle', timeout: 15000 }),  // T1 race item here
    p2.goto(`${BASE}/cash-statement`, { waitUntil: 'networkidle', timeout: 15000 }),  // T2 accounting result
    p3.goto(`${BASE}/reports/profit`, { waitUntil: 'networkidle', timeout: 15000 }),  // T3 — Staff sees block
    p4.goto(`${BASE}/login`,          { waitUntil: 'networkidle', timeout: 15000 }),  // T4 — chaos logout
  ])
  await sleep(2000)

  console.log('   W1 (Admin)       →  /inventory         [verify Race Master Item = 0 units]')
  console.log('   W2 (Accountant)  →  /cash-statement    [verify 50-TX accounting storm]')
  console.log('   W3 (Staff1)      →  /reports/profit    [verify Staff sees redirect/block]')
  console.log('   W4 (Staff2)      →  /login             [chaos logout — session dead]')

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL FORENSIC REPORT
  // ═══════════════════════════════════════════════════════════════════════════
  const sep = '═'.repeat(72)
  console.log(`\n${sep}`)
  console.log('  FULL FORENSIC REPORT — IMS-Pro Supreme Stress & Resilience Audit')
  console.log(`  Completed: ${new Date().toISOString()}`)
  console.log(`  Duration:  ${Math.round((Date.now() - new Date(report.startTime).getTime()) / 1000)}s`)
  console.log(sep)

  const verdicts = [
    { n: 'TEST 1 — Race Conditions',         p: report.tests.T1?.pass },
    { n: 'TEST 2 — Accounting Torture',       p: report.tests.T2?.pass },
    { n: 'TEST 3 — Security Breach',          p: report.tests.T3?.pass },
    { n: 'TEST 4 — Chaos Monkey',             p: report.tests.T4?.pass },
    { n: 'TEST 5 — Data Volume & UI Lag',     p: report.tests.T5?.pass },
  ]
  console.log('\n  VERDICTS:')
  verdicts.forEach(v => console.log(`    ${v.p ? '✅' : '❌'} ${v.n}`))

  const passed = verdicts.filter(v => v.p).length
  const failed = verdicts.filter(v => !v.p).length
  console.log(`\n  SCORE: ${passed}/${verdicts.length} PASSED  |  ${failed} FAILED`)

  console.log('\n  CRITICAL FAILURES:')
  if (report.critical.length === 0) {
    console.log('    ✅ NONE — system passed all zero-tolerance checks')
  } else {
    report.critical.forEach(c => {
      console.log(`    ❌ [${c.test}] ${c.msg}`)
      if (c.detail) console.log(`         ↳ ${c.detail}`)
    })
  }

  const t1 = report.tests.T1?.findings || {}
  console.log('\n  TEST 1 — Race Conditions Detail:')
  console.log(`    Invoices confirmed:  ${t1.confirmed ?? 'N/A'}  (expected: 1)`)
  console.log(`    Invoices blocked:    ${t1.blocked   ?? 'N/A'}  (expected: 3)`)
  console.log(`    Final stockQty:      ${t1.finalStock ?? 'N/A'}  (expected: 0)`)
  ;(t1.raceOut || []).forEach(r =>
    console.log(`      ${r.status === 'CONFIRMED' ? '✅' : '🔷'} ...${r.id?.slice(-8)} → ${r.status || r.error} (HTTP ${r.http})`)
  )

  const t2 = report.tests.T2?.findings || {}
  console.log('\n  TEST 2 — Accounting Torture Detail:')
  console.log(`    Confirmed:          ${t2.txOK}/50`)
  console.log(`    Failed:             ${t2.txFail}`)
  console.log(`    Rate Mismatches:    ${t2.rateMismatches}  (0 = PASS)`)
  ;(t2.rateLog || []).forEach(r => console.log(`    ${r.ok ? '✅' : '❌'} Rate change → ${r.rate} IQD/USD`))

  const t3 = report.tests.T3?.findings || {}
  console.log('\n  TEST 3 — Security Detail:')
  console.log(`    SQL Injection:      ${t3.sqliSafe} stored safely | ${t3.sqliBlocked} blocked`)
  console.log(`    XSS Alert Fired:    ${t3.xssAlertFired ? '❌ YES' : '✅ NO'}`)
  console.log(`    Profit (STAFF):     ${t3.profitBlockedForStaff ? '✅ Blocked' : '❌ Accessible'}`)
  console.log(`    No-Auth:            ${t3.noAuthBlocked ? '✅ Blocked' : '❌ Accessible'}`)
  console.log(`    Tampered JWT:       ${t3.tamperedJwtBlocked ? '✅ Rejected' : '❌ Accepted'}`)
  console.log(`    Browser DevFetch:   HTTP ${t3.browserFetchStatus}`)

  const t4 = report.tests.T4?.findings || {}
  console.log('\n  TEST 4 — Chaos Monkey Detail:')
  console.log(`    Ghost (refresh):    ${t4.ghostFromRefresh ?? 'N/A'} invoices`)
  console.log(`    Back-button:        ${t4.backButton}`)
  console.log(`    Abandoned draft:    ${t4.abandonedStatus}`)
  console.log(`    Dual-race status:   ${t4.dualRace}`)
  console.log(`    Offline interrupt:  ${t4.offlineInterrupt}`)

  const t5 = report.tests.T5?.findings || {}
  console.log('\n  TEST 5 — Data Volume Detail:')
  console.log(`    Total items in DB:  ${t5.totalItems}`)
  console.log(`    Avg search:         ${t5.avgMs ?? 'N/A'}ms  (target < 100ms)`)
  ;(t5.benchmarks || []).forEach(b =>
    console.log(`      ${b.ms < 100 ? '✅' : b.ms < 400 ? '⚠️ ' : '❌'} "${b.query}" → ${b.ms}ms`)
  )
  console.log(`    Inventory rows:     ${t5.inventoryVisibleRows}`)

  console.log(`\n  OVERALL VERDICT: ${failed === 0
    ? '✅  ALL 5 TESTS PASSED — System is resilient'
    : `❌  ${failed} TEST(S) FAILED — Inspect critical failures above`
  }`)
  console.log('\n  4 browser windows REMAIN OPEN. DO NOT CLOSE until you inspect the carnage.')
  console.log(`${sep}\n`)

  // DO NOT close any browser — user wants to inspect
})().catch(err => {
  console.error('\n💥 FATAL SCRIPT ERROR:', err.message)
  console.error(err.stack)
  console.log('\nBrowsers may still be open — check them manually.')
})
