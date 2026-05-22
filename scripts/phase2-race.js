/**
 * IMS-Pro Phase 2 Race — 2 Staff Windows
 * Tests: Race condition on 1 unit of stock with 2 simultaneous confirms
 * Creates invoices SEQUENTIALLY (avoid invoice-number collision bug),
 * then CONFIRMS both SIMULTANEOUSLY — only 1 must succeed, stock = 0.
 * Run: node phase2-race.js
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

;(async () => {
  console.log('\n' + '═'.repeat(60))
  console.log('  IMS-Pro PHASE 2 RACE — 2 Staff Windows (Race Condition)')
  console.log('═'.repeat(60) + '\n')

  // ── API Setup — accept pre-supplied tokens to avoid login rate limit ──
  let adminSess, staffSess
  if (process.env.ADMIN_TOKEN && process.env.STAFF_TOKEN) {
    adminSess = { token: process.env.ADMIN_TOKEN, cookieValue: process.env.ADMIN_COOKIE||'', user: { role: 'ADMIN' } }
    staffSess = { token: process.env.STAFF_TOKEN, cookieValue: process.env.STAFF_COOKIE||'', user: { role: 'STAFF' } }
    P('Setup', 'Using pre-supplied tokens (skipping login)')
  } else {
    try {
      [adminSess, staffSess] = await Promise.all([
        loginAPI('admin', 'admin123'),
        loginAPI('staff_s1', 'Stress@123'),
      ])
      // Print tokens for reuse on retry
      I('Setup', `ADMIN_TOKEN=${adminSess.token}`)
      I('Setup', `STAFF_TOKEN=${staffSess.token}`)
      I('Setup', `ADMIN_COOKIE=${adminSess.cookieValue}`)
      I('Setup', `STAFF_COOKIE=${staffSess.cookieValue}`)
      P('Setup', `Admin (${adminSess.user.role}) + Staff (${staffSess.user.role}) sessions OK (token reused for 2 slots)`)
    } catch(e) { F('Setup', e.message); process.exit(1) }
  }

  // Reuse same staff token for both "slots" — race test is about DB Serializable isolation
  const staff1Sess = staffSess
  const staff2Sess = staffSess
  const adminT = adminSess.token

  // ── Find or create Race Test Item (stock = 1) ──────────────────
  console.log('\n━━━ RACE ITEM SETUP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Look for existing Race Item
  let raceItem = null
  const searchR = await apiCall('GET', '/items?search=Race+Test+Item&limit=5', null, adminT)
  if (searchR.ok) {
    const items = searchR.data?.data?.items || []
    raceItem = items.find(it => it.name_en === 'Race Test Item')
  }

  if (!raceItem) {
    // Create it
    const createR = await apiCall('POST', '/items', {
      barcode: null,
      name_ar: 'منتج اختبار السباق',
      name_en: 'Race Test Item',
      unit: 'pcs',
      category: 'Test',
      retailPrice: 1000,
      wholesalePrice: 900,
      specialPrice: 850,
      dollarPrice: 1,
      dinarPrice: 1000,
      stockQty: 0,
    }, adminT)
    if (!createR.ok) { F('RaceSetup', `Create item failed: ${JSON.stringify(createR.data)}`); process.exit(1) }
    raceItem = createR.data?.data
    P('RaceSetup', `Created Race Test Item (id=${raceItem?.id})`)
  } else {
    P('RaceSetup', `Found existing Race Test Item (id=${raceItem.id}, stock=${raceItem.stockQty})`)
  }

  // Set stock exactly to 1 via stock transfer
  // First get current stock
  const itemR = await apiCall('GET', `/items/${raceItem.id}`, null, adminT)
  const currentStock = parseFloat(String(itemR.data?.data?.stockQty ?? '0'))
  I('RaceSetup', `Current stock: ${currentStock}`)

  if (currentStock !== 1) {
    // Reset to 0 if > 0 via OUT, then IN 1
    if (currentStock > 0) {
      const outR = await apiCall('POST', '/stock/transfer', {
        itemId: raceItem.id, type: 'OUT', quantity: currentStock, reason: 'ADJUSTMENT'
      }, adminT)
      if (!outR.ok) W('RaceSetup', `Stock OUT failed: ${JSON.stringify(outR.data)}`)
    }
    if (currentStock < 0) {
      W('RaceSetup', `Negative stock detected (${currentStock}) — IN transfer to fix`)
    }
    // Now set to 1
    const inR = await apiCall('POST', '/stock/transfer', {
      itemId: raceItem.id, type: 'IN', quantity: 1, reason: 'ADJUSTMENT'
    }, adminT)
    if (!inR.ok) { F('RaceSetup', `Stock IN failed: ${JSON.stringify(inR.data)}`); process.exit(1) }
    P('RaceSetup', `Stock set to 1 ✓`)
  } else {
    P('RaceSetup', `Stock already = 1 ✓`)
  }

  // Find or create customer for test
  let custId = null
  const custSearch = await apiCall('GET', '/customers?search=Race+Test+Customer&limit=5', null, adminT)
  if (custSearch.ok) {
    const custs = custSearch.data?.data?.customers || []
    const existing = custs.find(c => c.name === 'Race Test Customer')
    if (existing) custId = existing.id
  }
  if (!custId) {
    const custR = await apiCall('POST', '/customers', {
      name: 'Race Test Customer', phone: '07700000001',
      type: 'RETAIL', creditLimit: 100000, currency: 'IQD'
    }, adminT)
    if (!custR.ok) { F('RaceSetup', `Create customer failed: ${JSON.stringify(custR.data)}`); process.exit(1) }
    custId = custR.data?.data?.id
    P('RaceSetup', `Created Race Test Customer (id=${custId})`)
  } else {
    P('RaceSetup', `Found Race Test Customer (id=${custId})`)
  }

  // ── Create 2 DRAFT invoices SEQUENTIALLY (avoid invoice# collision) ──
  console.log('\n━━━ CREATING DRAFT INVOICES (Sequential) ━━━━━━━━━━━━━━━\n')

  const draftPayload = () => ({
    customerId: custId,
    paymentType: 'CASH',
    priceType: 'RETAIL',
    currency: 'IQD',
    exchangeRate: 1,
    items: [{ itemId: raceItem.id, quantity: 1, unitPrice: 1000 }],
    notes: 'Race condition test draft',
  })

  let inv1Id, inv2Id
  // Sequential to avoid invoice number collision
  const d1 = await apiCall('POST', '/sales', draftPayload(), staff1Sess.token)
  if (d1.ok) {
    inv1Id = d1.data?.data?.id
    P('Draft', `Staff1 draft created → id=${inv1Id}, invoiceNumber=${d1.data?.data?.invoiceNumber}`)
  } else {
    F('Draft', `Staff1 draft FAILED: HTTP ${d1.status} — ${JSON.stringify(d1.data)}`)
    process.exit(1)
  }

  await sleep(200) // small gap ensures unique invoice number

  const d2 = await apiCall('POST', '/sales', draftPayload(), staff2Sess.token)
  if (d2.ok) {
    inv2Id = d2.data?.data?.id
    P('Draft', `Staff2 draft created → id=${inv2Id}, invoiceNumber=${d2.data?.data?.invoiceNumber}`)
  } else {
    F('Draft', `Staff2 draft FAILED: HTTP ${d2.status} — ${JSON.stringify(d2.data)}`)
    process.exit(1)
  }

  // ── Pre-race stock snapshot ────────────────────────────────────
  const preR = await apiCall('GET', `/items/${raceItem.id}`, null, adminT)
  const preStock = parseFloat(String(preR.data?.data?.stockQty ?? '?'))
  I('Race', `Pre-race stock = ${preStock}  (expect: 1)`)
  if (preStock !== 1) W('Race', `Pre-race stock is ${preStock} — not 1. Results may be affected.`)

  // ── Confirm BOTH simultaneously ────────────────────────────────
  console.log('\n━━━ SIMULTANEOUS CONFIRM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  I('Race', `Confirming invoice ${inv1Id} and ${inv2Id} simultaneously...`)

  const [c1, c2] = await Promise.all([
    apiCall('POST', `/sales/${inv1Id}/confirm`, null, staff1Sess.token),
    apiCall('POST', `/sales/${inv2Id}/confirm`, null, staff2Sess.token),
  ])

  I('Race', `Confirm1 → HTTP ${c1.status} | Confirm2 → HTTP ${c2.status}`)

  const s1ok = c1.ok
  const s2ok = c2.ok
  const successes = [s1ok, s2ok].filter(Boolean).length
  const failures  = [s1ok, s2ok].filter(v=>!v).length

  if (s1ok)  I('Race', `Invoice ${inv1Id} (Staff1): CONFIRMED`)
  else        I('Race', `Invoice ${inv1Id} (Staff1): REJECTED (${c1.status}) — ${c1.data?.error||c1.data?.message||''}`)
  if (s2ok)  I('Race', `Invoice ${inv2Id} (Staff2): CONFIRMED`)
  else        I('Race', `Invoice ${inv2Id} (Staff2): REJECTED (${c2.status}) — ${c2.data?.error||c2.data?.message||''}`)

  // ── Post-race stock snapshot ───────────────────────────────────
  await sleep(400)
  const postR = await apiCall('GET', `/items/${raceItem.id}`, null, adminT)
  const postStock = parseFloat(String(postR.data?.data?.stockQty ?? '?'))
  I('Race', `Post-race stock = ${postStock}  (expect: 0)`)

  // ── Verdict ───────────────────────────────────────────────────
  console.log('\n━━━ RACE CONDITION VERDICT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (successes === 1 && failures === 1) {
    P('Race', `EXACTLY 1 sale succeeded, 1 rejected ✓`)
  } else if (successes === 2) {
    F('Race', `BOTH confirms succeeded — oversell! Stock should have prevented this.`)
  } else if (successes === 0) {
    F('Race', `BOTH confirms failed — unexpected double rejection.`)
  }

  if (postStock === 0) {
    P('Race', `Post-race stock = 0 ✓ (no oversell, no negative inventory)`)
  } else if (postStock < 0) {
    F('Race', `Post-race stock = ${postStock} — NEGATIVE INVENTORY DETECTED!`)
  } else if (postStock === 1) {
    if (successes === 0) W('Race', `Stock unchanged at 1 — both rejected (double failure)`)
    else F('Race', `Stock still 1 after successful confirm — stock not decremented!`)
  } else {
    W('Race', `Post-race stock = ${postStock} — unexpected value`)
  }

  // ── Browser windows: show results ─────────────────────────────
  console.log('\n━━━ BROWSER WINDOWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  I('Windows', 'Launching 2 Staff Firefox windows...')

  const [b1, b2] = await Promise.all([
    firefox.launch({ headless:false, slowMo:0 }),
    firefox.launch({ headless:false, slowMo:0 }),
  ])
  const [ctx1, ctx2] = await Promise.all([
    b1.newContext({ viewport:{width:1280,height:720}, locale:'ar-IQ' }),
    b2.newContext({ viewport:{width:1280,height:720}, locale:'ar-IQ' }),
  ])
  const [pg1, pg2] = await Promise.all([ ctx1.newPage(), ctx2.newPage() ])

  await Promise.all([
    injectSession(ctx1, staff1Sess.cookieValue),
    injectSession(ctx2, staff2Sess.cookieValue),
  ])

  // Navigate to the confirmed/rejected invoice pages
  await Promise.all([
    pg1.goto(`${BASE}/sales/${inv1Id}`, { waitUntil:'networkidle', timeout:15000 }).catch(()=>
      pg1.goto(`${BASE}/sales`, { waitUntil:'networkidle', timeout:15000 })),
    pg2.goto(`${BASE}/sales/${inv2Id}`, { waitUntil:'networkidle', timeout:15000 }).catch(()=>
      pg2.goto(`${BASE}/sales`, { waitUntil:'networkidle', timeout:15000 })),
  ])
  await sleep(1500)

  // ── Summary ───────────────────────────────────────────────────
  const passes = results.filter(r=>r.startsWith('✅')).length
  const fails  = results.filter(r=>r.startsWith('❌')).length
  console.log('\n' + '═'.repeat(60))
  console.log('  PHASE 2 RESULT')
  console.log(`  ✅ PASSED: ${passes}   ❌ FAILED: ${fails}`)
  console.log(`  Pre-race stock: ${preStock}  →  Post-race stock: ${postStock}`)
  console.log(`  Confirms: ${successes} succeeded, ${failures} rejected`)
  if (fails > 0) {
    console.log('\n  Failures:')
    results.filter(r=>r.startsWith('❌')).forEach(r=>console.log(' ',r))
  } else {
    console.log('  All checks passed!')
  }
  console.log('  W3 → Invoice', inv1Id, '| W4 → Invoice', inv2Id, '(windows open)')
  console.log('═'.repeat(60) + '\n')
})().catch(e=>{ console.error('FATAL:',e.message); process.exit(1) })
