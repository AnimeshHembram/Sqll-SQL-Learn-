/**
 * Regression suite: proves that existing learning features still work exactly
 * as before SQL Path work began.
 *
 *   npm run build
 *   npm run test:regression
 *   npm run test:regression -- --baseline <folder>
 *
 * Covers, on the production build:
 *   - Learn: every lesson opens and every runnable example gives its documented result;
 *   - Practice: the bookstore data, running, changing and resetting the database;
 *   - Challenges: every solution is accepted and every labelled wrong answer gets its feedback;
 *   - Quizzes: every quiz can be finished and its score is saved;
 *   - Progress: saved progress is shown correctly, survives reloads, exports and imports
 *     unchanged, and no new browser storage keys appear;
 *   - Themes: six pages in all four themes keep readable text, and, with --baseline,
 *     look the same as the screenshots in that folder.
 *
 * With --baseline <folder>, screenshots are compared with the PNG files in that folder.
 * A screenshot with no file there yet is saved as the new baseline. The folder is
 * meant to live outside the repository. Without --baseline, screenshots are skipped.
 *
 * Needs Playwright with Chromium (not a project dependency), like npm run test:ui.
 */

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
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
if (!existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('No production build found. Run npm run build first.')
  process.exit(1)
}

const baselineArg = process.argv.indexOf('--baseline')
const baselineDir = baselineArg > 0 ? path.resolve(process.argv[baselineArg + 1] ?? '') : null
if (baselineDir) mkdirSync(baselineDir, { recursive: true })

// Course content, read with the same loader the build uses, so the suite always follows the real lessons.
const { loadAllContent } = await import('../plugins/content/index.ts')
const { summarizeStreak, dayKey, shiftDay } = await import('../src/features/progress/progressModel.ts')
const contentDir = path.join(root, 'src', 'content')
const course = loadAllContent({
  dir: path.join(contentDir, 'modules'),
  datasetsDir: path.join(contentDir, 'datasets'),
  challengesDir: path.join(contentDir, 'challenges'),
  quizzesDir: path.join(contentDir, 'quizzes'),
})
assert.deepEqual(course.errors, [], 'content loads without errors')
const bookstoreSql = readFileSync(path.join(contentDir, 'datasets', 'bookstore.sql'), 'utf8')

const STORAGE_KEYS = ['sql-learner:progress:v1', 'sql-learner:theme:v1', 'sql-learner:last-lesson:v1']
const THEMES = ['original', 'black', 'white', 'purple']

const server = await preview({ root, preview: { port: 0, strictPort: false }, logLevel: 'silent' })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await chromium.launch()
const errors = []
const counts = { lessons: 0, examples: 0, challenges: 0, wrongAnswers: 0, quizzes: 0, screenshotsCompared: 0, screenshotsSaved: 0 }
let passed = 0

async function check(name, body, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true, ...options })
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

async function setSql(page, sql) {
  await page.locator('.cm-content').first().click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.press('Delete')
  if (sql) await page.keyboard.insertText(sql)
}

/** Waits until no CSS transition or animation is running, so colours have reached their final value. */
async function settle(page) {
  await page.waitForFunction(() => document.getAnimations().length === 0, null, { timeout: 10000 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

const engineReady = (page) =>
  page.waitForFunction(
    () => !/Starting the SQL engine|Loading the challenge/.test(document.body.innerText) && document.querySelector('.cm-content') !== null,
    null,
    { timeout: 30000 },
  )
const stored = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), key)
const storageKeys = (page) =>
  page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('sql-learner:')).sort())

function assertOnlyKnownKeys(keys) {
  for (const key of keys) assert.ok(STORAGE_KEYS.includes(key), `unexpected browser storage key ${key}`)
}

/** Expected Practice table list, computed from bookstore.sql with real SQLite. */
function bookstoreTables() {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(bookstoreSql)
    const names = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name)
    return names.map((name) => ({ name, rows: Number(db.prepare(`SELECT count(*) AS n FROM "${name}"`).get().n) }))
  } finally {
    db.close()
  }
}

/** A copy of the typical progress fixture whose activity is moved so its last day is today. */
function typicalProgressEndingToday() {
  const fixture = JSON.parse(readFileSync(path.join(root, 'scripts', 'fixtures', 'progress', 'typical.json'), 'utf8'))
  const days = Object.keys(fixture.activity).sort()
  const last = days.at(-1)
  const today = dayKey(new Date())
  const offset = Math.round((Date.parse(`${today}T12:00:00`) - Date.parse(`${last}T12:00:00`)) / 86_400_000)
  fixture.activity = Object.fromEntries(days.map((day) => [shiftDay(day, offset), fixture.activity[day]]))
  return fixture
}

try {
  // --- Learn ----------------------------------------------------------------------------
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      await check(`learn: ${module.id}/${lesson.id} opens and its ${lesson.examples.length} examples give their documented results`, async (page) => {
        await page.goto(`${base}/learn/${module.id}/${lesson.id}`)
        await page.getByRole('heading', { level: 1, name: lesson.title }).waitFor()
        const runs = page.getByRole('button', { name: /^Run \(example \d+\)$/ })
        assert.equal(await runs.count(), lesson.examples.length, 'one Run button per runnable example')
        for (const [index, example] of lesson.examples.entries()) {
          const number = index + 1
          await page.getByRole('button', { name: `Run (example ${number})`, exact: true }).click()
          await page.getByRole('button', { name: `Run again (example ${number})`, exact: true }).waitFor({ timeout: 15000 })
          const figure = page.locator('figure[data-example]').nth(index)
          const text = await figure.innerText()
          assert.doesNotMatch(text, /The query failed|Differs from the expected output|This query ran without an error/, `example ${number}: ${text.slice(0, 300)}`)
          if (example.kind === 'error') assert.match(text, /This query fails, as the lesson explains\./, `example ${number} fails as documented`)
          else if (example.expected) assert.match(text, /Matches the expected output shown below\./, `example ${number} matches its table`)
          counts.examples += 1
        }
        counts.lessons += 1
      })
    }
  }

  // --- Practice ---------------------------------------------------------------------------
  await check('practice: bookstore tables, running, changes kept in the session, Reset database restores the data', async (page) => {
    await page.goto(`${base}/practice`)
    await page.waitForFunction(() => document.body.innerText.includes('Ready. SQLite'), null, { timeout: 30000 })
    const text = await page.locator('main').innerText()
    for (const table of bookstoreTables()) {
      assert.match(text, new RegExp(`${table.name}[\\s\\S]{0,40}${table.rows} rows?`), `table ${table.name} with ${table.rows} rows is listed`)
    }
    const status = () => page.getByRole('status').first().innerText()
    const scalar = async (sql) => {
      await setSql(page, sql)
      await page.getByRole('button', { name: /^Run$/ }).click()
      await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.startsWith('Ran '), null, { timeout: 15000 })
      return page.locator('main table tbody tr').first().innerText()
    }
    const before = await scalar('SELECT count(*) AS n FROM books')
    await setSql(page, "INSERT INTO books (title, author, genre, year, price) VALUES ('Regression test book', 'Test Author', 'Testing', 2026, 9.99)")
    await page.getByRole('button', { name: /^Run$/ }).click()
    await page.waitForFunction(() => document.querySelector('[role=status]')?.textContent.startsWith('Ran '), null, { timeout: 15000 })
    assert.match(await status(), /Ran 1 statement/)
    const during = await scalar('SELECT count(*) AS n FROM books')
    assert.equal(Number(during), Number(before) + 1, 'a change is kept for the rest of the session')
    await page.getByRole('button', { name: 'Reset database' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Reset database' }).click()
    await page.waitForFunction(() => document.body.innerText.includes('The database was reset to the original bookstore data.'), null, { timeout: 30000 })
    assert.equal(await scalar('SELECT count(*) AS n FROM books'), before, 'Reset database restores the original data')
  })

  // --- Challenges -------------------------------------------------------------------------
  for (const challenge of course.challenges) {
    const solution = course.solutions[challenge.id]
    const wrong = course.wrongAnswers[challenge.id] ?? []
    await check(`challenge: ${challenge.id} accepts its solution and gives ${wrong.length} labelled wrong answers their feedback`, async (page) => {
      await page.goto(`${base}/challenges/${challenge.id}`)
      await engineReady(page)
      const submit = async (sql) => {
        await setSql(page, sql)
        await page.getByRole('button', { name: 'Submit answer', exact: true }).click()
        await page.getByRole('button', { name: 'Submit answer', exact: true }).waitFor({ timeout: 15000 })
        await page.waitForSelector('[data-feedback]', { timeout: 15000 })
        return page.locator('[aria-live="polite"] [data-feedback]').getAttribute('data-feedback')
      }
      for (const answer of wrong) {
        assert.equal(await submit(answer.sql), answer.kind, `wrong answer labelled ${answer.kind}`)
        counts.wrongAnswers += 1
      }
      assert.equal(await submit(solution.sql), 'correct', 'the reference solution is accepted')
      const saved = await stored(page, 'sql-learner:progress:v1')
      assert.ok(saved?.challenges?.[challenge.id]?.solvedAt, 'the solve is saved')
      assert.equal(saved.challenges[challenge.id].attempts, wrong.length + 1, 'every submission is counted')
      counts.challenges += 1
    })
  }

  await check('challenge: hints appear one at a time and Show the solution reveals the reference query', async (page) => {
    const challenge = course.challenges.at(-1)
    await page.goto(`${base}/challenges/${challenge.id}`)
    await engineReady(page)
    for (let shown = 0; shown < challenge.hints.length; shown += 1) {
      await page.getByRole('button', { name: /hint/i }).first().click()
      await page.getByText(`Hints used: ${shown + 1} of ${challenge.hints.length}.`, { exact: false }).waitFor()
    }
    assert.equal(await page.getByRole('button', { name: /hint/i }).count(), 0, 'no hint button once every hint is shown')
    await page.getByRole('button', { name: 'Show the solution' }).click()
    await page.waitForFunction(() => document.body.innerText.includes('Reference query'))
    const saved = await stored(page, 'sql-learner:progress:v1')
    assert.equal(saved.challenges[challenge.id].hintsUsed, challenge.hints.length)
    assert.equal(saved.challenges[challenge.id].revealedSolution, true)
  })

  // --- Quizzes ------------------------------------------------------------------------------
  for (const quiz of course.quizzes) {
    await check(`quiz: ${quiz.id} can be finished with every answer right and the score is saved`, async (page) => {
      await page.goto(`${base}/quizzes/${quiz.id}`)
      for (const question of quiz.questions) {
        const card = page.locator(`fieldset[data-question="${question.id}"]`)
        await card.locator('input[type=radio]').nth(question.correctIndex).check()
        await card.getByRole('button', { name: /Check answer/ }).click()
        await card.locator('[aria-live="polite"]').getByText(/Correct\./).waitFor()
      }
      const summary = await page.getByRole('status').filter({ hasText: 'You answered' }).innerText()
      assert.match(summary, new RegExp(`You answered ${quiz.questions.length} of ${quiz.questions.length} questions correctly`))
      const saved = await stored(page, 'sql-learner:progress:v1')
      assert.deepEqual(
        { bestScore: saved.quizzes[quiz.id].bestScore, total: saved.quizzes[quiz.id].total, attempts: saved.quizzes[quiz.id].attempts },
        { bestScore: quiz.questions.length, total: quiz.questions.length, attempts: 1 },
      )
      counts.quizzes += 1
    })
  }

  // --- Progress -------------------------------------------------------------------------------
  await check('progress: saved progress is shown, survives reloads, and only expected entries change', async (page) => {
    const seeded = typicalProgressEndingToday()
    await page.goto(base)
    await page.evaluate((value) => localStorage.setItem('sql-learner:progress:v1', JSON.stringify(value)), seeded)
    await page.reload()
    const lessonIds = new Set(course.modules.flatMap((module) => module.lessons.map((lesson) => `${module.id}/${lesson.id}`)))
    const lessonsDone = Object.keys(seeded.lessons).filter((key) => lessonIds.has(key)).length
    const challengesDone = course.challenges.filter((challenge) => seeded.challenges[challenge.id]?.solvedAt).length
    const quizzesDone = course.quizzes.filter((quiz) => seeded.quizzes[quiz.id]).length
    const streak = summarizeStreak(seeded.activity, new Date())
    const tile = (label) => page.getByRole('region', { name: label, exact: true }).innerText()
    assert.match(await tile('Lessons completed'), new RegExp(`${lessonsDone}\\s+of ${lessonIds.size}`))
    assert.match(await tile('Challenges solved'), new RegExp(`${challengesDone}\\s+of ${course.challenges.length}`))
    assert.match(await tile('Quizzes finished'), new RegExp(`${quizzesDone}\\s+of ${course.quizzes.length}`))
    assert.match(await tile('Learning streak'), new RegExp(`${streak.current} days?`))
    assert.deepEqual(await stored(page, 'sql-learner:progress:v1'), seeded, 'opening the app does not rewrite saved progress')

    // A new lesson completion and a new solve change only their own entries, today's activity and the recent list.
    const lessonModule = course.modules.at(-1)
    const lesson = lessonModule.lessons[0]
    await page.goto(`${base}/learn/${lessonModule.id}/${lesson.id}`)
    await page.getByRole('button', { name: 'Mark as complete' }).click()
    const challenge = course.challenges.find((item) => !seeded.challenges[item.id])
    await page.goto(`${base}/challenges/${challenge.id}`)
    await engineReady(page)
    await setSql(page, course.solutions[challenge.id].sql)
    await page.getByRole('button', { name: 'Submit answer', exact: true }).click()
    await page.waitForSelector('[data-feedback="correct"]', { timeout: 15000 })
    await page.reload()
    const after = await stored(page, 'sql-learner:progress:v1')
    const key = `${lessonModule.id}/${lesson.id}`
    const today = dayKey(new Date())
    assert.ok(after.lessons[key], 'the lesson completion survives a reload')
    assert.ok(after.challenges[challenge.id]?.solvedAt, 'the solve survives a reload')
    const unchanged = (value, drop) => Object.fromEntries(Object.entries(value).filter(([k]) => !drop.includes(k)))
    assert.deepEqual(unchanged(after.lessons, [key]), seeded.lessons, 'other lessons unchanged')
    assert.deepEqual(unchanged(after.challenges, [challenge.id]), seeded.challenges, 'other challenges unchanged')
    assert.deepEqual(after.quizzes, seeded.quizzes, 'quizzes unchanged')
    assert.deepEqual(unchanged(after.activity, [today]), unchanged(seeded.activity, [today]), 'earlier days unchanged')
    assert.equal(after.activity[today], (seeded.activity[today] ?? 0) + 2, 'two actions added today')
    assert.deepEqual(after.recent.slice(2), seeded.recent.slice(0, 18), 'older events keep their order')
    assertOnlyKnownKeys(await storageKeys(page))
  })

  await check('progress: export, then import into a clean browser, gives back the same progress', async (page, context) => {
    const seeded = typicalProgressEndingToday()
    await page.goto(base)
    await page.evaluate((value) => localStorage.setItem('sql-learner:progress:v1', JSON.stringify(value)), seeded)
    await page.goto(`${base}/settings`)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export progress' }).click()])
    const file = path.join(tmpdir(), `sql-learner-regression-${process.pid}.json`)
    await download.saveAs(file)
    const exported = JSON.parse(readFileSync(file, 'utf8'))
    assert.equal(exported.app, 'sql-learner')
    assert.deepEqual(exported.progress, seeded, 'the export holds exactly the saved progress')

    const clean = await context.browser().newContext({ viewport: { width: 1280, height: 900 } })
    try {
      const fresh = await clean.newPage()
      fresh.on('pageerror', (error) => errors.push(`import: ${error.message}`))
      await fresh.goto(`${base}/settings`)
      assert.equal(await stored(fresh, 'sql-learner:progress:v1'), null, 'the clean browser starts with no progress')
      await fresh.locator('input[type=file]').setInputFiles(file)
      await fresh.getByRole('dialog').getByRole('button', { name: 'Replace progress' }).click()
      await fresh.getByRole('status').filter({ hasText: 'Progress imported' }).waitFor()
      assert.deepEqual(await stored(fresh, 'sql-learner:progress:v1'), seeded, 'the import restores exactly the exported progress')
      await fresh.reload()
      assert.deepEqual(await stored(fresh, 'sql-learner:progress:v1'), seeded, 'and it survives a reload')
      assertOnlyKnownKeys(await storageKeys(fresh))
    } finally {
      await clean.close()
    }
  })

  // --- Themes ---------------------------------------------------------------------------------
  const pages = [
    { name: 'dashboard', path: '/', ready: (page) => page.getByRole('heading', { level: 1 }).first().waitFor() },
    { name: 'lesson', path: `/learn/${course.modules[0].id}/${course.modules[0].lessons[1].id}`, ready: (page) => page.getByRole('heading', { level: 1 }).first().waitFor() },
    { name: 'practice', path: '/practice', ready: (page) => page.waitForFunction(() => document.body.innerText.includes('Ready. SQLite'), null, { timeout: 30000 }) },
    {
      name: 'challenge',
      path: `/challenges/${course.challenges[0].id}`,
      ready: async (page) => {
        await page.getByRole('button', { name: 'Submit answer', exact: true }).waitFor({ timeout: 30000 })
        await engineReady(page)
      },
    },
    { name: 'quiz', path: `/quizzes/${course.quizzes[0].id}`, ready: (page) => page.locator('fieldset').first().waitFor() },
    { name: 'settings', path: '/settings', ready: (page) => page.getByRole('radio', { name: 'Original' }).waitFor() },
  ]

  for (const theme of THEMES) {
    await check(
      `theme: ${theme} on ${pages.map((item) => item.name).join(', ')}: readable text${baselineDir ? ' and unchanged appearance' : ''}`,
      async (page) => {
        await page.goto(base)
        await page.evaluate((value) => localStorage.setItem('sql-learner:theme:v1', JSON.stringify(value)), theme)
        for (const item of pages) {
          await page.goto(`${base}${item.path}`)
          await item.ready(page)
          await settle(page)
          assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme, `${item.name} uses the ${theme} theme`)
          const ratio = await page.evaluate(() => {
            const luminance = (color) => {
              const [r, g, b] = color.match(/[\d.]+/g).slice(0, 3).map((value) => {
                const v = Number(value) / 255
                return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
              })
              return 0.2126 * r + 0.7152 * g + 0.0722 * b
            }
            const main = document.querySelector('main')
            let node = main
            let background = getComputedStyle(node).backgroundColor
            while (node && /rgba\(0, 0, 0, 0\)|transparent/.test(background)) {
              node = node.parentElement
              background = node ? getComputedStyle(node).backgroundColor : 'rgb(255, 255, 255)'
            }
            const [l1, l2] = [luminance(getComputedStyle(main).color), luminance(background)].sort((x, y) => y - x)
            return (l1 + 0.05) / (l2 + 0.05)
          })
          assert.ok(ratio >= 4.5, `${theme} ${item.name}: main text contrast ${ratio.toFixed(2)}`)
          if (!baselineDir) continue

          await page.evaluate(() => document.fonts.ready)
          await settle(page)
          const shot = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' })
          const file = path.join(baselineDir, `${theme}-${item.name}.png`)
          if (!existsSync(file)) {
            writeFileSync(file, shot)
            counts.screenshotsSaved += 1
            continue
          }
          const result = await compareImages(page, readFileSync(file), shot)
          if (!result.same) writeFileSync(path.join(baselineDir, `${theme}-${item.name}.actual.png`), shot)
          assert.ok(result.same, `${theme} ${item.name} looks different from its baseline: ${result.reason}`)
          counts.screenshotsCompared += 1
        }
        assertOnlyKnownKeys(await storageKeys(page))
      },
      { reducedMotion: 'reduce' },
    )
  }

  assert.deepEqual(errors, [], 'no console errors')
  const totalExamples = course.modules.reduce((sum, module) => sum + module.lessons.reduce((n, lesson) => n + lesson.examples.length, 0), 0)
  assert.equal(counts.examples, totalExamples, 'every example was run')
  console.log(`\n${passed} regression checks passed.`)
  console.log(
    `Covered ${counts.lessons} lessons and ${counts.examples} examples, ${counts.challenges} challenges with ${counts.wrongAnswers} wrong answers, ` +
      `${counts.quizzes} quizzes, ${THEMES.length} themes on ${pages.length} pages.`,
  )
  if (baselineDir) console.log(`Screenshots: ${counts.screenshotsCompared} compared with the baseline, ${counts.screenshotsSaved} saved as new baselines in ${baselineDir}.`)
  else console.log('Screenshots: skipped (no --baseline folder given).')
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}

/**
 * Compares two PNG screenshots pixel by pixel, decoded by the browser itself, so no
 * image library is needed. Same size required; at most 0.1% of pixels may differ
 * noticeably (any channel by more than 32), which absorbs anti-aliasing noise only.
 */
async function compareImages(page, expected, actual) {
  return page.evaluate(
    async ([a, b]) => {
      const load = async (base64) => {
        const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
        const canvas = new OffscreenCanvas(image.width, image.height)
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0)
        return { width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data }
      }
      const [x, y] = await Promise.all([load(a), load(b)])
      if (x.width !== y.width || x.height !== y.height) return { same: false, reason: `size ${x.width}×${x.height} became ${y.width}×${y.height}` }
      let different = 0
      for (let i = 0; i < x.data.length; i += 4) {
        if (Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2])) > 32) different += 1
      }
      const share = different / (x.width * x.height)
      return { same: share <= 0.001, reason: `${different} pixels (${(share * 100).toFixed(3)}%) differ` }
    },
    [expected.toString('base64'), actual.toString('base64')],
  )
}
