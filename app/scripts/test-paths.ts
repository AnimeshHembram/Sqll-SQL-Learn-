/**
 * Unit tests for SQL Path (src/content/paths/ and src/features/paths/).
 *
 *   npm run test:paths
 *
 * Covers the catalogue (eight paths, unique ids, every linked lesson exists),
 * independent per-path progress, checking stored data, and that planned
 * chapters never count towards progress. Daily problems: written days run from
 * Day 1 without gaps, attempts, help, streaks and milestones. Settings: the
 * progress file carries SQL Path progress, and older files still import.
 * Stage 3A: each problem shows its expected output shape and no values.
 * Stage 3B: solutions are grouped for on-demand loading; Days 91-120 and 121-150 are complete.
 * Stage 3B batch 3: problem text loads 30 days at a time; Days 151-180 are complete.
 * Stage 4 workstream 1: Days 181-210 are complete.
 */

import assert from 'node:assert/strict'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadAllContent } from '../plugins/content/index.ts'
import { PROBLEM_TEXT_FIELDS, problemTextGroupId, problemTextGroups, splitProblem } from '../plugins/content/problemText.ts'
import { DAYS_PER_CHUNK, problemGroupId, solutionGroups } from '../plugins/content/solutionGroups.ts'
import {
  buildProgressFile,
  describePathProgress,
  isPathProgressEmpty,
  parseProgressFileText,
} from '../src/features/progress/progressFile.ts'
import { CAREER_PATHS, PROBLEMS_PER_PATH, isChapterAvailable, type PathChapter } from '../src/content/paths/catalog.ts'
import {
  emptyPathProgress,
  parsePathProgress,
  selectPath,
  updatePathRecord,
  type PathProgressData,
} from '../src/features/paths/pathModel.ts'
import {
  chapterRequirements,
  chapterStatus,
  nextStep,
  pathChapterCount,
  quizPassMark,
  stageChapterCount,
  type PathContext,
} from '../src/features/paths/pathSummary.ts'
import {
  recordBadges,
  recordChapterComplete,
  recordChapterQuiz,
  recordExerciseAttempt,
  recordExerciseHelp,
  recordProblemAttempt,
  recordProblemHelp,
} from '../src/features/paths/pathModel.ts'
import {
  PROBLEM_DAYS,
  PROBLEM_MILESTONES,
  nextProblemDay,
  problemState,
  problemStreak,
  reachedMilestones,
  solvedCount,
} from '../src/features/paths/problemSummary.ts'
import { emptyProgress, lessonKey, type ProgressData } from '../src/features/progress/progressModel.ts'
import { MAX_DRAFTS, MAX_DRAFT_LENGTH, parseDrafts, withDraft } from '../src/features/paths/pathDraftsModel.ts'

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
    problems: { 'day-1': { solvedAt: day(2).toISOString(), attempts: 2, hintsUsed: 0, revealedSolution: false } },
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
    problems: { 'day-1': { solvedAt: null, attempts: 1, hintsUsed: 1, revealedSolution: false } },
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
  assert.deepEqual(record.problems, { p2: { solvedAt: null, attempts: 3, hintsUsed: 0, revealedSolution: false } }, 'older entries without hint fields still load')
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
  assert.deepEqual(chapterStatus(plannedChapter, emptyProgress()), { state: 'planned', steps: { done: 0, total: 0 }, kind: 'planned' })
  const plannedStage = analyst.stages.find((s) => s.chapters.every((c) => !isChapterAvailable(c)))
  assert.ok(plannedStage)
  assert.deepEqual(stageChapterCount(plannedStage, emptyProgress()), { done: 0, total: 0, planned: plannedStage.chapters.length })
})

test('a ready chapter follows its lessons: not started, in progress, complete', () => {
  const analyst = CAREER_PATHS[0]
  const chapter = analyst.stages[0].chapters[0]
  assert.equal(chapterStatus(chapter, emptyProgress()).state, 'not-started')
  const some = withLessons(['sql-fundamentals', 'what-is-sql'])
  assert.deepEqual(chapterStatus(chapter, some), { state: 'in-progress', steps: { done: 1, total: 5 }, kind: 'linked' })
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

// --- Written chapters (Stage 2) ------------------------------------------------------------

test('every written chapter belongs to its path in the catalogue and has exercises and a quiz', () => {
  assert.ok(content.pathModules.length > 0, 'there are written chapters')
  for (const module of content.pathModules) {
    const career = CAREER_PATHS.find((p) => p.id === module.id)
    assert.ok(career, `${module.id} is a career path`)
    const catalogueIds = career.stages.flatMap((s) => s.chapters.map((c) => c.id))
    for (const lesson of module.lessons) {
      assert.ok(catalogueIds.includes(lesson.id), `${module.id}/${lesson.id} is on the roadmap`)
      const entry: PathChapter | undefined = career.stages.flatMap((s) => s.chapters).find((c) => c.id === lesson.id)
      assert.equal(entry?.lessons.length, 0, `${lesson.id} is not also linked to Learn SQL lessons`)
      const exercises = content.pathExercises.filter((e) => e.pathId === module.id && e.chapterId === lesson.id)
      assert.ok(exercises.some((e) => e.kind === 'guided') && exercises.some((e) => e.kind === 'independent'), `${lesson.id} has both kinds of exercise`)
      assert.ok(content.pathQuizzes.some((q) => q.pathId === module.id && q.id === lesson.id), `${lesson.id} has a quiz`)
      assert.ok(lesson.examples.length >= 3, `${lesson.id} has runnable examples`)
    }
  }
  const exerciseIds = content.pathExercises.map((e) => e.id)
  assert.equal(new Set(exerciseIds).size, exerciseIds.length, 'exercise ids are unique')
  for (const id of exerciseIds) assert.ok(!content.challenges.some((c) => c.id === id), `${id} does not clash with a challenge`)
  for (const id of exerciseIds) assert.ok(content.solutions[id], `${id} has a solution for the worker`)
})

/** A context like the one the pages build: chapter "x" is written, with exercises e1 and e2 and a 5-question quiz. */
function writtenContext(record?: PathProgressData['paths'][string]): PathContext {
  return {
    record,
    isWritten: (id) => id === 'conditional-logic',
    exerciseIds: (id) => (id === 'conditional-logic' ? ['e1', 'e2'] : []),
    quizSize: (id) => (id === 'conditional-logic' ? 5 : 0),
  }
}

test('a written chapter is complete only once marked, and can be marked only when exercises and quiz are done', () => {
  const analyst = CAREER_PATHS[0]
  const chapter = analyst.stages[1].chapters[0]
  assert.equal(chapter.id, 'conditional-logic')
  let record = selectPath(emptyPathProgress(), 'data-analyst', day(1)).paths['data-analyst']

  assert.deepEqual(chapterStatus(chapter, emptyProgress(), writtenContext(record)), { state: 'not-started', steps: { done: 0, total: 3 }, kind: 'written' })
  record = recordExerciseAttempt(record, 'e1', false, day(2))
  assert.equal(chapterStatus(chapter, emptyProgress(), writtenContext(record)).state, 'in-progress', 'a wrong attempt starts the chapter')
  record = recordExerciseAttempt(record, 'e1', true, day(2))
  record = recordExerciseAttempt(record, 'e2', true, day(2))
  assert.equal(chapterRequirements('conditional-logic', writtenContext(record)).met, false, 'the quiz is still missing')

  assert.equal(quizPassMark(5), 4)
  record = recordChapterQuiz(record, 'conditional-logic', 3, 5, day(3))
  assert.equal(chapterRequirements('conditional-logic', writtenContext(record)).quiz.passed, false, '3 of 5 does not pass')
  record = recordChapterQuiz(record, 'conditional-logic', 4, 5, day(3))
  record = recordChapterQuiz(record, 'conditional-logic', 2, 5, day(4))
  assert.equal(record.quizzes['conditional-logic'].bestScore, 4, 'a later lower score keeps the best score')
  assert.equal(chapterRequirements('conditional-logic', writtenContext(record)).met, true)
  assert.equal(chapterStatus(chapter, emptyProgress(), writtenContext(record)).state, 'in-progress', 'requirements met is not the same as complete')

  record = recordChapterComplete(record, 'conditional-logic', day(5))
  const completedAt = record.chapters['conditional-logic'].completedAt
  assert.equal(chapterStatus(chapter, emptyProgress(), writtenContext(record)).state, 'complete')
  assert.equal(recordChapterComplete(record, 'conditional-logic', day(9)).chapters['conditional-logic'].completedAt, completedAt, 'the first completion date is kept')

  // Written chapters count; planned ones still do not.
  const count = pathChapterCount(analyst, emptyProgress(), writtenContext(record))
  assert.equal(count.total, 3, 'two linked chapters and one written chapter are ready')
  assert.equal(count.done, 1)
})

test('exercise help is recorded without counting as solved, and solving keeps the first date', () => {
  let record = selectPath(emptyPathProgress(), 'data-analyst', day(1)).paths['data-analyst']
  record = recordExerciseHelp(record, 'e1', { hintsUsed: 2 })
  record = recordExerciseHelp(record, 'e1', { hintsUsed: 1, revealedSolution: true })
  assert.deepEqual(record.exercises.e1, { solvedAt: null, attempts: 0, hintsUsed: 2, revealedSolution: true })
  record = recordExerciseAttempt(record, 'e1', true, day(2))
  record = recordExerciseAttempt(record, 'e1', true, day(3))
  assert.equal(record.exercises.e1.solvedAt, day(2).toISOString())
  assert.equal(record.exercises.e1.attempts, 2)
})

test('chapter progress in one path never changes another path', () => {
  let data = selectPath(selectPath(emptyPathProgress(), 'cybersecurity-analyst', day(1)), 'data-analyst', day(1))
  const cyber = data.paths['cybersecurity-analyst']
  data = updatePathRecord(data, 'data-analyst', (r) => recordChapterComplete(recordExerciseAttempt(r, 'e1', true, day(2)), 'conditional-logic', day(2)))
  assert.deepEqual(data.paths['cybersecurity-analyst'], cyber)
  assert.ok(data.paths['data-analyst'].chapters['conditional-logic'])
})

test('saved progress from Stage 1, without exercises, still loads', () => {
  const stage1 = { version: 1, activePathId: 'data-analyst', paths: { 'data-analyst': { startedAt: day(1).toISOString(), lastSelectedAt: day(1).toISOString(), chapters: {}, quizzes: {}, problems: {}, projects: {}, badges: {} } } }
  const parsed = parsePathProgress(stage1)
  assert.ok(parsed)
  assert.deepEqual(parsed.paths['data-analyst'].exercises, {})
  assert.equal(parsed.activePathId, 'data-analyst')
})

test('the next step offers a written chapter page after the linked chapters are done', () => {
  const analyst = CAREER_PATHS[0]
  const context: PathContext = { ...writtenContext(), isWritten: (id) => ['combining-tables', 'conditional-logic'].includes(id) }
  const linkedDone = withLessons(...analyst.stages[0].chapters.flatMap((c) => c.lessons.map((ref): [string, string] => [ref.moduleId, ref.lessonId])))
  const next = nextStep(analyst, linkedDone, context)
  assert.equal(next?.chapter.id, 'combining-tables')
  assert.equal(next?.lesson, undefined, 'a written chapter is opened on its own page')
})

// --- Daily problems ----------------------------------------------------------------

test('written daily problems run from Day 1 without gaps, each with a unique id, hints and a solution', () => {
  const problems = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst')
  assert.ok(problems.length >= 30, 'the first batch has at least 30 days')
  assert.ok(problems.length <= PROBLEM_DAYS)
  problems.forEach((problem, index) => {
    assert.equal(problem.day, index + 1)
    assert.equal(problem.id, `da-day-${String(index + 1).padStart(3, '0')}`)
    assert.ok(problem.hints.length >= 2, `${problem.id} has hints`)
    assert.ok(content.solutions[problem.id]?.sql, `${problem.id} has a solution`)
    assert.ok(problem.objectives.length > 0, `${problem.id} has objectives`)
  })
  const ids = content.pathProblems.map((problem) => problem.id)
  assert.equal(new Set(ids).size, ids.length)
  const titles = problems.map((problem) => problem.title.toLowerCase())
  assert.equal(new Set(titles).size, titles.length, 'no two days share a title')
  for (const other of CAREER_PATHS.slice(1)) {
    assert.equal(content.pathProblems.filter((problem) => problem.pathId === other.id).length, 0, `${other.id} has no problems yet`)
  }
})

test('problem difficulty rises: the first week is beginner, nothing advanced before Day 15, nothing beginner after Day 20', () => {
  const problems = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst')
  assert.ok(problems.slice(0, 7).every((problem) => problem.difficulty === 'beginner'))
  assert.ok(problems.slice(0, 14).every((problem) => problem.difficulty !== 'advanced'))
  assert.ok(problems.slice(20).every((problem) => problem.difficulty !== 'beginner'))
})

test('problem attempts, hints and revealed solutions are saved; solving keeps the first date', () => {
  let record = selectPath(emptyPathProgress(), 'data-analyst', day(1)).paths['data-analyst']
  assert.equal(problemState('p1', record), 'open')
  assert.equal(problemState(undefined, record), 'unwritten')
  record = recordProblemAttempt(record, 'p1', false, day(2))
  assert.equal(problemState('p1', record), 'attempted')
  record = recordProblemHelp(record, 'p1', { hintsUsed: 2 })
  record = recordProblemHelp(record, 'p1', { hintsUsed: 1, revealedSolution: true })
  record = recordProblemAttempt(record, 'p1', true, day(3))
  record = recordProblemAttempt(record, 'p1', true, day(4))
  assert.deepEqual(record.problems.p1, { solvedAt: day(3).toISOString(), attempts: 3, hintsUsed: 2, revealedSolution: true })
  assert.equal(problemState('p1', record), 'solved')
})

test('missing days costs nothing: any day can be solved in any order and the next day is the first unsolved', () => {
  const ids = ['d1', 'd2', 'd3', 'd4']
  let record = selectPath(emptyPathProgress(), 'data-analyst', day(1)).paths['data-analyst']
  assert.equal(nextProblemDay(ids, record), 1)
  record = recordProblemAttempt(record, 'd3', true, day(2))
  record = recordProblemAttempt(record, 'd1', true, day(9))
  assert.equal(solvedCount(ids, record), 2)
  assert.equal(nextProblemDay(ids, record), 2)
  for (const id of ids) record = recordProblemAttempt(record, id, true, day(10))
  assert.equal(nextProblemDay(ids, record), null)
})

test('the problem streak counts calendar days with a solved problem and survives until the end of the next day', () => {
  const ids = ['d1', 'd2', 'd3', 'd4']
  let record = selectPath(emptyPathProgress(), 'data-analyst', day(1)).paths['data-analyst']
  record = recordProblemAttempt(record, 'd1', true, day(2, 9))
  record = recordProblemAttempt(record, 'd2', true, day(2, 20))
  record = recordProblemAttempt(record, 'd3', true, day(3))
  record = recordProblemAttempt(record, 'd4', false, day(4))
  assert.deepEqual(
    { ...problemStreak(ids, record, day(4)) },
    { current: 2, longest: 2, activeToday: false, activeDays: 2 },
    'a failed attempt does not count, and yesterday still keeps the streak',
  )
  assert.equal(problemStreak(ids, record, day(6)).current, 0, 'a gap ends the current streak')
  assert.equal(problemStreak(ids, record, day(6)).longest, 2, 'the longest streak is kept')
  assert.equal(solvedCount(ids, record), 3, 'a broken streak takes nothing away')
})

test('milestones are reached by problems solved, and earned badges are never removed or re-dated', () => {
  assert.deepEqual(reachedMilestones(0), [])
  assert.deepEqual(reachedMilestones(7).map((m) => m.id), ['problems-1', 'problems-7'])
  assert.equal(PROBLEM_MILESTONES.at(-1)?.solved, PROBLEM_DAYS)
  let record = selectPath(emptyPathProgress(), 'data-analyst', day(1)).paths['data-analyst']
  record = recordBadges(record, ['problems-1'], day(2))
  const same = recordBadges(record, ['problems-1'], day(5))
  assert.equal(same, record, 'nothing changes when every badge is already earned')
  record = recordBadges(record, [], day(6))
  assert.equal(record.badges['problems-1'].earnedAt, day(2).toISOString())
  record = recordBadges(record, ['problems-1', 'problems-7'], day(7))
  assert.equal(record.badges['problems-1'].earnedAt, day(2).toISOString())
  assert.equal(record.badges['problems-7'].earnedAt, day(7).toISOString())
})

test('daily problem progress in one path never changes another path, and survives a save and load', () => {
  let data = selectPath(selectPath(emptyPathProgress(), 'data-engineer', day(1)), 'data-analyst', day(1))
  const engineer = data.paths['data-engineer']
  data = updatePathRecord(data, 'data-analyst', (r) => recordBadges(recordProblemAttempt(r, 'da-day-001', true, day(2)), ['problems-1'], day(2)))
  assert.deepEqual(data.paths['data-engineer'], engineer)
  const loaded = parsePathProgress(JSON.parse(JSON.stringify(data)))
  assert.deepEqual(loaded, data)
})

test('problem entries saved before hints were tracked still load, with no help recorded', () => {
  const stage2 = {
    version: 1,
    activePathId: 'data-analyst',
    paths: {
      'data-analyst': {
        startedAt: day(1).toISOString(),
        lastSelectedAt: day(1).toISOString(),
        chapters: {},
        exercises: {},
        quizzes: {},
        problems: { 'da-day-001': { solvedAt: day(2).toISOString(), attempts: 1 } },
        projects: {},
        badges: {},
      },
    },
  }
  const parsed = parsePathProgress(stage2)
  assert.deepEqual(parsed?.paths['data-analyst'].problems['da-day-001'], {
    solvedAt: day(2).toISOString(),
    attempts: 1,
    hintsUsed: 0,
    revealedSolution: false,
  })
})

test('a daily problem whose data is written in the starter query loads with an empty table list', () => {
  const inline = content.pathProblems.filter((problem) => problem.tables.length === 0)
  assert.ok(inline.length > 0, 'at least one problem uses only data from its starter query')
  for (const problem of inline) assert.match(problem.starterSql, /^WITH\b/i, `${problem.id} defines its data in the starter query`)
  assert.ok(content.challenges.every((challenge) => challenge.tables.length > 0), 'every challenge still names its tables')
})

// --- Stage 2 complete: the Data Analyst curriculum -------------------------------------

test('every Data Analyst chapter beyond the Learn SQL foundations is written, in catalogue order', () => {
  const analyst = CAREER_PATHS.find((p) => p.id === 'data-analyst')!
  const catalogue = analyst.stages.flatMap((s) => s.chapters)
  const ownChapters = catalogue.filter((c) => c.lessons.length === 0)
  const module = content.pathModules.find((m) => m.id === 'data-analyst')!
  assert.equal(ownChapters.length, 13, 'the catalogue lists 13 Data Analyst chapters of its own')
  assert.deepEqual(module.lessons.map((l) => l.id), ownChapters.map((c) => c.id), 'all 13 are written, in roadmap order')
  module.lessons.forEach((lesson, index) => assert.equal(lesson.order, index + 1, `${lesson.id} is chapter ${index + 1}`))
  const levels = module.lessons.map((l) => ['beginner', 'intermediate', 'advanced'].indexOf(l.level))
  assert.ok(levels.every((level, i) => i === 0 || level >= levels[i - 1]), 'chapter levels never step back down')
})

test('each Data Analyst chapter has 2 guided and 2 independent exercises and a 5-question quiz', () => {
  const module = content.pathModules.find((m) => m.id === 'data-analyst')!
  for (const lesson of module.lessons) {
    const exercises = content.pathExercises.filter((e) => e.pathId === 'data-analyst' && e.chapterId === lesson.id)
    assert.equal(exercises.filter((e) => e.kind === 'guided').length, 2, `${lesson.id}: guided exercises`)
    assert.equal(exercises.filter((e) => e.kind === 'independent').length, 2, `${lesson.id}: independent exercises`)
    const quiz = content.pathQuizzes.find((q) => q.pathId === 'data-analyst' && q.id === lesson.id)
    assert.equal(quiz?.questions.length, 5, `${lesson.id}: quiz questions`)
    assert.ok(lesson.objectives.length >= 3, `${lesson.id}: learning objectives`)
  }
})

test('no chapter exercise repeats a challenge, a daily problem or another exercise', () => {
  const titles = (items: readonly { title: string }[]) => items.map((i) => i.title.toLowerCase())
  const exerciseTitles = titles(content.pathExercises)
  assert.equal(new Set(exerciseTitles).size, exerciseTitles.length, 'exercise titles are unique')
  const others = new Set([...titles(content.challenges), ...titles(content.pathProblems)])
  for (const title of exerciseTitles) assert.ok(!others.has(title), `"${title}" is not also a challenge or daily problem`)
  assert.ok(!content.pathExercises.some((e) => e.id === 'da-above-average-books'), 'the duplicate exercise was replaced')
})

test('a chapter completed before its exercises changed stays complete, and old exercise progress is kept', () => {
  // A learner who finished "Subqueries and CTEs" while it still had the replaced exercise.
  const stored = {
    version: 1,
    activePathId: 'data-analyst',
    paths: {
      'data-analyst': {
        startedAt: day(1).toISOString(),
        lastSelectedAt: day(1).toISOString(),
        chapters: { 'subqueries-and-ctes': { completedAt: day(3).toISOString() } },
        exercises: { 'da-above-average-books': { solvedAt: day(2).toISOString(), attempts: 1, hintsUsed: 0, revealedSolution: false } },
        quizzes: {},
        problems: {},
        projects: {},
        badges: {},
      },
    },
  }
  const record = parsePathProgress(stored)!.paths['data-analyst']
  assert.ok(record.exercises['da-above-average-books'], 'saved exercise progress is not discarded')
  const analyst = CAREER_PATHS.find((p) => p.id === 'data-analyst')!
  const chapter = analyst.stages.flatMap((s) => s.chapters).find((c) => c.id === 'subqueries-and-ctes')!
  const context: PathContext = {
    record,
    isWritten: () => true,
    exerciseIds: (id) => content.pathExercises.filter((e) => e.chapterId === id).map((e) => e.id),
    quizSize: () => 5,
  }
  assert.equal(chapterStatus(chapter, emptyProgress(), context).state, 'complete')
})

test('saved exercise drafts are validated, removed when back to the starter query, and capped', () => {
  assert.deepEqual(parseDrafts(null), {})
  assert.deepEqual(parseDrafts({ a: { sql: 'SELECT 1', savedAt: 5 }, b: { sql: 3, savedAt: 5 }, c: 'x', d: { sql: 'x'.repeat(MAX_DRAFT_LENGTH + 1), savedAt: 1 } }), {
    a: { sql: 'SELECT 1', savedAt: 5 },
  })
  let drafts = withDraft({}, 'e1', 'SELECT 1', 10)
  assert.deepEqual(drafts, { e1: { sql: 'SELECT 1', savedAt: 10 } })
  drafts = withDraft(drafts, 'e1', null, 11)
  assert.deepEqual(drafts, {}, 'resetting to the starter query forgets the draft')
  for (let i = 0; i < MAX_DRAFTS + 5; i++) drafts = withDraft(drafts, `x${i}`, 'SELECT 1', i)
  assert.equal(Object.keys(drafts).length, MAX_DRAFTS)
  assert.ok(!('x0' in drafts) && 'x204' in drafts, 'the oldest drafts are dropped first')
})

// --- Settings: the progress file holds Learn SQL and SQL Path progress (audit issue H1) ---------

test('an exported progress file holds Learn SQL and SQL Path progress and reads back exactly', () => {
  const now = new Date('2026-11-10T09:00:00Z')
  let paths = selectPath(emptyPathProgress(), 'data-analyst', now)
  paths = updatePathRecord(paths, 'data-analyst', (record) => recordExerciseAttempt(record, 'da-average-selling-price', true, now))
  paths = updatePathRecord(paths, 'data-analyst', (record) => recordProblemAttempt(record, 'da-day-001', true, now))
  const learn = emptyProgress()
  const text = buildProgressFile(learn, paths, now)
  const file = JSON.parse(text)
  assert.equal(file.app, 'sql-learner')
  assert.deepEqual(file.paths, paths, 'SQL Path progress is in the file')
  const read = parseProgressFileText(text)!
  assert.deepEqual(read.progress, learn)
  assert.deepEqual(read.paths, paths)
  assert.equal(describePathProgress(paths), '1 career path: 0 completed chapters, 1 solved exercise and 1 solved daily problem')
  assert.equal(describePathProgress(emptyPathProgress()), 'no SQL Path progress')
  assert.ok(isPathProgressEmpty(emptyPathProgress()) && !isPathProgressEmpty(paths))
})

test('files exported before SQL Path still import, and say nothing about SQL Path progress', () => {
  const learn = emptyProgress()
  const old = JSON.stringify({ app: 'sql-learner', exportedAt: '2026-11-01T00:00:00Z', progress: learn })
  assert.deepEqual(parseProgressFileText(old), { progress: learn, paths: null })
  assert.deepEqual(parseProgressFileText(JSON.stringify(learn)), { progress: learn, paths: null }, 'the bare stored object is accepted as before')
})

test('a progress file with damaged SQL Path progress, or that is not progress, is refused as a whole', () => {
  const learn = emptyProgress()
  assert.equal(parseProgressFileText(JSON.stringify({ app: 'sql-learner', progress: learn, paths: { version: 99 } })), null)
  assert.equal(parseProgressFileText(JSON.stringify({ app: 'sql-learner', progress: learn, paths: null })), null)
  assert.equal(parseProgressFileText('not json'), null)
  assert.equal(parseProgressFileText('[]'), null)
  assert.equal(parseProgressFileText(JSON.stringify({ progress: { version: 2 } })), null)
})

// --- Stage 3A: what a daily problem shows before an attempt ---------------------------------------

test('every daily problem shows its expected output shape: the solution\'s columns and row count, never values', () => {
  assert.ok(content.pathProblems.length >= 90)
  for (const problem of content.pathProblems) {
    const solution = content.solutions[problem.id]
    assert.deepEqual(problem.expected, { columns: solution.expected.columns, rowCount: solution.expected.rows.length }, problem.id)
    assert.deepEqual(Object.keys(problem.expected).sort(), ['columns', 'rowCount'], `${problem.id}: only the shape is public`)
    assert.ok(!('sql' in problem) && !('explanationHtml' in problem), `${problem.id}: the solution stays out of the public problem`)
    assert.ok(problem.tables.length > 0 || /WITH|VALUES/i.test(problem.starterSql), `${problem.id}: lists its tables or carries its data in the starter query`)
  }
})

test('the written Data Analyst problems keep their ids and days, so saved progress still matches', () => {
  const analyst = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst')
  assert.ok(analyst.length >= 90, 'the first 90 days are never removed')
  analyst.forEach((problem, index) => {
    assert.equal(problem.day, index + 1)
    assert.equal(problem.id, `da-day-${String(index + 1).padStart(3, '0')}`)
  })
  assert.deepEqual([...new Set(content.pathProblems.map((problem) => problem.pathId))], ['data-analyst'], 'no problem is shared with another path')
})

// --- Stage 3B: solutions load in groups, and the Days 91-120 batch ------------------------------

test('every solution belongs to exactly one on-demand group; daily problems are grouped 30 days at a time', () => {
  const groups = solutionGroups(content.challenges.map((challenge) => challenge.id), content.pathExercises, content.pathProblems)
  const seen = new Map<string, string>()
  for (const group of groups) {
    for (const id of group.ids) {
      assert.ok(!seen.has(id), `${id} is in ${seen.get(id)} and ${group.moduleId}`)
      seen.set(id, group.moduleId)
    }
  }
  assert.deepEqual([...seen.keys()].sort(), Object.keys(content.solutions).sort(), 'every solution has a group, and every group id has a solution')
  assert.equal(seen.get(content.challenges[0].id), 'virtual:sql-learner-challenge-solutions')
  assert.equal(problemGroupId('data-analyst', 1), 'virtual:sql-learner-solutions-data-analyst-days-001-030')
  assert.equal(problemGroupId('data-analyst', 30), 'virtual:sql-learner-solutions-data-analyst-days-001-030')
  assert.equal(problemGroupId('data-analyst', 91), 'virtual:sql-learner-solutions-data-analyst-days-091-120')
  assert.equal(problemGroupId('data-analyst', 365), 'virtual:sql-learner-solutions-data-analyst-days-361-390')
  for (const group of groups) {
    if (!group.moduleId.includes('-days-')) continue
    assert.ok(group.ids.length <= DAYS_PER_CHUNK, `${group.moduleId} holds at most one month of problems`)
  }
})

test('Days 91-120 are a complete batch: ids, days, three hints, an explanation with a common mistake and labelled wrong answers', () => {
  const batch = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst' && problem.day >= 91 && problem.day <= 120)
  assert.equal(batch.length, 30)
  const earlierTitles = new Set(
    content.pathProblems.filter((problem) => problem.day < 91).map((problem) => problem.title.toLowerCase()),
  )
  for (const problem of batch) {
    assert.equal(problem.id, `da-day-${String(problem.day).padStart(3, '0')}`)
    assert.equal(problem.difficulty === 'beginner', false, `${problem.id} is not a beginner problem`)
    assert.equal(problem.hints.length, 3, `${problem.id} has three hints`)
    assert.ok(problem.objectives.length > 0, `${problem.id} states what it practises`)
    assert.ok(!earlierTitles.has(problem.title.toLowerCase()), `${problem.id} does not repeat an earlier title`)
    assert.ok(problem.expected.rowCount > 0, `${problem.id} expects at least one row`)
    const solution = content.solutions[problem.id]
    assert.match(solution.explanationHtml, /Common mistake/, `${problem.id} explains a common mistake`)
    assert.ok((content.wrongAnswers[problem.id] ?? []).length > 0, `${problem.id} has at least one labelled wrong answer`)
  }
  const topics = new Set(batch.map((problem) => problem.topic))
  assert.ok(topics.size >= 6, `the batch covers several topics (${[...topics].join(', ')})`)
})

// --- Stage 3B batch 2: Days 121-150 -----------------------------------------------------------------

test('Days 121-150 are a complete batch, loaded as their own solution group', () => {
  const batch = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst' && problem.day >= 121 && problem.day <= 150)
  assert.equal(batch.length, 30)
  const earlier = content.pathProblems.filter((problem) => problem.day < 121)
  const earlierTitles = new Set(earlier.map((problem) => problem.title.toLowerCase()))
  const earlierSolutions = new Set(earlier.map((problem) => content.solutions[problem.id].sql.replace(/\s+/g, ' ').trim()))
  for (const problem of batch) {
    assert.equal(problem.id, `da-day-${String(problem.day).padStart(3, '0')}`)
    assert.notEqual(problem.difficulty, 'beginner', `${problem.id} is not a beginner problem`)
    assert.equal(problem.hints.length, 3, `${problem.id} has three hints`)
    assert.ok(problem.objectives.length > 0, `${problem.id} states what it practises`)
    assert.ok(!earlierTitles.has(problem.title.toLowerCase()), `${problem.id} does not repeat an earlier title`)
    assert.ok(problem.expected.rowCount > 0, `${problem.id} expects at least one row`)
    const solution = content.solutions[problem.id]
    assert.ok(!earlierSolutions.has(solution.sql.replace(/\s+/g, ' ').trim()), `${problem.id} is not a copy of an earlier solution`)
    assert.match(solution.explanationHtml, /Common mistake/, `${problem.id} explains a common mistake`)
    assert.ok((content.wrongAnswers[problem.id] ?? []).length > 0, `${problem.id} has at least one labelled wrong answer`)
  }
  const topics = new Set(batch.map((problem) => problem.topic))
  assert.ok(topics.size >= 6, `the batch covers several topics (${[...topics].join(', ')})`)
  assert.ok(batch.filter((problem) => problem.day >= 146).every((problem) => problem.topic === 'Case studies'), 'the last five days are case studies')

  const groups = solutionGroups(content.challenges.map((challenge) => challenge.id), content.pathExercises, content.pathProblems)
  const group = groups.find((item) => item.moduleId === 'virtual:sql-learner-solutions-data-analyst-days-121-150')
  assert.ok(group, 'Days 121-150 have their own solution chunk')
  assert.deepEqual([...group.ids].sort(), batch.map((problem) => problem.id).sort(), 'the chunk holds exactly Days 121-150')
  const previous = groups.find((item) => item.moduleId === 'virtual:sql-learner-solutions-data-analyst-days-091-120')
  assert.equal(previous?.ids.length, 30, 'the Days 91-120 chunk is unchanged')
})

test('size budgets: app limits stay as recorded; content from Day 91 has its own per-chunk budget', async () => {
  const { readFileSync } = await import('node:fs')
  const sizeBudget = JSON.parse(readFileSync(path.join(root, 'scripts/size-budget.json'), 'utf8'))
  assert.equal(sizeBudget.distTotal.limitBytes, 2648084, 'the dist/ limit is not re-recorded')
  assert.equal(sizeBudget.offlineIndexHtml.limitBytes, 2832001, 'the offline limit is not re-recorded')
  assert.equal(sizeBudget.assets['sql.worker.js'].limitBytes, 209017)
  const contentBudget = JSON.parse(readFileSync(path.join(root, 'scripts/content-budget.json'), 'utf8'))
  assert.equal(contentBudget.firstDay, 91, 'Days 1-90 were in the baseline and stay counted as app bytes')
  assert.equal(contentBudget.chunkLimitBytes, 150000)
})

// --- Stage 3B batch 3: problem text in 30-day groups, and Days 151-180 ----------------------------------

test('problem text: the list keeps what pages need, the text moves to its 30-day group, nothing is lost', () => {
  const problems = content.pathProblems
  for (const problem of problems) {
    const { summary, text } = splitProblem(problem)
    for (const field of PROBLEM_TEXT_FIELDS) {
      assert.ok(!(field in summary), `${problem.id}: ${field} is not in the problem list`)
      assert.ok(field in text, `${problem.id}: ${field} is in the text group`)
    }
    // Everything the list, filters, progress and navigation use stays in the summary.
    for (const field of ['id', 'pathId', 'day', 'title', 'topic', 'difficulty', 'summary', 'tables', 'expected', 'evaluation'] as const) {
      assert.deepEqual(summary[field], problem[field], `${problem.id}: ${field} is in the problem list`)
    }
    assert.deepEqual({ ...summary, ...text }, problem, `${problem.id}: list + text gives back the whole problem`)
    // Reference solutions are never part of either half.
    assert.ok(!JSON.stringify({ summary, text }).includes(content.solutions[problem.id].sql), `${problem.id}: no reference SQL in page content`)
  }
  assert.equal(problemTextGroupId('data-analyst', 1), 'virtual:sql-learner-problem-text-data-analyst-days-001-030')
  assert.equal(problemTextGroupId('data-analyst', 150), 'virtual:sql-learner-problem-text-data-analyst-days-121-150')
  assert.equal(problemTextGroupId('data-analyst', 151), 'virtual:sql-learner-problem-text-data-analyst-days-151-180')
  const groups = problemTextGroups(problems)
  const ids = groups.flatMap((group) => group.ids)
  assert.equal(ids.length, problems.length, 'every problem is in exactly one text group')
  assert.equal(new Set(ids).size, ids.length)
  for (const group of groups) assert.ok(group.ids.length <= DAYS_PER_CHUNK, `${group.moduleId} holds at most ${DAYS_PER_CHUNK} days`)
  // Text groups and solution groups cover the same days, under different module names.
  const solutionIds = solutionGroups([], [], problems).map((group) => group.moduleId.replace('solutions', 'problem-text'))
  assert.deepEqual(groups.map((group) => group.moduleId).sort(), solutionIds.sort())
})

test('Days 151-180 are a complete batch, with their own text and solution groups', () => {
  const batch = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst' && problem.day >= 151 && problem.day <= 180)
  assert.equal(batch.length, 30)
  const all = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst')
  assert.deepEqual(all.map((problem) => problem.day), Array.from({ length: all.length }, (_, i) => i + 1), 'written days run from Day 1 without gaps')
  assert.ok(all.length >= 180)
  const earlier = content.pathProblems.filter((problem) => problem.day < 151)
  const earlierTitles = new Set(earlier.map((problem) => problem.title.toLowerCase()))
  const earlierSolutions = new Set(earlier.map((problem) => content.solutions[problem.id].sql.replace(/\s+/g, ' ').trim()))
  for (const problem of batch) {
    assert.equal(problem.id, `da-day-${problem.day}`)
    assert.notEqual(problem.difficulty, 'beginner', `${problem.id} is not a beginner problem`)
    assert.equal(problem.hints.length, 3, `${problem.id} has three hints`)
    assert.ok(problem.objectives.length > 0, `${problem.id} states what it practises`)
    assert.ok(!earlierTitles.has(problem.title.toLowerCase()), `${problem.id} does not repeat an earlier title`)
    assert.ok(problem.expected.rowCount > 0, `${problem.id} expects at least one row`)
    const solution = content.solutions[problem.id]
    assert.ok(!earlierSolutions.has(solution.sql.replace(/\s+/g, ' ').trim()), `${problem.id} is not a copy of an earlier solution`)
    assert.match(solution.explanationHtml, /Common mistake/, `${problem.id} explains a common mistake`)
    assert.ok((content.wrongAnswers[problem.id] ?? []).length > 0, `${problem.id} has at least one labelled wrong answer`)
  }
  const topics = new Set(batch.map((problem) => problem.topic))
  assert.ok(topics.size >= 6, `the batch covers several topics (${[...topics].join(', ')})`)
  assert.ok(batch.filter((problem) => problem.day >= 176).every((problem) => problem.topic === 'Case studies'), 'the last five days are case studies')
  const groups = solutionGroups(content.challenges.map((challenge) => challenge.id), content.pathExercises, content.pathProblems)
  const group = groups.find((item) => item.moduleId === 'virtual:sql-learner-solutions-data-analyst-days-151-180')
  assert.deepEqual([...(group?.ids ?? [])].sort(), batch.map((problem) => problem.id).sort(), 'the solution chunk holds exactly Days 151-180')
  const textGroup = problemTextGroups(content.pathProblems).find((item) => item.moduleId === 'virtual:sql-learner-problem-text-data-analyst-days-151-180')
  assert.deepEqual([...(textGroup?.ids ?? [])].sort(), batch.map((problem) => problem.id).sort(), 'the text chunk holds exactly Days 151-180')
})

// --- Stage 4, workstream 1: Days 181-210 ------------------------------------------------------------------

test('Days 181-210 are a complete batch, with their own text and solution groups', () => {
  const all = content.pathProblems.filter((problem) => problem.pathId === 'data-analyst')
  const batch = all.filter((problem) => problem.day >= 181 && problem.day <= 210)
  assert.equal(batch.length, 30)
  assert.deepEqual(all.map((problem) => problem.day), Array.from({ length: 210 }, (_, i) => i + 1), 'Days 1-210 run without gaps')
  const earlier = all.filter((problem) => problem.day < 181)
  const earlierTitles = new Set(earlier.map((problem) => problem.title.toLowerCase()))
  const earlierSolutions = new Set(earlier.map((problem) => content.solutions[problem.id].sql.replace(/\s+/g, ' ').trim()))
  for (const problem of batch) {
    assert.equal(problem.id, `da-day-${problem.day}`)
    assert.notEqual(problem.difficulty, 'beginner', `${problem.id} is not a beginner problem`)
    assert.equal(problem.hints.length, 3, `${problem.id} has three hints`)
    assert.ok(problem.objectives.length > 0, `${problem.id} states what it practises`)
    assert.ok(!earlierTitles.has(problem.title.toLowerCase()), `${problem.id} does not repeat an earlier title`)
    assert.ok(problem.expected.rowCount > 0, `${problem.id} expects at least one row`)
    const solution = content.solutions[problem.id]
    assert.ok(!earlierSolutions.has(solution.sql.replace(/\s+/g, ' ').trim()), `${problem.id} is not a copy of an earlier solution`)
    assert.match(solution.explanationHtml, /Common mistake/, `${problem.id} explains a common mistake`)
    assert.ok((content.wrongAnswers[problem.id] ?? []).length > 0, `${problem.id} has at least one labelled wrong answer`)
  }
  const topics = new Set(batch.map((problem) => problem.topic))
  assert.ok(topics.size >= 6, `the batch covers several topics (${[...topics].join(', ')})`)
  assert.ok(batch.filter((problem) => problem.day >= 206).every((problem) => problem.topic === 'Case studies'), 'the last five days are case studies')
  const groups = solutionGroups(content.challenges.map((challenge) => challenge.id), content.pathExercises, content.pathProblems)
  const group = groups.find((item) => item.moduleId === 'virtual:sql-learner-solutions-data-analyst-days-181-210')
  assert.deepEqual([...(group?.ids ?? [])].sort(), batch.map((problem) => problem.id).sort(), 'the solution chunk holds exactly Days 181-210')
  const textGroup = problemTextGroups(content.pathProblems).find((item) => item.moduleId === 'virtual:sql-learner-problem-text-data-analyst-days-181-210')
  assert.deepEqual([...(textGroup?.ids ?? [])].sort(), batch.map((problem) => problem.id).sort(), 'the text chunk holds exactly Days 181-210')
})
