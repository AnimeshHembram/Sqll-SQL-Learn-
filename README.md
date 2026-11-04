# SQL Learner

Learn SQL in your browser with short lessons, a practice editor, graded challenges and quizzes.
The SQL runs locally in a real SQLite engine (compiled to WebAssembly), so there is no account,
no server and no tracking. Progress is saved in your browser.

## Features

- **Lessons:** an SQL fundamentals module (5 lessons, from `SELECT` to `LIMIT`) with runnable
  examples whose results are checked against SQLite.
- **Practice:** an SQL editor with highlighting and completion, a bookstore sample database, a
  schema explorer, and clear results for every statement, including errors and empty results.
- **Challenges:** 15 tasks at three difficulty levels. Answers are checked by comparing your result
  with a reference query's, with feedback, hints and a solution you can reveal.
- **Quizzes:** 3 quizzes with explanations and saved best scores.
- **Progress:** completed lessons, solved challenges, quiz scores and a daily streak on the
  dashboard. You can export, import or reset it in Settings.
- **Feedback:** a form in the sidebar that opens a pre-filled issue on this repository, so
  learners can report problems or suggest ideas.

## Quick start

Requires [Node.js](https://nodejs.org/) 22.22 or newer. The app lives in the `app` folder:

```bash
cd app
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

To use it without a server, run `npm run build` once, then double-click `app/index.html`
(see [Opening the app from disk](app/README.md#opening-the-app-from-disk)).

## Tech stack

React 19, TypeScript, Vite 8, React Router, CodeMirror 6, and [sql.js](https://github.com/sql-js/sql.js)
(SQLite in WebAssembly) running in a Web Worker. Lessons, challenges and quizzes are Markdown files
checked at build time.

## Documentation

[app/README.md](app/README.md) covers the scripts, project structure, how answers are evaluated,
what is stored in the browser, and deployment. [app/src/content/AUTHORING.md](app/src/content/AUTHORING.md)
explains how to write lessons, challenges and quizzes.

## License

[MIT](LICENSE) © 2026 Animesh Hembram
