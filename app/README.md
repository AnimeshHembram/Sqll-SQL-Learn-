# SQL Learner

A browser-based app for learning SQL through structured lessons, practice and challenges.
Everything runs in the browser: no account, no server, no tracking.

> Status: Phase 06 — learning progress is saved in the browser: completed lessons, solved
> challenges, quiz scores, a daily learning streak and recent activity, shown on a personalised
> dashboard. Progress can be exported, imported and reset from Settings. Lessons, practice,
> challenges and quizzes work as before.

## Requirements

- Node.js 22.22 or newer (required by Vite 8 and React Router 8)
- npm

## Getting started

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

## Scripts

| Command           | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Start the development server with hot reload   |
| `npm run build`   | Type-check and build the production files into `dist/` |
| `npm run preview` | Serve the production build locally             |
| `npm run lint`    | Run ESLint                                     |
| `npm run check:examples` | Run every lesson's SQL examples in SQLite and compare them with the results shown |
| `npm run check:challenges` | Run every challenge's solution, accepted answers and wrong answers in SQLite and check the feedback each gets |
| `npm run test:evaluation` | Unit tests for the answer comparison (NULLs, duplicates, numbers, order, columns) |
| `npm run test:progress` | Unit tests for saved progress (checking stored data, streaks, counts against content) |
| `npm run test:sql` | Tests for SQL execution on sql.js: empty input, errors, several statements, empty results, value types, row limits |
| `npm run test:interactions` | Unit tests for button states (busy, disabled, pressed, keyboard activation) |
| `npm run test:ui` | Optional browser tests for Run, Submit and Stop (pointer, keyboard, touch, focus, contrast). Needs a build and Playwright: `npm install --no-save playwright && npx playwright install chromium`. Not part of `npm run check` |
| `npm run check`   | Run lint, both content checks, both test suites and the production build, stopping at the first failure |

## Project structure

```
plugins/
  content/        Build-time loader and checker for lessons, challenges and quizzes (Vite plugin)
scripts/
  check-examples.ts    Checks lesson examples against SQLite
  check-challenges.ts  Checks challenges against SQLite
  test-evaluation.ts   Unit tests for answer evaluation
  test-progress.ts     Unit tests for saved progress
  test-sql-execution.ts  Tests for SQL execution and result descriptions
  test-interactions.ts   Unit tests for button interaction states
  test-ui.mjs            Optional browser tests for Run, Submit and Stop
src/
  app/            Router, navigation config, focus helpers
  components/
    layout/       AppShell, Sidebar, Header, Brand
    content/      Prose, LessonBody, ExampleRunner, LessonList, LessonPager
    challenges/   ChallengeList, FeedbackPanel, HintList, SolutionPanel, DifficultyBadge, Tag
    progress/     ProgressOverview, ActivityStrip, RecentActivity, LessonCompletion, CompletionBadge
    ui/           Button, Card, ConfirmDialog, EmptyState, PageHeader, Breadcrumbs, Icon, IconButton, ProgressBar
  content/
    modules/      Lesson Markdown files, one folder per module
    challenges/   Challenge Markdown files
    quizzes/      Quiz Markdown files
    datasets/     Sample databases (.sql) used by lessons and challenges
    AUTHORING.md  How to write lessons, challenges and quizzes
  features/sql/   SQL engine: worker, client, protocol, result comparison
  features/challenges/  Answer evaluation and per-visit challenge state
  features/progress/    Saved progress: model and checks (pure), store (localStorage + React), summaries
  components/sql/ SqlEditor, ResultTable, QueryResults, SchemaExplorer
  pages/          One component per route
  styles/         Design tokens (colours, type, spacing, motion)
  lib/            Small shared helpers (class names, browser storage)
  index.css       Global base styles
```

- **Lessons:** Markdown files with a short metadata block, in `src/content/modules/`. At build time
  `plugins/content` checks every file (required fields, unique ids, module references, required
  sections, safe Markdown only) and converts it to HTML, so no Markdown library ships to the
  browser. A broken lesson fails `npm run build` and shows an error overlay in `npm run dev`.
- **Examples:** `npm run check:examples` runs every SQL example against the module's dataset
  (`src/content/datasets/`) using Node's built-in SQLite, and fails if any result table in a lesson
  differs from the real output. See [src/content/AUTHORING.md](src/content/AUTHORING.md).

- **Challenges:** Markdown files in `src/content/challenges/`, validated at build time like lessons.
  Submissions are evaluated in the database worker: the learner's query and the hidden reference
  query run on separate fresh, read-only copies of the data and their results are compared (see
  [Challenge evaluation](#challenge-evaluation)). Hints, drafts and revealed solutions are kept in
  memory for the current visit only.
- **Quizzes:** Markdown files in `src/content/quizzes/` with five question types. Answers are
  checked one question at a time, with an explanation. When every answer is checked, the score is
  saved as progress (best score, last score, number of attempts).
- **Progress:** `src/features/progress/`. `progressModel.ts` defines the saved shape and checks
  every stored or imported entry (a damaged entry is dropped, the rest is kept); it has no browser
  code, so `npm run test:progress` runs it in Node. `progressStore.ts` saves to `localStorage`,
  shares changes with React through `useSyncExternalStore`, and follows other tabs through the
  `storage` event. `progressSummary.ts` measures progress against the current content, ignoring
  saved entries for content that no longer exists.

- **Navigation:** `src/app/navigation.ts` is the single list of sections. The router, sidebar,
  page headings and dashboard all read from it, so a new section is added in one place.
- **Styling:** plain CSS. Design tokens are CSS custom properties in `src/styles/tokens.css`;
  each component has its own CSS Module. Light and dark themes follow the operating system.
- **Routing:** React Router (`createBrowserRouter`). Unknown paths show a not-found page. The
  Practice page (and the editor it carries) is loaded only when it is opened.
- **SQL engine:** SQLite compiled to WebAssembly ([sql.js](https://github.com/sql-js/sql.js)), running
  in a Web Worker (`src/features/sql/`). `execute.ts` runs the statements and collects results; it
  has no browser imports, so `npm run test:sql` runs it in Node on the same sql.js build. The WebAssembly file and `bookstore.sql` are bundled with
  the app; no SQL is sent anywhere. Queries that run longer than 5 seconds, or that the learner
  stops, end by restarting the worker, which also restores the original data.
- **Results:** each statement gets its own result: a table with the row count, "No rows returned"
  with the column names, or what a statement changed (for example "2 rows deleted", including
  statements that start with `WITH`). An error names the failing statement; earlier statements keep
  their results and changes. Up to 1,000 rows per statement are shown and up to 100,000 counted.
  Values are shown as SQLite returned them: NULL and empty text have their own markers, spaces and
  line breaks are kept, integers beyond 2^53 stay exact, and text over 300 characters is shortened
  until expanded. The time shown in Practice is measured in the worker around SQLite's work, so it
  does not include starting the engine or drawing the table. Blank or comment-only input runs
  nothing, says so, and does not count towards the learning streak.
- **Buttons:** `components/ui/Button` shows a pressed state for mouse, touch, Enter and Space. While
  its action runs (`busy`), it shows a spinner and a label such as "Running…", ignores further
  presses and stays focusable (`aria-busy`, `aria-disabled`), so keyboard users keep their place;
  `disabled` is only for buttons that cannot be used, which are dimmed and have no hover or press
  effect. If Stop had focus when it disappears, focus returns to the button that started the run.
  A new result fades in briefly (not with reduced motion), so running the same query again is
  visibly a new run. Holding Enter (or Ctrl+Enter in the editor) acts once, not once per key repeat.
  When a button disappears or disables itself after use (Clear, Reset query, the last hint, Show the
  solution, Check answer, Reset progress), focus moves to what comes next instead of the top of the
  page. Ctrl+Enter on an empty editor says that there is nothing to run.
- **Editor:** CodeMirror 6 with SQLite highlighting, line numbers and completion of keywords, tables
  and columns. Ctrl+Enter (Cmd+Enter on macOS) runs the query.

## Routes

| Path          | Page          |
| ------------- | ------------- |
| `/`           | Dashboard     |
| `/learn`      | Learn SQL     |
| `/learn/:moduleId` | Module overview |
| `/learn/:moduleId/:lessonId` | Lesson |
| `/practice`   | Practice      |
| `/challenges` | Challenges (filters: `?difficulty=beginner&topic=WHERE&status=unsolved`) |
| `/challenges/:challengeId` | Challenge |
| `/quizzes`    | Quizzes       |
| `/quizzes/:quizId` | Quiz     |
| `/reference`  | SQL Reference |
| `/settings`   | Settings      |
| anything else | Not found     |

## Data stored in the browser

Two `localStorage` entries, both prefixed `sql-learner:`. Nothing is sent anywhere.

- `last-lesson:v1` — the last lesson opened, so the dashboard can offer "Continue learning".
- `progress:v1` — learning progress:
  - lessons marked complete, with the date;
  - per challenge: when it was first solved, number of submissions, most hints shown, and whether
    the solution was revealed (and whether that was before solving);
  - per quiz: best score, last score, attempts and date;
  - activity per local calendar day (count of learning actions: completing a lesson, submitting a
    challenge answer, finishing a quiz, running a practice query), kept for about 400 days, used
    for the streak;
  - the 20 most recent lessons completed, challenges solved and quizzes finished.

Lesson completion is the learner's choice ("Mark as complete" at the end of each lesson); nothing is
marked complete automatically. A streak counts consecutive days with activity, and is still current
on a day with no activity yet, until that day ends.

Settings can export progress as a JSON file, import such a file (checked, then confirmed before it
replaces anything), reset progress, or delete all saved data. If storage is blocked, the app works
normally, progress lasts only for the visit, and Settings says so.

Challenge drafts are kept in memory only, until the page is reloaded. Quiz answers in progress are
kept only while the quiz page is open.

The practice database is kept in memory only, for the current tab. Reloading the page, pressing
Reset database, or stopping a long query restores the original bookstore data.

## Challenge evaluation

Each submission runs in a dedicated challenge worker, separate from the practice database:

1. The learner's SQL runs on a brand-new copy of the dataset opened with `PRAGMA query_only = ON`.
2. The reference query runs on another brand-new copy. Both copies are discarded afterwards.
3. The two results are compared as data, never as SQL text: column count (and names when the task
   names them), then rows as multisets, with typed values, exact `NULL` matching, numbers compared
   to 12 significant digits, duplicates counted, and order checked only when the task requires it.
4. The page receives a feedback category and the learner's own result. Expected values are never
   sent to the page before the learner reveals the solution.

Queries are stopped after 5 seconds (or when the learner presses Stop) by restarting the challenge
worker; nothing is lost because every run uses a fresh copy.

**Limits of client-side evaluation.** Everything runs in the learner's browser, so this protects
learning, not secrets:

- The reference queries are part of the downloaded app (in the worker and a lazily loaded chunk). A
  determined learner can read them with developer tools. That is acceptable for self-study but
  means the app cannot be used for graded assessment.
- A learner could change the app in their own browser to report any answer as correct. Results
  are never sent anywhere, so this only affects them.
- Feedback reveals the shape of the expected result (column names when the task names them, and
  how many rows are missing or extra), but not its values.
- Correctness is checked on one dataset. A query that happens to return the right rows for this data
  (for example, filtering on a hard-coded value) is accepted. Explanations point out such shortcuts.
- Equal results are equal answers: SQL style, performance and readability are not assessed.

## Browser support

The current and previous two major versions of Google Chrome, Mozilla Firefox and Microsoft Edge
on desktop. Mobile browsers are supported on a best-effort basis.

## Deployment note

This is a single-page app using browser history URLs. Any static host must serve `index.html`
for unknown paths so that opening `/learn` directly works. The Vite dev and preview servers already
do this.

## Licence

MIT — see [LICENSE](../LICENSE).
