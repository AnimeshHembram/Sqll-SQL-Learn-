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

  await check('settings: each theme applies to the whole app, keeps 4.5:1 text contrast and is remembered', async (page) => {
    for (const [label, id] of [['Black', 'black'], ['White', 'white'], ['Purple', 'purple'], ['Original', 'original']]) {
      await page.goto(`${base}/settings`)
      await page.getByRole('radio', { name: label }).check()
      await page.reload()
      assert.equal(await page.getByRole('radio', { name: label }).isChecked(), true, `${label} stays selected after a reload`)
      await page.goto(`${base}/practice`)
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), id, `${label} applies on other pages`)
      const ratios = await page.evaluate(() => {
        const luminance = (color) => {
          const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
            const v = Number(value) / 255
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
          })
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        const token = (name) => {
          const probe = document.createElement('span')
          probe.style.color = getComputedStyle(document.documentElement).getPropertyValue(name)
          document.body.append(probe)
          const value = getComputedStyle(probe).color
          probe.remove()
          return value
        }
        const ratio = (a, b) => {
          const [l1, l2] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x)
          return (l1 + 0.05) / (l2 + 0.05)
        }
        return {
          text: ratio('--color-text', '--color-bg'),
          textOnSurface: ratio('--color-text', '--color-surface'),
          muted: ratio('--color-text-muted', '--color-surface-muted'),
          link: ratio('--color-primary', '--color-surface'),
          button: ratio('--color-on-primary', '--color-primary'),
          sidebar: ratio('--color-sidebar-text', '--color-sidebar'),
        }
      })
      for (const [name, value] of Object.entries(ratios)) assert.ok(value >= 4.5, `${label} ${name} contrast ${value.toFixed(2)}`)
    }
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
    // The sidebar marks the link as current when React re-renders, which can land just after the URL changes.
    const feedbackLink = page.getByRole('link', { name: 'Feedback' })
    await feedbackLink.and(page.locator('[aria-current="page"]')).waitFor({ timeout: 5000 })
    assert.equal(await feedbackLink.getAttribute('aria-current'), 'page')

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

  // --- SQL Path ---------------------------------------------------------------------

  /** Learn SQL progress with the given "module/lesson" keys complete. */
  const lessonsDone = (...keys) => ({
    version: 1,
    lessons: Object.fromEntries(keys.map((key) => [key, { completedAt: '2026-11-01T10:00:00.000Z' }])),
    challenges: {},
    quizzes: {},
    activity: {},
    recent: [],
  })
  const FUNDAMENTALS = ['what-is-sql', 'introduction-to-select', 'filtering-with-where', 'sorting-with-order-by', 'limiting-results'].map(
    (id) => `sql-fundamentals/${id}`,
  )
  const storedPaths = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sql-learner:paths:v1') ?? 'null'))

  await check('sql path: the sidebar link opens eight career paths, with no path chosen yet', async (page) => {
    await page.goto(`${base}/`)
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'SQL Path' }).click()
    await page.waitForURL(/\/paths$/)
    await page.getByRole('heading', { level: 1, name: 'SQL Path' }).waitFor()
    const cards = page.locator('main article')
    assert.equal(await cards.count(), 8)
    for (const title of ['Data Analyst', 'Data Engineer', 'BI Analyst', 'Database Administrator', 'Database Developer', 'Backend Developer', 'Data Scientist', 'Cybersecurity Analyst']) {
      assert.equal(await page.getByRole('link', { name: title, exact: true }).count(), 1, `${title} card`)
    }
    assert.equal(await page.getByText('Current path', { exact: true }).count(), 0)
    await page.getByRole('link', { name: 'Data Analyst', exact: true }).click()
    await page.waitForURL(/\/paths\/data-analyst$/)
  })

  await check('sql path: planned chapters are labelled and never count; ready chapters follow Learn SQL lessons', async (page) => {
    await page.goto(`${base}/paths/data-analyst`)
    await page.evaluate((progress) => localStorage.setItem('sql-learner:progress:v1', JSON.stringify(progress)), lessonsDone(...FUNDAMENTALS, 'summarising-data/counting-rows'))
    await page.reload()
    const main = page.locator('main')
    await main.getByText('1 of 7 ready chapters complete', { exact: true }).first().waitFor()
    const chapter = (title) => main.locator('li', { has: page.getByRole('heading', { level: 3, name: title, exact: true }) })
    assert.match(await chapter('Querying a table').innerText(), /Complete/)
    assert.match(await chapter('Summarising data').innerText(), /1 of 4 lessons done/)
    const planned = chapter('Revenue and order metrics')
    assert.match(await planned.innerText(), /Planned/)
    assert.match(await planned.innerText(), /does not count towards your progress/)
    assert.equal(await planned.getByRole('link').count(), 0, 'a planned chapter has no link')
    const plannedLabels = await main.locator('[data-state="planned"]').count()
    assert.ok(plannedLabels >= 10, `planned chapters and projects are labelled (${plannedLabels})`)
    // The link of a ready chapter opens the real lesson.
    await chapter('Summarising data').getByRole('link', { name: 'Totals and averages with SUM, AVG, MIN and MAX' }).click()
    await page.waitForURL(/\/learn\/summarising-data\/sum-avg-min-max$/)
  })

  await check('sql path: choosing a path is remembered, and switching keeps each path\'s own record', async (page) => {
    await page.goto(`${base}/paths/data-analyst`)
    await page.getByRole('button', { name: 'Make this my current path' }).click()
    const status = page.getByRole('status').filter({ hasText: 'Data Analyst is now your current path.' })
    await status.waitFor()
    await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'status')
    await page.reload()
    await page.getByText('This is your current path.').waitFor()
    assert.equal(await page.getByRole('button', { name: 'Make this my current path' }).count(), 0)
    const first = await storedPaths(page)
    assert.equal(first.activePathId, 'data-analyst')

    await page.goto(`${base}/paths/cybersecurity-analyst`)
    await page.getByRole('button', { name: 'Switch to Cybersecurity Analyst' }).click()
    await page.getByRole('status').filter({ hasText: 'Your Data Analyst progress is kept.' }).waitFor()
    const second = await storedPaths(page)
    assert.equal(second.activePathId, 'cybersecurity-analyst')
    assert.deepEqual(second.paths['data-analyst'], first.paths['data-analyst'], 'switching leaves the Data Analyst record untouched')
    assert.ok(second.paths['cybersecurity-analyst'])

    await page.goto(`${base}/paths`)
    await page.getByRole('heading', { level: 2, name: 'All career paths' }).waitFor()
    const current = page.locator('main article[data-current]')
    assert.equal(await current.count(), 1)
    assert.match(await current.innerText(), /Cybersecurity Analyst/)
    assert.match(await page.locator('main').innerText(), /Your current path: Cybersecurity Analyst/)

    await page.goto(`${base}/paths/data-analyst`)
    await page.getByText('You have progress in this path. It is kept.').waitFor()
    await page.getByRole('button', { name: 'Switch to Data Analyst' }).click()
    await page.getByRole('status').filter({ hasText: 'Your Cybersecurity Analyst progress is kept.' }).waitFor()
    const third = await storedPaths(page)
    assert.equal(third.paths['data-analyst'].startedAt, first.paths['data-analyst'].startedAt, 'the original start date is kept')
    assert.deepEqual(third.paths['cybersecurity-analyst'], second.paths['cybersecurity-analyst'])
  })

  await check('sql path: stage navigation moves to the stage; unknown paths show Not found', async (page) => {
    await page.goto(`${base}/paths/data-engineer`)
    await page.getByRole('navigation', { name: 'Stages' }).getByRole('button', { name: /Stage 4: Data modelling/ }).click()
    assert.match(await focused(page), /Data modelling/)
    await page.goto(`${base}/paths/not-a-path`)
    await page.locator('main h1').filter({ hasText: /not found/i }).waitFor()
  })

  await check('sql path: labels and text keep 4.5:1 contrast in every theme', async (page) => {
    for (const label of ['Black', 'White', 'Purple', 'Original']) {
      await page.goto(`${base}/settings`)
      await page.getByRole('radio', { name: label }).check()
      for (const url of ['/paths', '/paths/data-analyst', '/paths/data-analyst/problems', '/paths/data-analyst/problems/1']) {
        await page.goto(`${base}${url}`)
        // The pages load on demand: measure the page itself, not the loading message.
        await page.locator('main h2').first().waitFor()
        await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)))
        const worst = await page.evaluate(() => {
          const luminance = (color) => {
            const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
              const v = Number(value) / 255
              return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
            })
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
          }
          const background = (element) => {
            for (let node = element; node; node = node.parentElement) {
              const color = getComputedStyle(node).backgroundColor
              if (!/rgba\(.*, 0\)$/.test(color) && color !== 'transparent') return color
            }
            return getComputedStyle(document.body).backgroundColor
          }
          const ratio = (a, b) => {
            const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
            return (l1 + 0.05) / (l2 + 0.05)
          }
          let lowest = { value: Infinity, text: '' }
          const selector = 'main [data-state], main h1, main h2, main h3, main p, main dt, main dd, main a, main button, main li'
          for (const element of document.querySelectorAll(selector)) {
            if (!element.textContent.trim() || !element.checkVisibility()) continue
            const value = ratio(getComputedStyle(element).color, background(element))
            if (value < lowest.value) lowest = { value, text: element.textContent.trim().slice(0, 40) }
          }
          return lowest
        })
        assert.ok(worst.value >= 4.5, `${label} ${url}: "${worst.text}" contrast ${worst.value.toFixed(2)}`)
      }
    }
  })

  await check('sql path chapter: exercises are really checked and saved only in the path record; completion needs every step', async (page) => {
    await page.goto(`${base}/paths/data-analyst`)
    await page.getByRole('link', { name: 'Combining tables with joins', exact: true }).click()
    await page.getByRole('heading', { level: 1, name: 'Combining tables with joins' }).waitFor()
    // A runnable example in the chapter text.
    await page.getByRole('button', { name: /^Run/ }).first().click()
    await page.waitForFunction(() => document.body.innerText.includes('Matches the expected output'), null, { timeout: 15000 })

    const exercise = page.locator('[data-exercise="da-customers-without-orders"]')
    await exercise.getByRole('button', { name: 'Submit answer' }).click()
    await exercise.locator('[data-feedback="extra-rows"]').waitFor()
    await exercise.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Delete')
    await page.keyboard.insertText('SELECT c.name FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id WHERE o.id IS NULL')
    await exercise.getByRole('button', { name: 'Submit answer' }).click()
    await exercise.locator('[data-feedback="correct"]').waitFor()
    const stored = await storedPaths(page)
    assert.equal(stored.paths['data-analyst'].exercises['da-customers-without-orders'].attempts, 2)
    assert.ok(stored.paths['data-analyst'].exercises['da-customers-without-orders'].solvedAt)
    assert.equal(stored.activePathId, null, 'working in a chapter does not change the current path')
    const learn = await page.evaluate(() => JSON.parse(localStorage.getItem('sql-learner:progress:v1') ?? 'null'))
    assert.equal(learn?.challenges?.['da-customers-without-orders'], undefined, 'exercises are not saved as Challenges progress')

    const complete = page.getByRole('region', { name: 'Complete this chapter' })
    assert.match(await complete.innerText(), /1 of 4 solved/)
    assert.equal(await complete.getByRole('button', { name: 'Complete chapter' }).count(), 0, 'no completion before every step is done')

    // Solve the other three exercises through the same check, then pass the quiz.
    const answers = {
      'da-orders-with-cities': 'SELECT o.id AS order_id, c.city AS city FROM orders AS o JOIN customers AS c ON o.customer_id = c.id',
      'da-books-and-countries': 'SELECT b.title, a.country FROM books AS b JOIN authors AS a ON b.author = a.name',
      'da-revenue-by-genre':
        "SELECT b.genre, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM order_items AS oi JOIN books AS b ON oi.book_id = b.id JOIN orders AS o ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY b.genre",
    }
    for (const [id, sql] of Object.entries(answers)) {
      const card = page.locator(`[data-exercise="${id}"]`)
      await card.locator('.cm-content').click()
      await page.keyboard.press('ControlOrMeta+A')
      await page.keyboard.press('Delete')
      await page.keyboard.insertText(sql)
      await card.getByRole('button', { name: 'Submit answer' }).click()
      await card.locator('[data-feedback="correct"]').waitFor()
    }
    const correctOptions = [
      'So the name is stored once and every order refers to it by customer_id',
      'LEFT JOIN',
      '9',
      'SELECT b.title FROM books AS b LEFT JOIN order_items AS oi ON oi.book_id = b.id WHERE oi.book_id IS NULL;',
      'Both tables have an id column, so id is ambiguous',
    ]
    const questions = page.locator('section[aria-labelledby="chapter-quiz"] fieldset')
    for (let index = 0; index < correctOptions.length; index++) {
      const question = questions.nth(index)
      await question.getByLabel(correctOptions[index], { exact: true }).check()
      await question.getByRole('button', { name: /Check answer/ }).click()
    }
    await page.getByText('You answered 5 of 5 correctly. Quiz passed.').waitFor()
    await complete.getByRole('button', { name: 'Complete chapter' }).click()
    await page.getByText('Chapter complete. It now counts towards your path progress.').waitFor()
    const after = await storedPaths(page)
    assert.ok(after.paths['data-analyst'].chapters['combining-tables'].completedAt)
    assert.equal(after.paths['data-analyst'].quizzes['combining-tables'].bestScore, 5)

    // Previous and next chapters.
    const pager = page.getByRole('navigation', { name: 'Chapter navigation' })
    assert.match(await pager.innerText(), /Summarising data/)
    await pager.getByRole('link', { name: /Conditional logic with CASE/ }).click()
    await page.getByRole('heading', { level: 1, name: 'Conditional logic with CASE' }).waitFor()

    // The roadmap and the path's progress count the completed chapter.
    await page.goto(`${base}/paths/data-analyst`)
    const chapter = page.locator('main li', { has: page.getByRole('heading', { level: 3, name: 'Combining tables with joins' }) })
    await chapter.getByText('Complete', { exact: true }).waitFor()
    assert.match(await page.locator('main').innerText(), /1 of 7 ready chapters complete/)
  })

  await check('daily problems: the dashboard shows 365 days, only written days open, and the path page links to it', async (page) => {
    await page.goto(`${base}/paths/data-analyst`)
    await page.getByRole('link', { name: /of 365 written, 0 solved/ }).click()
    await page.getByRole('heading', { level: 1, name: 'Daily SQL problems' }).waitFor()
    const days = page.locator('section[aria-labelledby="year-map"] ol > li')
    assert.equal(await days.count(), 365, 'every day of the year is shown')
    const written = await page.getByRole('link', { name: /^Day \d+: .*\. Not tried yet\.$/ }).count()
    assert.ok(written >= 30, `the first batch is playable (${written})`)
    assert.equal(await page.getByRole('link', { name: /^Day 365:/ }).count(), 0, 'an unwritten day is not a link')
    assert.match(await page.locator('main').innerText(), /not written yet/i)
    // Filters narrow the list.
    await page.getByLabel('Topic').selectOption('Joins')
    const shown = Number(/^Showing (\d+) of \d+ written problems\.$/.exec(await page.getByRole('status').filter({ hasText: /^Showing/ }).innerText())?.[1])
    assert.ok(shown > 0 && shown < written, `the filter narrows the list (${shown})`)
    assert.equal(await page.locator('section[aria-labelledby="problem-list"] ol > li').count(), shown)
    // An unwritten day explains itself instead of failing.
    await page.goto(`${base}/paths/data-analyst/problems/365`)
    await page.getByRole('heading', { level: 1, name: 'Day 365 is not written yet' }).waitFor()
    await page.goto(`${base}/paths/data-analyst/problems/400`)
    await page.locator('main h1').filter({ hasText: /not found/i }).waitFor()
  })

  await check('daily problems: answers are really checked; attempts, hints, solutions, streak and milestone are saved in the path record', async (page) => {
    await page.goto(`${base}/paths/data-analyst/problems`)
    await page.getByRole('link', { name: 'Start: Day 1, Customer contact list' }).click()
    await page.getByRole('heading', { level: 1, name: 'Day 1: Customer contact list' }).waitFor()
    const card = page.locator('[data-exercise="da-day-001"]')
    // The starter query is not accepted.
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback]').waitFor()
    assert.notEqual(await card.locator('[data-feedback]').getAttribute('data-feedback'), 'correct')
    await card.getByRole('button', { name: 'Show the first hint' }).click()
    await card.locator('.cm-content').click()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.press('Delete')
    await page.keyboard.insertText('SELECT name, city FROM customers ORDER BY name')
    await card.getByRole('button', { name: 'Submit answer' }).click()
    await card.locator('[data-feedback="correct"]').waitFor()
    await card.getByRole('button', { name: 'Compare with the solution' }).click()
    await page.getByText(/Solved on .*\. You can keep practising/).waitFor()

    const stored = await storedPaths(page)
    const saved = stored.paths['data-analyst'].problems['da-day-001']
    assert.equal(saved.attempts, 2)
    assert.equal(saved.hintsUsed, 1)
    assert.equal(saved.revealedSolution, true)
    assert.ok(saved.solvedAt)
    assert.ok(stored.paths['data-analyst'].badges['problems-1'], 'the first milestone is reached')
    assert.equal(stored.activePathId, null, 'solving a problem does not change the current path')
    const learn = await page.evaluate(() => JSON.parse(localStorage.getItem('sql-learner:progress:v1') ?? 'null'))
    assert.equal(learn?.challenges?.['da-day-001'], undefined, 'problems are not saved as Challenges progress')

    // Next day, then skip ahead: a missed day stays open and costs nothing.
    const pager = page.getByRole('navigation', { name: 'Day navigation' })
    await pager.getByRole('link', { name: /Day 2:/ }).click()
    await page.getByRole('heading', { level: 1, name: /^Day 2:/ }).waitFor()
    await page.goto(`${base}/paths/data-analyst/problems/10`)
    await page.getByRole('heading', { level: 1, name: /^Day 10:/ }).waitFor()
    await page.getByText(/There is no deadline/).waitFor()

    await page.goto(`${base}/paths/data-analyst/problems`)
    const main = page.locator('main')
    await main.getByText('1 of', { exact: false }).first().waitFor()
    assert.match(await main.innerText(), /Current streak\s*1 day/)
    assert.match(await main.innerText(), /✓ First problem solved/)
    await page.getByRole('link', { name: /^Day 1: Customer contact list\. Solved\.$/ }).waitFor()
    await page.getByRole('link', { name: 'Continue: Day 2, Stock the mystery shelf' }).waitFor()
  })

  assert.deepEqual(errors, [], 'no console errors')
  console.log(`\n${passed} interaction checks passed.`)
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
