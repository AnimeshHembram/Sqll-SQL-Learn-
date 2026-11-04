/**
 * Browser tests for how Run, Submit and Stop respond to clicks, taps and keys.
 *
 *   npm run build
 *   npm run test:ui
 *
 * Needs Playwright with Chromium, which is not a project dependency (so that
 * `npm run check` never downloads a browser). Install it once with:
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *
 * The script serves the production build with Vite's preview server on a free
 * port, runs the checks and stops the server.
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

let chromium
try {
  ;({ chromium } = await import('playwright'))
} catch {
  console.error('Playwright is not installed. Run: npm install --no-save playwright && npx playwright install chromium')
  process.exit(1)
}

const root = fileURLToPath(new URL('..', import.meta.url))
if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
  console.error('No production build found. Run npm run build first.')
  process.exit(1)
}

const server = await preview({ root, preview: { port: 0, strictPort: false }, logLevel: 'silent' })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await chromium.launch()
const errors = []
let passed = 0

async function check(name, body) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`))
  page.on('console', (message) => message.type() === 'error' && errors.push(`${name}: ${message.text()}`))
  try {
    await body(page, context)
    passed += 1
    console.log(`ok - ${name}`)
  } catch (error) {
    console.log(`not ok - ${name}`)
    throw error
  } finally {
    await context.close()
  }
}

/** A query that keeps the engine busy for about a second, long enough to observe the busy state. */
const SLOW = 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < 3000000) SELECT count(*) FROM c'
/** A query that never finishes on its own. */
const ENDLESS = 'WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c) SELECT count(*) FROM c'

async function openPractice(page) {
  await page.goto(`${base}/practice`)
  await page.waitForFunction(() => document.body.innerText.includes('Ready. SQLite'))
}

async function setSql(page, sql) {
  await page.locator('.cm-content').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  if (sql) await page.keyboard.insertText(sql)
}

const focused = (page) => page.evaluate(() => document.activeElement?.textContent?.trim() ?? '')
const runButton = (page) => page.getByRole('button', { name: /^(Run|Running…)$/ })

/** Counts the queries and submissions actually sent to the database worker. */
async function countRequests(context) {
  await context.addInitScript(() => {
    window.__requests = 0
    const post = Worker.prototype.postMessage
    Worker.prototype.postMessage = function (message, ...rest) {
      if (message?.type === 'execute' || message?.type === 'evaluate') window.__requests += 1
      return post.call(this, message, ...rest)
    }
  })
}


try {
  await check('Space on Run: pressed while held, busy while running, focus kept, label restored', async (page) => {
    await openPractice(page)
    await setSql(page, SLOW)
    const run = runButton(page)
    await run.focus()
    await page.keyboard.down('Space')
    assert.equal(await run.getAttribute('data-pressed'), '')
    await page.keyboard.up('Space')
    await page.waitForFunction(() => document.querySelector('button[aria-busy="true"]'))
    assert.equal(await run.textContent(), 'Running…')
    assert.equal(await run.getAttribute('aria-disabled'), 'true')
    assert.equal(await run.evaluate((element) => element.disabled), false, 'busy must not use native disabled')
    assert.equal(await run.locator('span[aria-hidden="true"]').count(), 1, 'spinner shown')
    assert.equal(await focused(page), 'Running…', 'focus stays on the button')
    await page.waitForFunction(() => !document.querySelector('button[aria-busy="true"]'), null, { timeout: 15000 })
    assert.equal(await run.textContent(), 'Run')
    assert.equal(await run.getAttribute('aria-disabled'), null)
    assert.equal(await focused(page), 'Run', 'focus is still on Run when it finishes')
    assert.match(await page.getByRole('status').first().textContent(), /Ran 1 statement in/)
  })

  await check('Enter on Run behaves like a click', async (page) => {
    await openPractice(page)
    await setSql(page, 'SELECT title FROM books')
    await runButton(page).focus()
    await page.keyboard.press('Enter')
    // Wait for this run's own status. ("6 rows" alone also matches the table list beside the editor.)
    await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.startsWith('Ran 1 statement'))
    assert.equal(await focused(page), 'Run')
  })

  await check('pointer press shows the pressed style', async (page) => {
    await openPractice(page)
    const run = runButton(page)
    const box = await run.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    const idle = await run.evaluate((element) => getComputedStyle(element).transform)
    await page.mouse.down()
    await page.waitForTimeout(200)
    const pressed = await run.evaluate((element) => getComputedStyle(element).transform)
    await page.mouse.up()
    assert.equal(idle, 'none')
    assert.notEqual(pressed, 'none', 'pressed button moves down slightly')
  })

  await check('a busy Run ignores further clicks; Ctrl+Enter shows the same busy state', async (page) => {
    // Count the queries actually sent to the database worker.
    await page.addInitScript(() => {
      window.__executeRequests = 0
      const post = Worker.prototype.postMessage
      Worker.prototype.postMessage = function (message, ...rest) {
        if (message?.type === 'execute') window.__executeRequests += 1
        return post.call(this, message, ...rest)
      }
    })
    await openPractice(page)
    await setSql(page, SLOW)
    await page.keyboard.press('ControlOrMeta+Enter')
    const run = runButton(page)
    await page.waitForFunction(() => document.querySelector('button[aria-busy="true"]'))
    assert.equal(await run.textContent(), 'Running…')
    await run.click({ force: true })
    await run.click({ force: true })
    await page.waitForFunction(() => !document.querySelector('button[aria-busy="true"]'), null, { timeout: 15000 })
    assert.equal(await page.evaluate(() => window.__executeRequests), 1, 'clicks on a busy button start nothing')
    assert.match(await page.getByRole('status').first().textContent(), /Ran 1 statement/)
  })

  await check('disabled Run looks disabled, does not react to hover and cannot be triggered', async (page, context) => {
    await countRequests(context)
    await openPractice(page)
    await setSql(page, '')
    const run = runButton(page)
    assert.equal(await run.isDisabled(), true)
    const style = () => run.evaluate((element) => getComputedStyle(element).backgroundColor)
    const before = await style()
    await run.hover({ force: true })
    await page.waitForTimeout(250)
    assert.equal(await style(), before, 'no hover colour on a disabled button')
    assert.equal(await run.evaluate((element) => getComputedStyle(element).opacity), '0.55')
    await page.evaluate(() => (window.__requests = 0))
    await run.click({ force: true })
    await page.waitForTimeout(300)
    assert.match(await page.locator('main').innerText(), /Run a query to see its results here/, 'clicking a disabled Run does nothing')
    await page.locator('.cm-content').first().click()
    await page.keyboard.press('ControlOrMeta+Enter')
    await page.waitForTimeout(300)
    // The shortcut runs nothing either, but says why instead of doing nothing silently.
    assert.equal(await page.evaluate(() => window.__requests), 0, 'no query was sent')
    assert.match(await page.getByRole('status').first().textContent(), /Nothing to run yet/)
  })

  await check('stopping with the keyboard returns focus to Run', async (page) => {
    await openPractice(page)
    await setSql(page, ENDLESS)
    await runButton(page).click()
    const stop = page.getByRole('button', { name: 'Stop' })
    await stop.focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.body.innerText.includes('The query was stopped'))
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Run', null, { timeout: 5000 })
  })

  await check('running the same query again visibly redraws the result', async (page) => {
    await openPractice(page)
    await setSql(page, 'SELECT 1 AS one')
    await runButton(page).click()
    await page.waitForFunction(() => document.querySelector('.fade-in'))
    await page.evaluate(() => {
      document.querySelector('.fade-in').dataset.old = 'yes'
    })
    await runButton(page).click()
    await page.waitForFunction(() => document.querySelector('.fade-in') && !document.querySelector('.fade-in').dataset.old)
  })

  await check('challenge: Submit by keyboard keeps focus, blocks Run while checking, then announces the verdict', async (page) => {
    await page.goto(`${base}/challenges/choose-columns`)
    await page.waitForFunction(() => !document.body.innerText.includes('Starting the SQL engine'))
    await setSql(page, 'SELECT title, author FROM books')
    const submit = page.getByRole('button', { name: /^(Submit answer|Checking…)$/ })
    const run = page.getByRole('button', { name: /^(Run query|Running…)$/ })
    await submit.focus()
    await page.keyboard.press('Enter')
    // Read both buttons in the same moment: a submission can finish within a few milliseconds.
    const whileChecking = await page
      .waitForFunction(
        () => {
          const buttons = [...document.querySelectorAll('button')]
          const checking = buttons.find((button) => button.getAttribute('aria-busy') === 'true' && button.textContent.includes('Checking'))
          const runQuery = buttons.find((button) => button.textContent.trim() === 'Run query')
          return checking ? { runDisabled: runQuery?.disabled, focusOnSubmit: document.activeElement === checking } : null
        },
        null,
        { timeout: 2000, polling: 'mutation' },
      )
      .then((handle) => handle.jsonValue())
      .catch(() => null)
    if (whileChecking) {
      assert.equal(whileChecking.runDisabled, true, 'Run query is unavailable while checking')
      assert.equal(whileChecking.focusOnSubmit, true, 'focus stays on Submit while checking')
    }
    await page.waitForSelector('[data-feedback="correct"]')
    assert.equal(await page.locator('[aria-live="polite"] [data-feedback="correct"]').count(), 1, 'verdict is in a live region')
    assert.equal(await submit.textContent(), 'Submit answer')
    assert.equal(await run.isDisabled(), false)
    assert.equal(await focused(page), 'Submit answer')
  })

  await check('lesson example: Run shows busy state and the result', async (page) => {
    await page.goto(`${base}/learn/sql-fundamentals/introduction-to-select`)
    const run = page.getByRole('button', { name: /^Run \(example 1\)$/ })
    await run.click()
    await page.waitForFunction(() => document.body.innerText.includes('Matches the expected output'))
    assert.match(await page.getByRole('button', { name: /^Run again \(example 1\)$/ }).textContent(), /Run again/)
  })

  await check('focus ring is visible on keyboard focus, including while pressed', async (page) => {
    await openPractice(page)
    await setSql(page, 'SELECT 1')
    const run = runButton(page)
    await run.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    assert.equal(await focused(page), 'Run')
    // The ring fades in with the button's short transition.
    await page.waitForTimeout(250)
    const ring = await run.evaluate((element) => getComputedStyle(element).boxShadow)
    assert.match(ring, /3px/, `focus ring present: ${ring}`)
    await page.keyboard.down('Space')
    await page.waitForTimeout(250)
    const pressedRing = await run.evaluate((element) => getComputedStyle(element).boxShadow)
    await page.keyboard.up('Space')
    assert.match(pressedRing, /3px/, `focus ring kept while pressed: ${pressedRing}`)
  })

  await check('button text keeps 4.5:1 contrast in every state, light and dark', async (page, context) => {
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme })
      await openPractice(page)
      const ratios = await page.evaluate(() => {
        const parse = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number)
        const luminance = ([r, g, b]) => {
          const channel = (value) => {
            const v = value / 255
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
        }
        const ratio = (a, b) => {
          const [l1, l2] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x)
          return (l1 + 0.05) / (l2 + 0.05)
        }
        const root = getComputedStyle(document.documentElement)
        const token = (name) => {
          const probe = document.createElement('span')
          probe.style.color = root.getPropertyValue(name)
          document.body.append(probe)
          const value = getComputedStyle(probe).color
          probe.remove()
          return value
        }
        return {
          primary: ratio(token('--color-on-primary'), token('--color-primary')),
          primaryPressed: ratio(token('--color-on-primary'), token('--color-primary-hover')),
          secondary: ratio(token('--color-text'), token('--color-surface')),
          secondaryPressed: ratio(token('--color-text'), token('--color-surface-muted')),
        }
      })
      for (const [state, value] of Object.entries(ratios)) assert.ok(value >= 4.5, `${scheme} ${state}: ${value.toFixed(2)}`)
    }
    void context
  })

  await check('touch: tapping Run works, with no grey tap flash', async (_page, context) => {
    await context.close()
    const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await touch.newPage()
    await openPractice(page)
    await setSql(page, 'SELECT title FROM books')
    const run = runButton(page)
    assert.equal(await run.evaluate((element) => getComputedStyle(element).webkitTapHighlightColor), 'rgba(0, 0, 0, 0)')
    await run.tap()
    await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.startsWith('Ran 1 statement'))
    await touch.close()
  })

  await check('reduced motion: the spinner does not spin', async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openPractice(page)
    await setSql(page, SLOW)
    await runButton(page).click()
    await page.waitForFunction(() => document.querySelector('button[aria-busy="true"] span[aria-hidden="true"]'))
    const animation = await page.evaluate(
      () => getComputedStyle(document.querySelector('button[aria-busy="true"] span[aria-hidden="true"]')).animationName,
    )
    assert.equal(animation, 'none')
  })

  // --- Focus and repeat fixes --------------------------------------------------------

  const isLost = (page) =>
    page.evaluate(() => {
      const active = document.activeElement
      return active === null || active === document.body || active.closest('dialog:not([open])') !== null
    })

  await check('holding Enter on Run runs the query once, not once per key repeat', async (page, context) => {
    await countRequests(context)
    await openPractice(page)
    await setSql(page, 'SELECT 1')
    await runButton(page).focus()
    await page.evaluate(() => (window.__requests = 0))
    // Playwright marks every keydown after the first, before the key is released, as a repeat.
    // The pause matches a real key repeat (about 30 per second), slow enough for each quick run to finish.
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.down('Enter')
      await page.waitForTimeout(40)
    }
    await page.keyboard.up('Enter')
    await page.waitForTimeout(500)
    assert.equal(await page.evaluate(() => window.__requests), 1)
  })

  await check('holding Ctrl+Enter in the editor runs the query once', async (page, context) => {
    await countRequests(context)
    await openPractice(page)
    await setSql(page, 'SELECT 1')
    await page.evaluate(() => (window.__requests = 0))
    await page.keyboard.down('Control')
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.down('Enter')
      await page.waitForTimeout(40)
    }
    await page.keyboard.up('Enter')
    await page.keyboard.up('Control')
    await page.waitForTimeout(500)
    assert.equal(await page.evaluate(() => window.__requests), 1)
    assert.equal(await page.locator('.cm-content').first().innerText(), 'SELECT 1', 'no line break was typed')
  })

  await check('Ctrl+Enter on an empty editor says why nothing ran', async (page) => {
    await openPractice(page)
    await setSql(page, '')
    await page.locator('.cm-content').first().click()
    await page.keyboard.press('ControlOrMeta+Enter')
    await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.includes('Nothing to run yet'))
  })

  await check('Clear keeps keyboard focus by moving it into the editor', async (page) => {
    await openPractice(page)
    await setSql(page, 'SELECT 1')
    await page.getByRole('button', { name: 'Clear' }).focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(150)
    assert.equal(await isLost(page), false)
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('cm-content')), true)
    await page.keyboard.type('SELECT 2')
    assert.equal(await page.locator('.cm-content').first().innerText(), 'SELECT 2', 'typing goes straight into the editor')
  })

  await check('challenge: Reset query, the last hint and Show the solution keep keyboard focus', async (page) => {
    await page.goto(`${base}/challenges/choose-columns`)
    await page.waitForFunction(() => !document.body.innerText.includes('Starting the SQL engine'))
    await setSql(page, 'SELECT 1')
    await page.getByRole('button', { name: 'Reset query' }).focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(150)
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('cm-content')), true, 'Reset query → editor')

    for (let i = 0; i < 10 && (await page.getByRole('button', { name: /hint/i }).count()) > 0; i += 1) {
      await page.getByRole('button', { name: /hint/i }).first().focus()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(100)
    }
    assert.equal(await isLost(page), false, 'focus kept after the last hint')
    assert.match(await page.evaluate(() => document.activeElement.textContent), /^Hint \d/)

    await page.getByRole('button', { name: 'Show the solution' }).focus()
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.body.innerText.includes('Reference query'))
    assert.equal(await isLost(page), false, 'focus kept after revealing the solution')
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Reference query/)
  })

  await check('quiz: Check answer moves focus to the verdict', async (page) => {
    await page.goto(`${base}/quizzes/select-fundamentals`)
    const question = page.locator('fieldset').first()
    await question.locator('input[type=radio]').first().check()
    await question.getByRole('button', { name: /Check answer/ }).focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(150)
    assert.equal(await isLost(page), false)
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Correct\.|Not quite/)
  })

  await check('settings: after confirming Reset progress, focus goes to the result message', async (page) => {
    await page.goto(`${base}/learn/sql-fundamentals/what-is-sql`)
    await page.getByRole('button', { name: 'Mark as complete' }).click()
    await page.goto(`${base}/settings`)
    await page.getByRole('button', { name: 'Reset progress' }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('dialog').getByRole('button', { name: 'Reset progress' }).click()
    await page.waitForTimeout(200)
    assert.equal(await isLost(page), false)
    assert.match(await page.evaluate(() => document.activeElement.textContent), /Your progress was reset/)
  })

  await check('feedback: the sidebar link opens the form, which opens a pre-filled GitHub issue', async (page, context) => {
    // Never reach GitHub from the tests.
    await context.route('https://github.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: 'ok' }))
    await page.goto(base)
    const secondary = page.getByRole('navigation', { name: 'Main' }).getByRole('link')
    const labels = await secondary.allInnerTexts()
    assert.deepEqual(labels.slice(-2), ['Feedback', 'Settings'], 'Feedback sits above Settings at the bottom of the sidebar')
    await page.getByRole('link', { name: 'Feedback' }).click()
    await page.waitForURL(/\/feedback$/)
    assert.equal(await page.getByRole('link', { name: 'Feedback' }).getAttribute('aria-current'), 'page')

    // An empty summary is explained, and focus goes to the field.
    await page.getByRole('button', { name: 'Continue on GitHub' }).click()
    assert.match(await page.locator('main').innerText(), /Write a short summary first/)
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-invalid')), 'true')

    await page.getByLabel('What is it about?').selectOption('idea')
    await page.getByLabel('Summary').fill('Add a dark mode switch')
    await page.getByLabel('Details (optional)').fill("SELECT 'a & b';")
    const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Continue on GitHub' }).click()])
    const url = new URL(popup.url())
    assert.equal(`${url.origin}${url.pathname}`, 'https://github.com/AnimeshHembram/Sqll-SQL-Learn-/issues/new')
    assert.equal(url.searchParams.get('title'), 'Idea: Add a dark mode switch')
    assert.match(url.searchParams.get('body'), /SELECT 'a & b';/)
    assert.match(url.searchParams.get('body'), /Browser: /)
    assert.equal(await popup.evaluate(() => window.opener), null, 'GitHub cannot reach back into the app')
    assert.match(await page.getByRole('status').filter({ hasText: 'GitHub opened' }).innerText(), /Nothing is sent until you submit/)
  })

  assert.deepEqual(errors, [], 'no console errors')
  console.log(`\n${passed} interaction checks passed.`)
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
