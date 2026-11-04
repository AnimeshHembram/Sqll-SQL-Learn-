/**
 * Unit tests for saved learning progress (src/features/progress/).
 *
 *   npm run test:progress
 *
 * Covers checking stored and imported data, streaks across days and months,
 * the activity window, recent events, and progress measured against content.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ACTIVITY_DAYS_KEPT,
  RECENT_LIMIT,
  addActivity,
  addRecent,
  dayKey,
  emptyProgress,
  lessonKey,
  parseProgress,
  recentDays,
  shiftDay,
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
import type { ContentChallenge, ContentModule, ContentQuiz, Level } from '../src/content/types.ts'

const at = (day: string, hour = 10) => {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date, hour)
}

function activityOn(...days: string[]): Record<string, number> {
  return Object.fromEntries(days.map((day) => [day, 1]))
}

// --- Dates ----------------------------------------------------------------------------

test('day keys use the local calendar day', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05')
  assert.equal(dayKey(new Date(2026, 10, 4, 0, 1)), '2026-11-04')
})

test('shifting days crosses months, years and leap days', () => {
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28')
  assert.equal(shiftDay('2028-03-01', -1), '2028-02-29')
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDay('2026-11-04', -30), '2026-10-05')
})

// --- Streaks ----------------------------------------------------------------------------

test('no activity means no streak', () => {
  assert.deepEqual(summarizeStreak({}, at('2026-11-04')), { current: 0, longest: 0, activeToday: false, activeDays: 0 })
})

test('a streak counts consecutive days ending today', () => {
  const streak = summarizeStreak(activityOn('2026-11-02', '2026-11-03', '2026-11-04'), at('2026-11-04'))
  assert.equal(streak.current, 3)
  assert.equal(streak.activeToday, true)
})

test('a streak that ended yesterday is still current, because today is not over', () => {
  const streak = summarizeStreak(activityOn('2026-11-02', '2026-11-03'), at('2026-11-04'))
  assert.equal(streak.current, 2)
  assert.equal(streak.activeToday, false)
})

test('a missed day ends the streak', () => {
  assert.equal(summarizeStreak(activityOn('2026-11-01', '2026-11-02'), at('2026-11-04')).current, 0)
})

test('the longest streak is remembered after it ends, across month boundaries', () => {
  const activity = activityOn('2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-04')
  const streak = summarizeStreak(activity, at('2026-11-04'))
  assert.equal(streak.longest, 4)
  assert.equal(streak.current, 1)
  assert.equal(streak.activeDays, 5)
})

test('days with a zero count are not activity', () => {
  assert.equal(summarizeStreak({ '2026-11-04': 0 }, at('2026-11-04')).current, 0)
})

// --- Activity -----------------------------------------------------------------------------

test('activity adds up within a day and starts afresh the next day', () => {
  let progress = emptyProgress()
  progress = addActivity(progress, at('2026-11-04', 9))
  progress = addActivity(progress, at('2026-11-04', 21))
  progress = addActivity(progress, at('2026-11-05', 8))
  assert.deepEqual(progress.activity, { '2026-11-04': 2, '2026-11-05': 1 })
})

test('activity older than the kept window is dropped', () => {
  const old = shiftDay('2026-11-04', -ACTIVITY_DAYS_KEPT - 5)
  const progress = addActivity({ ...emptyProgress(), activity: { [old]: 3, '2026-11-01': 1 } }, at('2026-11-04'))
  assert.equal(old in progress.activity, false)
  assert.equal(progress.activity['2026-11-01'], 1)
})

test('recent days run oldest first and end today', () => {
  const days = recentDays({ '2026-11-04': 2, '2026-11-02': 1 }, at('2026-11-04'), 4)
  assert.deepEqual(days, [
    { day: '2026-11-01', count: 0 },
    { day: '2026-11-02', count: 1 },
    { day: '2026-11-03', count: 0 },
    { day: '2026-11-04', count: 2 },
  ])
})

test('a repeated recent event moves to the top instead of appearing twice', () => {
  let progress = emptyProgress()
  progress = addRecent(progress, { kind: 'quiz', id: 'a', at: '2026-11-01T10:00:00.000Z', detail: '2/5' })
  progress = addRecent(progress, { kind: 'challenge', id: 'b', at: '2026-11-02T10:00:00.000Z' })
  progress = addRecent(progress, { kind: 'quiz', id: 'a', at: '2026-11-03T10:00:00.000Z', detail: '5/5' })
  assert.deepEqual(
    progress.recent.map((event) => `${event.kind}:${event.id}:${event.detail ?? ''}`),
    ['quiz:a:5/5', 'challenge:b:'],
  )
})

test('the recent list is capped', () => {
  let progress = emptyProgress()
  for (let i = 0; i < RECENT_LIMIT + 5; i++) {
    progress = addRecent(progress, { kind: 'challenge', id: `c${i}`, at: '2026-11-01T10:00:00.000Z' })
  }
  assert.equal(progress.recent.length, RECENT_LIMIT)
  assert.equal(progress.recent[0].id, `c${RECENT_LIMIT + 4}`)
})

// --- Checking stored data ---------------------------------------------------------------

const valid: ProgressData = {
  version: 1,
  lessons: { 'sql-fundamentals/what-is-sql': { completedAt: '2026-11-01T10:00:00.000Z' } },
  challenges: {
    'choose-columns': {
      solvedAt: '2026-11-02T10:00:00.000Z',
      attempts: 2,
      hintsUsed: 1,
      revealedSolution: false,
      revealedBeforeSolving: false,
    },
  },
  quizzes: { 'select-fundamentals': { bestScore: 4, lastScore: 3, total: 5, attempts: 2, lastTakenAt: '2026-11-03T10:00:00.000Z' } },
  activity: { '2026-11-01': 2 },
  recent: [{ kind: 'quiz', id: 'select-fundamentals', at: '2026-11-03T10:00:00.000Z', detail: '3/5' }],
}

test('valid progress survives a save and load unchanged', () => {
  assert.deepEqual(parseProgress(JSON.parse(JSON.stringify(valid))), valid)
})

test('data that is not progress, or from another version, is refused', () => {
  for (const value of [null, 'text', 42, [], {}, { version: 2, lessons: {} }, { ...valid, version: '1' }]) {
    assert.equal(parseProgress(value), null, JSON.stringify(value))
  }
})

test('damaged entries are dropped and the rest is kept', () => {
  const parsed = parseProgress({
    ...valid,
    lessons: { ...valid.lessons, 'bad/date': { completedAt: 'not a date' }, 'bad key!': { completedAt: '2026-11-01T10:00:00Z' } },
    challenges: {
      ...valid.challenges,
      negative: { solvedAt: null, attempts: -1, hintsUsed: 0, revealedSolution: false, revealedBeforeSolving: false },
      missing: { attempts: 1 },
    },
    quizzes: {
      ...valid.quizzes,
      impossible: { bestScore: 9, lastScore: 1, total: 5, attempts: 1, lastTakenAt: '2026-11-03T10:00:00.000Z' },
    },
    activity: { ...valid.activity, '2026-13': 1, '2026-11-02': -4, '2026-11-03': 1.5 },
    recent: [...valid.recent, { kind: 'video', id: 'x', at: '2026-11-03T10:00:00.000Z' }, 'junk'],
  })
  assert.deepEqual(parsed, valid)
})

test('missing sections become empty rather than failing', () => {
  assert.deepEqual(parseProgress({ version: 1 }), emptyProgress())
})

test('keys that could reach object prototypes are ignored', () => {
  const parsed = parseProgress(JSON.parse('{"version":1,"lessons":{"__proto__":{"completedAt":"2026-11-01T10:00:00Z"}}}'))
  assert.ok(parsed)
  assert.deepEqual(Object.keys(parsed.lessons), [])
  assert.equal(Object.getPrototypeOf(parsed.lessons), Object.prototype)
  assert.equal(parseProgress({ version: 1, quizzes: { constructor: { bestScore: 1 } } })?.quizzes.constructor, Object)
})

// --- Progress against content -------------------------------------------------------------

function module(id: string, lessonIds: string[]): ContentModule {
  return {
    id,
    title: id,
    order: 1,
    level: 'beginner',
    summary: '',
    introHtml: '',
    lessons: lessonIds.map((lessonId, index) => ({
      id: lessonId,
      title: lessonId,
      order: index + 1,
      level: 'beginner',
      summary: '',
      durationMinutes: 5,
      objectives: [],
      html: '',
      examples: [],
    })),
  }
}

function challenge(id: string, difficulty: Level): ContentChallenge {
  return { id, difficulty } as ContentChallenge
}

const modules = [module('m1', ['a', 'b']), module('m2', ['c'])]
const challenges = [challenge('one', 'beginner'), challenge('two', 'beginner'), challenge('three', 'advanced')]

function withLessons(...keys: string[]): ProgressData {
  return { ...emptyProgress(), lessons: Object.fromEntries(keys.map((key) => [key, { completedAt: '2026-11-01T10:00:00Z' }])) }
}

test('lessons are counted per module and for the course', () => {
  const progress = withLessons(lessonKey('m1', 'a'), lessonKey('m2', 'c'))
  assert.deepEqual(moduleCount(modules[0], progress), { done: 1, total: 2 })
  assert.deepEqual(lessonCount(modules, progress), { done: 2, total: 3 })
  assert.equal(percent(lessonCount(modules, progress)), 67)
})

test('saved lessons that no longer exist are not counted', () => {
  assert.deepEqual(lessonCount(modules, withLessons('m1/a', 'm1/removed', 'gone/x')), { done: 1, total: 3 })
})

test('the next lesson is the first incomplete one in course order', () => {
  assert.equal(nextIncompleteLesson(modules, withLessons('m1/a'))?.lessonId, 'b')
  assert.equal(nextIncompleteLesson(modules, withLessons('m1/a', 'm1/b'))?.lessonId, 'c')
  assert.equal(nextIncompleteLesson(modules, withLessons('m1/a', 'm1/b', 'm2/c')), undefined)
})

test('challenges are counted by difficulty and the next unsolved one is found', () => {
  const progress: ProgressData = {
    ...emptyProgress(),
    challenges: {
      one: { solvedAt: '2026-11-01T10:00:00Z', attempts: 1, hintsUsed: 0, revealedSolution: false, revealedBeforeSolving: false },
      two: { solvedAt: null, attempts: 3, hintsUsed: 2, revealedSolution: true, revealedBeforeSolving: true },
    },
  }
  const count = challengeCount(challenges, progress)
  assert.equal(count.done, 1)
  assert.deepEqual(count.byLevel.beginner, { done: 1, total: 2 })
  assert.deepEqual(count.byLevel.advanced, { done: 0, total: 1 })
  assert.equal(nextUnsolvedChallenge(challenges, progress)?.id, 'two')
})

test('quiz averages use best scores of finished quizzes only', () => {
  const quizzes = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }] as ContentQuiz[]
  const progress: ProgressData = {
    ...emptyProgress(),
    quizzes: {
      q1: { bestScore: 5, lastScore: 2, total: 5, attempts: 2, lastTakenAt: '2026-11-01T10:00:00Z' },
      q2: { bestScore: 3, lastScore: 3, total: 6, attempts: 1, lastTakenAt: '2026-11-01T10:00:00Z' },
    },
  }
  assert.deepEqual(quizCount(quizzes, progress), { done: 2, total: 3, averageBest: 75 })
  assert.equal(quizCount(quizzes, emptyProgress()).averageBest, null)
})
