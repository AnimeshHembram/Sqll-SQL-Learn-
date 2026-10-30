# Writing lessons and modules

Lessons are Markdown files. Adding a lesson or a module never requires changing React code:
create the files described below and the app picks them up.

Two checks protect the content:

| Command                  | What it checks |
| ------------------------ | -------------- |
| `npm run build` / `npm run dev` | Metadata, file layout, required sections and safe Markdown. A problem fails the build, or shows an error overlay in the browser during development, with the file name and the exact problem. |
| `npm run check:examples` | Runs every SQL example against the module's dataset in SQLite and compares the result with the table in the lesson. Run it whenever you change an example, a result table or a dataset. |

## Folder layout

```
src/content/
  datasets/
    bookstore.sql               sample data (CREATE TABLE + INSERT statements)
  modules/
    01-sql-fundamentals/        one folder per module; the name only sorts the folders
      _module.md                module details and introduction (required)
      01-what-is-sql.md         one file per lesson; the file name only sorts the files
      02-introduction-to-select.md
```

Only `.md` files are allowed in a module folder, and only folders are allowed in `modules/`.

## Adding a module

1. Create a folder in `src/content/modules/`, for example `02-aggregation/`.
2. Add `_module.md`:

```markdown
---
id: aggregation
title: Aggregating data
order: 2
level: beginner
summary: One or two sentences shown on the Learn SQL page, the module page and the dashboard.
dataset: bookstore
---

Introduction shown at the top of the module page.
```

3. Add at least one lesson. If the module needs new sample data, add a `.sql` file to
   `src/content/datasets/` and name it in `dataset`.

## Adding a lesson

Create a `.md` file in the module's folder:

```markdown
---
id: count-rows
title: Counting rows with COUNT
module: aggregation
order: 1
level: beginner
duration: 10
summary: One sentence shown under the title and in lesson lists.
objectives:
  - What the learner will be able to do
  - Another objective
---

Short introduction to the concept.

## Syntax
...
## How the query runs
...
## Common mistakes
...
## Key takeaways
...
```

## Metadata

| Field        | Module | Lesson | Rules |
| ------------ | ------ | ------ | ----- |
| `id`         | yes    | yes    | Lowercase letters, numbers and hyphens. Used in the URL, so changing it breaks links. Module ids and lesson ids must each be unique across the whole course. |
| `title`      | yes    | yes    | Plain text. Becomes the page heading. |
| `module`     |        | yes    | The `id` of the module whose folder the lesson is in. |
| `order`      | yes    | yes    | Whole number from 1. Unique among modules, and among the lessons of one module. Lessons are shown and navigated in this order. |
| `level`      | yes    | yes    | `beginner`, `intermediate` or `advanced`. |
| `summary`    | yes    | yes    | Plain text, one or two sentences. |
| `duration`   |        | yes    | Estimated minutes to read the lesson, whole number. The module's time is the sum. |
| `objectives` |        | yes    | A list of at least one `- item`, shown as "In this lesson you will". |
| `dataset`    | yes    |        | Name of a file in `src/content/datasets/` without `.sql`. |

Unknown fields are rejected, so a typo such as `summery` is caught. Values go on the same line as
the field name; quotes around a value are optional.

## Required lesson sections

Every lesson must contain these `##` headings, so all lessons share one structure. Add other
sections (for example `## Examples`) wherever they help.

| Heading | What goes in it |
| ------- | --------------- |
| `## Syntax` | The general form of the statement, in a `sql syntax` block. |
| `## How the query runs` | The order in which the database processes the clauses, step by step. |
| `## Common mistakes` | Real mistakes, shown as `sql error` blocks or as runnable queries with surprising results. |
| `## Key takeaways` | A short bulleted summary. |

Objectives come from the metadata. Put the expected output as a table directly under each example.

## Writing the body

- Start sections at `##`. The title from the metadata is the only level-1 heading.
- Supported Markdown: paragraphs, `**bold**`, `*italic*`, lists, `inline code`, tables,
  `> blockquotes` for notes, and links.
- Raw HTML and images are rejected. Links must be `http`, `https`, `mailto` or relative.

### Code blocks

Every code block needs one of three labels:

````markdown
```sql
SELECT title FROM books;
```
````

| Label        | Shown as | Checked by `check:examples` |
| ------------ | -------- | --------------------------- |
| `sql`        | SQL example | Must run without errors. A table directly under it (or after an `Expected output:` line) must match the real result exactly: column names, row order and values. |
| `sql syntax` | Syntax | Not run. Use placeholders such as `table_name`. |
| `sql error`  | "This query causes an error", in red | Must fail when run. |

In the app, every `sql` and `sql error` block gets **Run** and **Open in Practice** buttons. Run
uses a fresh copy of the module's dataset and compares the result with the table under the
query, using the same comparison as `npm run check:examples`.

### Results

- Never type a result by hand without running the check. `npm run check:examples` compares every
  value; numbers match by value, so `15.50` in the lesson matches `15.5` from SQLite.
- Without `ORDER BY`, SQL does not guarantee row order. SQLite returns stored order for these small
  tables, and the lessons say so wherever they rely on it.
