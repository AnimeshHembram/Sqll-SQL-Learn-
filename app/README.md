# SQL Learner

A browser-based app for learning SQL through structured lessons, practice and challenges.
Everything runs in the browser: no account, no server, no tracking.

> Status: Phase 04 — SQL runs in the browser. The Practice page has an SQL editor, results and a
> database explorer, and every lesson example can be run and compared with its expected output.
> Challenges and progress tracking arrive in later phases.

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
| `npm run check`   | Run lint, the example check and the production build, stopping at the first failure |

## Project structure

```
plugins/
  content/        Build-time lesson loader and checker (Vite plugin)
scripts/
  check-examples.ts  Checks lesson examples against SQLite
src/
  app/            Router, navigation config, focus helpers
  components/
    layout/       AppShell, Sidebar, Header, Brand
    content/      Prose, LessonBody, ExampleRunner, LessonList, LessonPager
    ui/           Button, Card, ConfirmDialog, EmptyState, PageHeader, Breadcrumbs, Icon, IconButton
  content/
    modules/      Lesson Markdown files, one folder per module
    datasets/     Sample databases (.sql) used by the examples
    AUTHORING.md  How to write lessons and modules
  features/sql/   SQL engine: worker, client, protocol, result comparison
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

- **Navigation:** `src/app/navigation.ts` is the single list of sections. The router, sidebar,
  page headings and dashboard all read from it, so a new section is added in one place.
- **Styling:** plain CSS. Design tokens are CSS custom properties in `src/styles/tokens.css`;
  each component has its own CSS Module. Light and dark themes follow the operating system.
- **Routing:** React Router (`createBrowserRouter`). Unknown paths show a not-found page. The
  Practice page (and the editor it carries) is loaded only when it is opened.
- **SQL engine:** SQLite compiled to WebAssembly ([sql.js](https://github.com/sql-js/sql.js)), running
  in a Web Worker (`src/features/sql/`). The WebAssembly file and `bookstore.sql` are bundled with
  the app; no SQL is sent anywhere. Queries that run longer than 5 seconds, or that the learner
  stops, end by restarting the worker, which also restores the original data.
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
| `/challenges` | Challenges    |
| `/reference`  | SQL Reference |
| `/settings`   | Settings      |
| anything else | Not found     |

## Data stored in the browser

SQL Learner remembers the last lesson opened (one `localStorage` entry, prefixed `sql-learner:`) so
the dashboard can offer "Continue learning". Nothing is sent anywhere. Settings has a button to
clear it. If storage is blocked, the app works normally without it.

The practice database is kept in memory only, for the current tab. Reloading the page, pressing
Reset database, or stopping a long query restores the original bookstore data.

## Browser support

The current and previous two major versions of Google Chrome, Mozilla Firefox and Microsoft Edge
on desktop. Mobile browsers are supported on a best-effort basis.

## Deployment note

This is a single-page app using browser history URLs. Any static host must serve `index.html`
for unknown paths so that opening `/learn` directly works. The Vite dev and preview servers already
do this.

## Licence

MIT — see [LICENSE](../LICENSE).
