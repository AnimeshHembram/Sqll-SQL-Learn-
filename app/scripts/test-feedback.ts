/**
 * Unit tests for the feedback link (src/features/feedback/issueUrl.ts).
 *
 *   npm run test:feedback
 *
 * The Feedback page turns the form into a link that opens a pre-filled issue
 * on the project's GitHub repository.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_DETAILS_LENGTH,
  MAX_SUMMARY_LENGTH,
  NEW_ISSUE_URL,
  issueBody,
  issueTitle,
  issueUrl,
  type Feedback,
} from '../src/features/feedback/issueUrl.ts'

const base: Feedback = { kind: 'problem', summary: 'Run does nothing', details: 'I pressed Run.', context: null }

test('the link opens a new issue on the project repository with the title and body filled in', () => {
  const url = new URL(issueUrl(base))
  assert.equal(`${url.origin}${url.pathname}`, NEW_ISSUE_URL)
  assert.equal(url.searchParams.get('title'), 'Problem: Run does nothing')
  assert.equal(url.searchParams.get('body'), issueBody(base))
})

test('the title is prefixed with the kind of feedback and trimmed', () => {
  assert.equal(issueTitle({ ...base, kind: 'idea', summary: '  Dark mode toggle  ' }), 'Idea: Dark mode toggle')
  assert.equal(issueTitle({ ...base, kind: 'content', summary: 'Typo' }), 'Content: Typo')
  assert.equal(issueTitle({ ...base, kind: 'other', summary: 'Thanks' }), 'Feedback: Thanks')
})

test('the body names the kind, keeps the details and says where it came from', () => {
  const body = issueBody(base)
  assert.match(body, /\*\*Type:\*\* Something does not work/)
  assert.match(body, /I pressed Run\./)
  assert.match(body, /Sent from the Feedback page in SQL Learner/)
  assert.match(issueBody({ ...base, details: '   ' }), /_No details given\._/)
})

test('browser details are included only when the learner allows it', () => {
  assert.doesNotMatch(issueBody(base), /Browser:/)
  const body = issueBody({ ...base, context: { userAgent: 'TestBrowser/1.0', opened: 'from disk (file://)' } })
  assert.match(body, /Browser: TestBrowser\/1\.0/)
  assert.match(body, /Opened: from disk \(file:\/\/\)/)
})

test('characters that have a meaning in URLs survive the round trip', () => {
  const details = "SELECT * FROM books WHERE title = 'A & B' AND price > 10 -- #1?"
  const url = new URL(issueUrl({ ...base, summary: '50% & more #2', details }))
  assert.equal(url.searchParams.get('title'), 'Problem: 50% & more #2')
  assert.match(url.searchParams.get('body') ?? '', new RegExp(details.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('very long text is cut so the link stays a manageable size', () => {
  const long = { ...base, summary: 'x'.repeat(500), details: 'y'.repeat(20_000) }
  assert.equal(issueTitle(long).length, 'Problem: '.length + MAX_SUMMARY_LENGTH)
  assert.ok(issueBody(long).length < MAX_DETAILS_LENGTH + 200)
  assert.ok(issueUrl(long).length < 8_000)
})
