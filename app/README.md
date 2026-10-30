# SQL Learner

A browser-based app for learning SQL through structured lessons, practice and challenges.
Everything runs in the browser: no account, no server, no tracking.

> Status: Phase 02 — application shell, navigation, routing and design system.
> Lessons, the SQL engine, practice and challenges arrive in later phases.

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

## Project structure

```
src/
  app/            Router, navigation config, focus helpers
  components/
    layout/       AppShell, Sidebar, Header, Brand
    ui/           Button, Card, EmptyState, PageHeader, Icon, IconButton
  pages/          One component per route
  styles/         Design tokens (colours, type, spacing, motion)
  lib/            Small shared helpers
  index.css       Global base styles
```

- **Navigation:** `src/app/navigation.ts` is the single list of sections. The router, sidebar,
  page headings and dashboard all read from it, so a new section is added in one place.
- **Styling:** plain CSS. Design tokens are CSS custom properties in `src/styles/tokens.css`;
  each component has its own CSS Module. Light and dark themes follow the operating system.
- **Routing:** React Router (`createBrowserRouter`). Unknown paths show a not-found page.

## Routes

| Path          | Page          |
| ------------- | ------------- |
| `/`           | Dashboard     |
| `/learn`      | Learn SQL     |
| `/practice`   | Practice      |
| `/challenges` | Challenges    |
| `/reference`  | SQL Reference |
| `/settings`   | Settings      |
| anything else | Not found     |

## Browser support

The current and previous two major versions of Google Chrome, Mozilla Firefox and Microsoft Edge
on desktop. Mobile browsers are supported on a best-effort basis.

## Deployment note

This is a single-page app using browser history URLs. Any static host must serve `index.html`
for unknown paths so that opening `/learn` directly works. The Vite dev and preview servers already
do this.

## Licence

MIT — see [LICENSE](../LICENSE).
