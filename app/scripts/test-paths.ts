/**
 * Unit tests for SQL Path (src/content/paths/ and src/features/paths/).
 *
 *   npm run test:paths
 *
 * Covers the catalogue (eight paths, unique ids, every linked lesson exists),
 * independent per-path progress, checking stored data, and that planned
 * chapters never count towards progress.
 */

import assert from 'node:assert/strict'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadAllContent } from '../plugins/content/index.ts'
import { CAREER_PATHS, PROBLEMS_PER_PATH, isChapterAvailable } from '../src/content/paths/catalog.ts'
import {
  emptyPathProgress,
  parsePathProgress,
  selectPath,
  updatePathRecord,
  type PathProgressData,
} from '../src/features/paths/pathModel.ts'
import { chapterStatus, nextStep, pathChapterCount, stageChapterCount } from '../src/features/paths/pathSummary.ts'
import { emptyProgress, lessonKey, type ProgressData } from '../src/features/progress/progressModel.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const contentDir = path.join(root, 'src/content')
const content = loadAllContent({
  dir: path.join(contentDir, 'modules'),
  datasetsDir: path.join(contentDir, 'datasets'),
  challengesDir: path.join(contentDir, 'challenges'),
  quizzesDir: path.join(contentDir, 'quizzes'),
})

const day = (date: number, hour = 10) => new Date(2026, 10, date, hour)

function withLessons(...keys: [string, string][]): ProgressData {
  const progress = emptyProgress()
  for (const [moduleId, lessonId] of keys) progress.lessons[lessonKey(moduleId, lessonId)] = { completedAt: day(1).toISOString() }
  return progress
}

// --- Catalogue -------------------------------------------------------------------

test('there are exactly eight career paths with unique ids', () => {
  assert.equal(CAREER_PATHS.length, 8)
  assert.equal(new Set(CAREER_PATHS.map((p) => p.id)).size, 8)
  assert.deepEqual(
    CAREER_PATHS.map((p) => p.id),
    ['data-analyst', 'data-engineer', 'bi-analyst', 'database-administrator', 'database-developer', 'backend-developer', 'data-scientist', 'cybersecurity-analyst'],
  )
})

test('every path has stages, chapters, outcomes and three projects, with unique ids inside the path', () => {
  for (const career of CAREER_PATHS) {
    assert.ok(career.stages.length >= 3, `${career.id} has at least 3 stages`)
    assert.ok(career.outcomes.length >= 3, `${career.id} has outcomes`)
    assert.equal(career.projects.length, 3, `${career.id} has 3 projects`)
    const stageIds = career.stages.map((s) => s.id)
    assert.equal(new Set(stageIds).size, stageIds.length, `${career.id} stage ids are unique`)
    const chapterIds = career.stages.flatMap((s) => s.chapters.map((c) => c.id))
    assert.equal(new Set(chapterIds).size, chapterIds.length, `${career.id} chapter ids are unique`)
    assert.equal(new Set(career.projects.map((p) => p.id)).size, 3, `${career.id} project ids are unique`)
    for (const stage of career.stages) assert.ok(stage.chapters.length > 0, `${career.id}/${stage.id} has chapters`)
  }
  assert.equal(PROBLEMS_PER_PATH, 365)
})

test('every lesson a chapter links to exists in Learn SQL', () => {
  assert.deepEqual(content.errors, [])
  const lessons = new Set(content.modules.flatMap((m) => m.lessons.map((l) => `${m.id}/${l.id}`)))
  for (const career of CAREER_PATHS) {
    for (const stage of career.stages) {
      for (const chapter of stage.chapters) {
        for (const ref of chapter.lessons) {
          assert.ok(lessons.has(`${ref.moduleId}/${ref.lessonId}`), `${career.id}/${chapter.id} links to ${ref.moduleId}/${ref.lessonId}`)
        }
      }
    }
  }
})

// --- Independent progress per path ---------------------------------------------------

test('choosing a path creates its record; switching never changes another path', () => {
  let data = emptyPathProgress()
  data = selectPath(data, 'data-analyst', day(1))
  data = updatePathRecord(data, 'data-analyst', (r) => ({
    ...r,
    chapters: { 'querying-a-table': { completedAt: day(2).toISOString() } },
    problems: { 'day-1': { solvedAt: day(2).toISOString(), attempts: 2 } },
    badges: { 'first-week': { earnedAt: day(3).toISOString() } },
  }))
  const analyst = data.paths['data-analyst']

  data = selectPath(data, 'cybersecurity-analyst', day(4))
  assert.equal(data.activePathId, 'cybersecurity-analyst')
  assert.deepEqual(data.paths['data-analyst'], analyst, 'switching away leaves the old path untouched')
  assert.deepEqual(data.paths['cybersecurity-analyst'].chapters, {})

  data = selectPath(data, 'data-analyst', day(5))
  assert.equal(data.activePathId, 'data-analyst')
  assert.deepEqual(data.paths['data-analyst'].chapters, analyst.chapters, 'switching back keeps chapters')
  assert.deepEqual(data.paths['data-analyst'].problems, analyst.problems, 'switching back keeps problems')
  assert.deepEqual(data.paths['data-analyst'].badges, analyst.badges, 'switching back keeps badges')
  assert.equal(data.paths['data-analyst'].startedAt, analyst.startedAt, 'the start date is kept')
  assert.equal(data.paths['data-analyst'].lastSelectedAt, day(5).toISOString())
  assert.ok(data.paths['cybersecurity-analyst'], 'the other path keeps its record')
})

test('updating one path only changes that path, and does nothing for a path never chosen', () => {
  let data = selectPath(selectPath(emptyPathProgress(), 'data-analyst', day(1)), 'data-engineer', day(1))
  const engineer = data.paths['data-engineer']
  data = updatePathRecord(data, 'data-analyst', (r) => ({ ...r, projects: { 'sales-performance-review': { startedAt: day(2).toISOString(), completedAt: null } } }))
  assert.deepEqual(data.paths['data-engineer'], engineer)
  assert.equal(updatePathRecord(data, 'bi-analyst', (r) => r), data)
})

test('an invalid path id is refused', () => {
  const data = emptyPathProgress()
  assert.equal(selectPath(data, '__proto__', day(1)), data)
  assert.equal(selectPath(data, '../x', day(1)), data)
})

// --- Checking stored data -------------------------------------------------------------

test('saved path progress survives a save and load unchanged', () => {
  let data: PathProgressData = selectPath(emptyPathProgress(), 'data-analyst', day(1))
  data = updatePathRecord(data, 'data-analyst', (r) => ({
    ...r,
    chapters: { 'querying-a-table': { completedAt: day(2).toISOString() } },
    quizzes: { 'querying-a-table': { bestScore: 4, lastScore: 3, total: 5, attempts: 2, lastTakenAt: day(2).toISOString() } },
    problems: { 'day-1': { solvedAt: null, attempts: 1 } },
    projects: { 'sales-performance-review': { startedAt: day(2).toISOString(), completedAt: null } },
    badges: { 'first-chapter': { earnedAt: day(2).toISOString() } },
  }))
  assert.deepEqual(parsePathProgress(JSON.parse(JSON.stringify(data))), data)
})

test('damaged entries are dropped one by one, and the rest is kept', () => {
  const stored = {
    version: 1,
    activePathId: 'data-analyst',
    paths: {
      'data-analyst': {
        startedAt: day(1).toISOString(),
        lastSelectedAt: 'not a date',
        chapters: { good: { completedAt: day(2).toISOString() }, bad: { completedAt: 5 }, __proto__: { completedAt: day(2).toISOString() } },
        quizzes: { over: { bestScore: 9, lastScore: 1, total: 5, attempts: 1, lastTakenAt: day(2).toISOString() } },
        problems: { p1: { solvedAt: day(2).toISOString(), attempts: -1 }, p2: { solvedAt: null, attempts: 3 } },
        projects: 'nope',
        badges: [1, 2],
      },
      'bad-record': { startedAt: 'never' },
      'from-a-newer-version': { startedAt: day(1).toISOString() },
    },
  }
  const parsed = parsePathProgress(stored)
  assert.ok(parsed)
  assert.equal(parsed.activePathId, 'data-analyst')
  const record = parsed.paths['data-analyst']
  assert.equal(record.lastSelectedAt, record.startedAt, 'a bad lastSelectedAt falls back to startedAt')
  assert.deepEqual(Object.keys(record.chapters), ['good'])
  assert.deepEqual(record.quizzes, {})
  assert.deepEqual(record.problems, { p2: { solvedAt: null, attempts: 3 } })
  assert.deepEqual(record.projects, {})
  assert.deepEqual(record.badges, {})
  assert.equal(parsed.paths['bad-record'], undefined)
  assert.ok(parsed.paths['from-a-newer-version'], 'records for unknown paths are kept')
})

test('anything that is not path progress of this version is refused', () => {
  assert.equal(parsePathProgress(null), null)
  assert.equal(parsePathProgress('paths'), null)
  assert.equal(parsePathProgress([]), null)
  assert.equal(parsePathProgress({ version: 2, paths: {} }), null)
  assert.deepEqual(parsePathProgress({ version: 1 }), emptyPathProgress())
  assert.equal(parsePathProgress({ version: 1, activePathId: 'data-analyst', paths: {} })?.activePathId, null, 'an active path without a record is dropped')
})

// --- Planned chapters never count -----------------------------------------------------------

test('planned chapters are labelled planned and are not part of any total', () => {
  const analyst = CAREER_PATHS[0]
  const allChapters = analyst.stages.flatMap((s) => s.chapters)
  const ready = allChapters.filter(isChapterAvailable).length
  const count = pathChapterCount(analyst, emptyProgress())
  assert.equal(count.total, ready)
  assert.equal(count.planned, allChapters.length - ready)
  assert.equal(count.done, 0)
  const plannedChapter = allChapters.find((c) => !isChapterAvailable(c))
  assert.ok(plannedChapter)
  assert.deepEqual(chapterStatus(plannedChapter, emptyProgress()), { state: 'planned', lessons: { done: 0, total: 0 } })
  const plannedStage = analyst.stages.find((s) => s.chapters.every((c) => !isChapterAvailable(c)))
  assert.ok(plannedStage)
  assert.deepEqual(stageChapterCount(plannedStage, emptyProgress()), { done: 0, total: 0, planned: plannedStage.chapters.length })
})

test('a ready chapter follows its lessons: not started, in progress, complete', () => {
  const analyst = CAREER_PATHS[0]
  const chapter = analyst.stages[0].chapters[0]
  assert.equal(chapterStatus(chapter, emptyProgress()).state, 'not-started')
  const some = withLessons(['sql-fundamentals', 'what-is-sql'])
  assert.deepEqual(chapterStatus(chapter, some), { state: 'in-progress', lessons: { done: 1, total: 5 } })
  const all = withLessons(...chapter.lessons.map((ref): [string, string] => [ref.moduleId, ref.lessonId]))
  assert.equal(chapterStatus(chapter, all).state, 'complete')
  assert.deepEqual(pathChapterCount(analyst, all), { done: 1, total: 2, planned: pathChapterCount(analyst, all).planned })
})

test('the next step is the first unfinished lesson of the first unfinished ready chapter', () => {
  const analyst = CAREER_PATHS[0]
  assert.deepEqual(nextStep(analyst, emptyProgress())?.lesson, { moduleId: 'sql-fundamentals', lessonId: 'what-is-sql' })
  const firstDone = withLessons(...analyst.stages[0].chapters[0].lessons.map((ref): [string, string] => [ref.moduleId, ref.lessonId]))
  assert.equal(nextStep(analyst, firstDone)?.chapter.id, 'summarising-data')
  const everything = withLessons(
    ...analyst.stages.flatMap((s) => s.chapters.flatMap((c) => c.lessons.map((ref): [string, string] => [ref.moduleId, ref.lessonId]))),
  )
  assert.equal(nextStep(analyst, everything), null, 'planned chapters are never offered as a next step')
})
