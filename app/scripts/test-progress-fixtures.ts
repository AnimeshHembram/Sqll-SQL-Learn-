/**
 * Proves that saved progress is still read and summarised exactly as before
 * SQL Path work began.
 *
 *   npm run test:progress-fixtures
 *
 * Runs today's progress code on the fixtures in scripts/fixtures/progress/ and
 * compares every result with expected.json, which was captured once, before any
 * Phase 0 change, by scripts/capture-progress-baseline.ts. Any difference means
 * a change would read a learner's saved progress differently.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { EXPECTED_FILE, FIXTURE_NAMES, computeGolden } from './capture-progress-baseline.ts'

type Golden = ReturnType<typeof computeGolden>

const expected = existsSync(EXPECTED_FILE) ? (JSON.parse(readFileSync(EXPECTED_FILE, 'utf8')) as Golden) : null
const actual = computeGolden()

test('the progress baseline exists', () => {
  assert.ok(expected, 'scripts/fixtures/progress/expected.json is missing. Capture it with scripts/capture-progress-baseline.ts.')
})

test('the course content is the content the baseline was captured with', () => {
  // Checked first, so a content change is not mistaken for a change in how progress is read.
  assert.deepEqual(actual.content, expected?.content)
})

for (const name of FIXTURE_NAMES) {
  test(`${name}: stored progress is read exactly as before`, () => {
    const fixture = (actual.fixtures as Record<string, { parsed: unknown }>)[name]
    const baseline = (expected?.fixtures as Record<string, { parsed: unknown }> | undefined)?.[name]
    assert.deepEqual(fixture.parsed, baseline?.parsed)
  })

  test(`${name}: summaries, streaks and the activity strip are unchanged`, () => {
    const fixture = (actual.fixtures as Record<string, Record<string, unknown>>)[name]
    const baseline = (expected?.fixtures as Record<string, Record<string, unknown>> | undefined)?.[name]
    assert.deepEqual(fixture.summary, baseline?.summary)
    assert.deepEqual(fixture.afterOneAction, baseline?.afterOneAction)
    assert.equal(fixture.stableAfterSaveAndLoad, true, 'saving and loading again changes nothing')
  })
}

test('data that is not progress is still refused rather than overwritten', () => {
  assert.deepEqual(actual.refused, expected?.refused)
  assert.deepEqual(actual.refused, { otherVersion: null, notAnObject: null, anArray: null, nothing: null })
})
