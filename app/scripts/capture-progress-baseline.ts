/**
 * Records how today's progress code reads and summarises saved progress, so
 * later changes can be checked against it (scripts/test-progress-fixtures.ts).
 *
 *   node --disable-warning=ExperimentalWarning scripts/capture-progress-baseline.ts
 *
 * Reads the fixtures in scripts/fixtures/progress/ and writes expected.json next
 * to them. It refuses to replace an existing expected.json unless run with
 * --force, because those values are the baseline that protects learners'
 * progress: they should only be captured again when a change to progress is
 * intended and approved.
 *
 * Every result uses a fixed "now" (6 Nov 2026, noon local time), so the values
 * are the same on every machine and every day.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadAllContent } from '../plugins/content/index.ts'
import {
  addActivity,
  addRecent,
  parseProgress,
  recentDays,
  summarizeStreak,
  type ProgressData,
} from '../src/features/progress/progressModel.ts'
import {
  challengeCount,
  lessonCount,
  moduleCount,
  nextIncompleteLesson,
  nextUnsolvedChallenge,
  percent,
  quizCount,
} from '../src/features/progress/progressSummary.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
export const FIXTURES_DIR = path.join(root, 'scripts/fixtures/progress')
export const EXPECTED_FILE = path.join(FIXTURES_DIR, 'expected.json')
export const FIXTURE_NAMES = ['typical', 'long-history', 'damaged'] as const

/** The fixed "today" for every calculation: 6 Nov 2026 at noon, local time. */
export const NOW = new Date(2026, 10, 6, 12, 0, 0)

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, `${name}.json`), 'utf8')) as unknown
}

function loadCourse() {
  const contentDir = path.join(root, 'src/content')
  const content = loadAllContent({
    dir: path.join(contentDir, 'modules'),
    datasetsDir: path.join(contentDir, 'datasets'),
    challengesDir: path.join(contentDir, 'challenges'),
    quizzesDir: path.join(contentDir, 'quizzes'),
  })
  if (content.errors.length > 0) throw new Error(`Content has errors:\n  ${content.errors.join('\n  ')}`)
  return content
}

/** Turns undefined into null so results survive a round trip through JSON. */
function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T
}

function summarise(progress: ProgressData, course: ReturnType<typeof loadCourse>) {
  const lessons = lessonCount(course.modules, progress)
  const next = nextIncompleteLesson(course.modules, progress)
  return {
    lessons,
    lessonsPercent: percent(lessons),
    modules: Object.fromEntries(course.modules.map((module) => [module.id, moduleCount(module, progress)])),
    nextLesson: next ? `${next.module.id}/${next.lessonId}` : null,
    challenges: challengeCount(course.challenges, progress),
    nextChallenge: nextUnsolvedChallenge(course.challenges, progress)?.id ?? null,
    quizzes: quizCount(course.quizzes, progress),
    streak: summarizeStreak(progress.activity, NOW),
    last30Days: recentDays(progress.activity, NOW, 30),
  }
}

/** Every value the fixture test compares. Built only from today's progress code and content. */
export function computeGolden() {
  const course = loadCourse()
  const fixtures: Record<string, unknown> = {}

  for (const name of FIXTURE_NAMES) {
    const raw = readFixture(name)
    const parsed = parseProgress(raw)
    if (!parsed) throw new Error(`${name}.json is not readable progress`)
    const reparsed = parseProgress(JSON.parse(JSON.stringify(parsed)))
    // What saving again would do: one more action today, and a new event at the top of the list.
    const afterOneAction = addRecent(addActivity(parsed, NOW), { kind: 'lesson', id: 'sql-fundamentals/limiting-results', at: NOW.toISOString() })
    fixtures[name] = plain({
      parsed,
      stableAfterSaveAndLoad: JSON.stringify(reparsed) === JSON.stringify(parsed),
      summary: summarise(parsed, course),
      afterOneAction: {
        activityDays: Object.keys(afterOneAction.activity).length,
        oldestActivityDay: Object.keys(afterOneAction.activity).sort()[0] ?? null,
        todayCount: afterOneAction.activity['2026-11-06'] ?? 0,
        recentIds: afterOneAction.recent.map((event) => `${event.kind}:${event.id}`),
      },
    })
  }

  const typical = readFixture('typical')
  const refused = {
    otherVersion: parseProgress({ ...(typical as object), version: 2 }),
    notAnObject: parseProgress('progress'),
    anArray: parseProgress([typical]),
    nothing: parseProgress(null),
  }

  return plain({
    now: '2026-11-06 12:00 local time',
    content: {
      lessons: course.modules.map((module) => ({ module: module.id, lessons: module.lessons.map((lesson) => lesson.id) })),
      challenges: course.challenges.map((challenge) => `${challenge.difficulty}:${challenge.id}`),
      quizzes: course.quizzes.map((quiz) => `${quiz.id}:${quiz.questions.length}`),
    },
    fixtures,
    refused,
  })
}

function main() {
  const force = process.argv.includes('--force')
  if (existsSync(EXPECTED_FILE) && !force) {
    console.error(`${path.relative(root, EXPECTED_FILE)} already exists. It is the progress baseline; use --force only for an approved change.`)
    process.exit(1)
  }
  const golden = computeGolden()
  writeFileSync(EXPECTED_FILE, `${JSON.stringify(golden, null, 2)}\n`)
  console.log(`Wrote ${path.relative(root, EXPECTED_FILE)} from ${FIXTURE_NAMES.length} fixtures.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
