/**
 * Browser tests for opening the app straight from disk (file://), with no server.
 *
 *   npm run build            (or npm run build:offline)
 *   npm run test:offline
 *
 * Starts from app/index.html, as a person would, which forwards to the
 * self-contained build in dist-offline/, and goes through lessons, practice,
 * challenges, quizzes, saved progress and settings. Also checks the message
 * app/index.html shows when dist-offline/ has not been built.
 *
 * Needs Playwright with Chromium, like test:ui:
 *
 *   npm install --no-save playwright && npx playwright install chromium
 */

import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error('Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium')
  process.exit(1)
}

const sourceHtml = fileURLToPath(new URL('../index.html', import.meta.url))
const builtHtml = fileURLToPath(new URL('../dist-offline/index.html', import.meta.url))
if (!existsSync(builtHtml)) {
  console.error('No offline build found. Run npm run build (or npm run build:offline) first.')
  process.exit(1)
}
const entryUrl = pathToFileURL(sourceHtml).href
const appUrl = pathToFileURL(builtHtml).href

// Everything the app runs is inside dist-offline/index.html. Next to it: the icon,
// and build-info.js, which app/index.html loads to check that the build exists.
assert.deepEqual(readdirSync(new URL('../dist-offline/', import.meta.url)).sort(), ['build-info.js', 'favicon.svg', 'index.html'])

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await context.newPage()
const errors = []
const outside = []
page.on('pageerror', (error) => errors.push(error.message))
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
page.on('request', (request) => {
  const url = request.url().split('#')[0]
  // app/index.html itself and the files it may request before it forwards are expected.
  const expected = [entryUrl, appUrl, pathToFileURL(fileURLToPath(new URL('../dist-offline/build-info.js', import.meta.url))).href]
  if (!url.startsWith('data:') && !url.startsWith('blob:') && !expected.includes(url) && !url.endsWith('/favicon.svg') && !url.endsWith('/src/main.tsx') && !url.startsWith('https://github.com/'))
    outside.push(url)
})
let passed = 0
async function check(name, body) {
  await body()
  passed += 1
  console.log(`ok - ${name}`)
}

const main = () => page.locator('main').innerText()
const editor = () => page.locator('.cm-content').first()
async function setSql(sql) {
  await editor().click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Delete')
  await page.keyboard.insertText(sql)
}
async function engineReady() {
  await page.waitForFunction(() => !document.body.innerText.includes('Starting the SQL engine'), null, { timeout: 15000 })
}

try {
  await check('app/index.html opened from disk shows the app (dashboard)', async () => {
    await page.goto(entryUrl)
    await page.waitForURL((url) => url.href.startsWith(appUrl))
    await page.getByRole('navigation').first().waitFor()
    assert.ok((await page.getByRole('navigation').getByRole('link').count()) >= 5, 'the navigation links are shown')
    assert.ok((await page.getByRole('heading', { level: 1 }).count()) >= 1)
  })

  await check('a #/ address on app/index.html opens that page', async () => {
    await page.goto(`${entryUrl}#/practice`)
    await page.waitForURL(`${appUrl}#/practice`)
    await page.waitForFunction(() => document.body.innerText.includes('Ready. SQLite'), null, { timeout: 15000 })
  })

  await check('practice: SQL runs and shows its result (worker and WebAssembly embedded)', async () => {
    await setSql('SELECT COUNT(*) AS n FROM books')
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await page.waitForFunction(() => document.body.innerText.includes('Ran 1 statement'))
    assert.match(await page.locator('table td').first().innerText(), /^\d+$/)
    await setSql('SELEC 1')
    await page.keyboard.press('Control+Enter')
    await page.waitForFunction(() => document.body.innerText.includes('syntax error'))
  })

  await check('lessons: a lesson opens, its example runs and it can be marked complete', async () => {
    await page.goto(`${appUrl}#/learn/sql-fundamentals/introduction-to-select`)
    await page.getByRole('button', { name: /^Run/ }).first().click()
    await page.waitForFunction(() => document.body.innerText.includes('Matches the expected output'), null, { timeout: 15000 })
    await page.getByRole('button', { name: 'Mark as complete' }).click()
    await page.getByRole('button', { name: 'Mark as not complete' }).waitFor()
  })

  await check('challenges: an answer is checked and stays solved after a reload', async () => {
    await page.goto(`${appUrl}#/challenges/choose-columns`)
    await engineReady()
    await setSql('SELECT title, author FROM books')
    await page.getByRole('button', { name: 'Submit answer' }).click()
    await page.waitForSelector('[data-feedback]')
    assert.match(await main(), /Correct/i)
    await page.reload()
    await page.getByRole('main').waitFor()
    assert.match(await main(), /Solved/i)
  })

  await check('quizzes: an answer is checked', async () => {
    await page.goto(`${appUrl}#/quizzes/select-fundamentals`)
    const question = page.locator('fieldset').first()
    await question.locator('input[type=radio]').first().check()
    await question.getByRole('button', { name: /Check answer/ }).click()
    await page.waitForFunction(() => /Correct\.|Not quite/.test(document.body.innerText))
  })

  await check('sql path: a path opens, can be chosen, and stage navigation keeps the # address', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst`)
    await page.getByRole('button', { name: 'Make this my current path' }).click()
    await page.waitForFunction(() => document.body.innerText.includes('Data Analyst is now your current path.'))
    await page.getByRole('navigation', { name: 'Stages' }).getByRole('button', { name: /Stage 3/ }).click()
    assert.equal(page.url(), `${appUrl}#/paths/data-analyst`, 'jumping to a stage does not change the route')
    await page.goto(`${appUrl}#/paths`)
    await page.waitForFunction(() => document.body.innerText.includes('Your current path: Data Analyst'))
  })

  await check('sql path chapter: opens from disk, runs an example and checks an exercise', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst/conditional-logic`)
    await page.getByRole('button', { name: /^Run/ }).first().click()
    await page.waitForFunction(() => document.body.innerText.includes('Matches the expected output'), null, { timeout: 15000 })
    const exercise = page.locator('[data-exercise="da-books-per-band"]')
    await exercise.getByRole('button', { name: 'Submit answer' }).click()
    await exercise.locator('[data-feedback]').waitFor()
    assert.notEqual(await exercise.locator('[data-feedback]').getAttribute('data-feedback'), 'correct', 'the starter query is not accepted')
  })

  await check('chapters: a new Data Analyst chapter opens from disk and checks a window-function answer', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst/window-functions`)
    const card = page.locator('[data-exercise="da-books-oldest-first"]')
    await card.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Delete')
    await page.keyboard.insertText('SELECT title, year, ROW_NUMBER() OVER (ORDER BY year) AS position FROM books ORDER BY position')
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback="correct"]').waitFor({ timeout: 15000 })
  })

  await check('daily problems: the dashboard and a problem open from disk, and an answer is checked', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst/problems`)
    await page.waitForFunction(() => document.body.innerText.includes('All 365 days'))
    await page.goto(`${appUrl}#/paths/data-analyst/problems/2`)
    const card = page.locator('[data-exercise="da-day-002"]')
    await card.locator('[data-expected-output]').filter({ hasText: 'Expected output:' }).waitFor()
    await page.getByRole('region', { name: 'The table for this problem' }).getByText('books', { exact: true }).waitFor()
    await card.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Delete')
    await page.keyboard.insertText("SELECT title, price FROM books WHERE genre = 'Mystery'")
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback="correct"]').waitFor({ timeout: 15000 })
    // Solutions are embedded in the offline worker, so showing one works from disk too.
    await card.getByRole('button', { name: 'Compare with the solution' }).click()
    await card.getByRole('heading', { name: 'Expected result' }).waitFor({ timeout: 15000 })
  })

  await check('daily problems: a Stage 3B problem (Day 120) is checked from disk', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst/problems/120`)
    const card = page.locator('[data-exercise="da-day-120"]')
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback]').waitFor({ timeout: 15000 })
    assert.notEqual(await card.locator('[data-feedback]').getAttribute('data-feedback'), 'correct', 'the starter query is not accepted')
  })

  await check('daily problems: a batch 2 problem (Day 127) rejects its starter and accepts a correct query from disk', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst/problems/127`)
    const card = page.locator('[data-exercise="da-day-127"]')
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback]').waitFor({ timeout: 15000 })
    assert.notEqual(await card.locator('[data-feedback]').getAttribute('data-feedback'), 'correct', 'the starter query is not accepted')
    await card.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Delete')
    await page.keyboard.insertText(
      "WITH RECURSIVE price_changes(day, price) AS (VALUES ('2025-03-01', 10.00), ('2025-03-04', 12.50), ('2025-03-08', 11.00)), " +
        "calendar(day) AS (SELECT '2025-02-28' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-10') " +
        'SELECT c.day, (SELECT price FROM price_changes AS p WHERE p.day <= c.day ORDER BY p.day DESC LIMIT 1) AS price FROM calendar AS c ORDER BY c.day',
    )
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback="correct"]').waitFor({ timeout: 15000 })
    await card.getByRole('button', { name: 'Compare with the solution' }).click()
    await card.getByRole('heading', { name: 'Expected result' }).waitFor({ timeout: 15000 })
  })

  await check('daily problems: batch 3 text and solutions are inside the file; Day 180 is checked and Next/Previous cross Day 150/151 from disk', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst/problems/180`)
    const card = page.locator('[data-exercise="da-day-180"]')
    await card.waitFor({ timeout: 15000 })
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback]').waitFor({ timeout: 15000 })
    assert.notEqual(await card.locator('[data-feedback]').getAttribute('data-feedback'), 'correct', 'the starter query is not accepted')
    await page.goto(`${appUrl}#/paths/data-analyst/problems/151`)
    await page.locator('[data-exercise="da-day-151"]').waitFor({ timeout: 15000 })
    await page.getByRole('link', { name: /^Previous day\s*Day 150: / }).click()
    await page.locator('[data-exercise="da-day-150"]').waitFor({ timeout: 15000 })
    await page.getByRole('link', { name: /^Next day\s*Day 151: / }).click()
    await page.locator('[data-exercise="da-day-151"]').waitFor({ timeout: 15000 })
  })

  await check('daily problems: Days 181-210 work from disk (Day 210 starter rejected, Day 180 -> 181 navigation)', async () => {
    await page.goto(`${appUrl}#/paths/data-analyst/problems/210`)
    const card = page.locator('[data-exercise="da-day-210"]')
    await card.waitFor({ timeout: 15000 })
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback]').waitFor({ timeout: 15000 })
    assert.notEqual(await card.locator('[data-feedback]').getAttribute('data-feedback'), 'correct', 'the starter query is not accepted')
    await page.goto(`${appUrl}#/paths/data-analyst/problems/180`)
    await page.locator('[data-exercise="da-day-180"]').waitFor({ timeout: 15000 })
    await page.getByRole('link', { name: /^Next day\s*Day 181: / }).click()
    await page.locator('[data-exercise="da-day-181"]').waitFor({ timeout: 15000 })
  })

  await check('progress is saved: the lesson stays complete after reopening app/index.html', async () => {
    await page.goto(`${entryUrl}#/learn/sql-fundamentals/introduction-to-select`)
    await page.waitForURL(`${appUrl}#/learn/sql-fundamentals/introduction-to-select`)
    await page.getByRole('button', { name: 'Mark as not complete' }).waitFor()
  })

  await check('settings: progress can be reset', async () => {
    await page.goto(`${appUrl}#/settings`)
    await page.getByRole('button', { name: 'Reset progress' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Reset progress' }).click()
    await page.waitForFunction(() => document.body.innerText.includes('Your progress was reset'))
    await page.goto(`${appUrl}#/learn/sql-fundamentals/introduction-to-select`)
    await page.getByRole('button', { name: 'Mark as complete' }).waitFor()
  })

  await check('feedback: the form opens a pre-filled GitHub issue from the disk version too', async () => {
    await context.route('https://github.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }))
    await page.goto(`${appUrl}#/feedback`)
    await page.getByLabel('Summary').fill('Works offline')
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Continue on GitHub' }).click()])
    assert.match(popup.url(), /^https:\/\/github\.com\/AnimeshHembram\/Sqll-SQL-Learn-\/issues\/new\?/)
    assert.match(new URL(popup.url()).searchParams.get('body'), /Opened: from disk/)
    await popup.close()
  })

  await check('nothing is loaded from outside the app, and no errors are logged', async () => {
    assert.deepEqual(outside, [])
    // Opening app/index.html from disk logs one blocked request for src/main.tsx
    // (the Vite source, which only runs under npm run dev) before it forwards.
    assert.deepEqual(
      errors.filter((error) => !/main\.tsx|Failed to load resource/.test(error)),
      [],
    )
  })

  await check('without a build, app/index.html explains how to make one instead of staying blank', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'sql-learner-'))
    try {
      copyFileSync(sourceHtml, join(folder, 'index.html'))
      await page.goto(pathToFileURL(join(folder, 'index.html')).href)
      await page.waitForFunction(() => document.body.innerText.includes('needs a one-time build'))
      assert.match(await page.locator('body').innerText(), /npm run build:offline/)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
} finally {
  await browser.close()
}
console.log(`\n${passed} offline checks passed`)
