import puppeteer from 'puppeteer'

const BASE = 'http://localhost'
const OUT  = 'C:/Users/Cloud/Desktop'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
})

const page = await browser.newPage()

// ── 1. Login page ────────────────────────────────────────────────────────────
console.log('1. Navigating to login page...')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
await page.screenshot({ path: `${OUT}/test-01-login-page.png`, fullPage: false })
console.log('   Screenshot: test-01-login-page.png')

// ── 2. Fill and submit ────────────────────────────────────────────────────────
const _testUser = process.env.AUDIT_ADMIN_USERNAME || 'admin'
const _testPass = process.env.AUDIT_ADMIN_PASSWORD
if (!_testPass) {
  console.error('AUDIT_ADMIN_PASSWORD env var is required to run this script.')
  await browser.close()
  process.exit(1)
}
console.log(`2. Filling credentials (${_testUser} / ***)...`)
await page.click('input[type="text"], input[name="username"], input[placeholder*="admin"], input[placeholder*="اسم"]')
await page.keyboard.type(_testUser, { delay: 60 })
await page.click('input[type="password"]')
await page.keyboard.type(_testPass, { delay: 60 })
await page.screenshot({ path: `${OUT}/test-02-credentials-filled.png` })
console.log('   Screenshot: test-02-credentials-filled.png')

// ── 3. Submit ─────────────────────────────────────────────────────────────────
console.log('3. Clicking login button...')
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
  page.click('button[type="submit"]'),
])
console.log('   Redirected to:', page.url())
await page.screenshot({ path: `${OUT}/test-03-after-login.png`, fullPage: false })
console.log('   Screenshot: test-03-after-login.png')

// ── 4. Dashboard ──────────────────────────────────────────────────────────────
console.log('4. Waiting for dashboard KPIs...')
await page.waitForTimeout(2000)
await page.screenshot({ path: `${OUT}/test-04-dashboard.png`, fullPage: true })
console.log('   Screenshot: test-04-dashboard.png')
console.log('   URL:', page.url())

// ── 5. Wrong password test ────────────────────────────────────────────────────
console.log('\n5. Testing wrong password...')
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
const usernameInput = await page.$('input[type="text"], input[name="username"]')
await usernameInput.click({ clickCount: 3 })
await usernameInput.type('admin')
await page.click('input[type="password"]')
await page.keyboard.type('wrongpassword')
await page.click('button[type="submit"]')
await page.waitForTimeout(2000)
await page.screenshot({ path: `${OUT}/test-05-wrong-password.png` })
console.log('   Screenshot: test-05-wrong-password.png')

await browser.close()
console.log('\nAll tests complete.')
