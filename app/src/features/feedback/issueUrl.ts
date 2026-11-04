/**
 * Builds the link that opens a new, pre-filled issue on the project's GitHub
 * repository. SQL Learner has no server, so feedback is never sent by the app:
 * the learner sees the issue on GitHub and decides whether to submit it.
 *
 * No browser imports, so scripts/test-feedback.ts runs it in Node.
 */

export const NEW_ISSUE_URL = 'https://github.com/AnimeshHembram/Sqll-SQL-Learn-/issues/new'

export const FEEDBACK_KINDS = {
  problem: 'Something does not work',
  idea: 'Idea or suggestion',
  content: 'Mistake in a lesson, challenge or quiz',
  other: 'Something else',
} as const

export type FeedbackKind = keyof typeof FEEDBACK_KINDS

/** Longest summary and details accepted, so the link stays well within what browsers and GitHub handle. */
export const MAX_SUMMARY_LENGTH = 120
export const MAX_DETAILS_LENGTH = 4000

export interface Feedback {
  kind: FeedbackKind
  summary: string
  details: string
  /** Browser details, included only if the learner leaves this on. `opened` is for example "from disk" or the site address. */
  context: { userAgent: string; opened: string } | null
}

const TITLE_PREFIX: Record<FeedbackKind, string> = {
  problem: 'Problem',
  idea: 'Idea',
  content: 'Content',
  other: 'Feedback',
}

export function issueTitle(feedback: Feedback): string {
  return `${TITLE_PREFIX[feedback.kind]}: ${feedback.summary.trim().slice(0, MAX_SUMMARY_LENGTH)}`
}

export function issueBody(feedback: Feedback): string {
  const lines = [`**Type:** ${FEEDBACK_KINDS[feedback.kind]}`, '', feedback.details.trim().slice(0, MAX_DETAILS_LENGTH) || '_No details given._']
  if (feedback.context) {
    lines.push('', '---', `Opened: ${feedback.context.opened}`, `Browser: ${feedback.context.userAgent}`)
  }
  lines.push('', '_Sent from the Feedback page in SQL Learner._')
  return lines.join('\n')
}

export function issueUrl(feedback: Feedback): string {
  const params = new URLSearchParams({ title: issueTitle(feedback), body: issueBody(feedback) })
  return `${NEW_ISSUE_URL}?${params.toString()}`
}
