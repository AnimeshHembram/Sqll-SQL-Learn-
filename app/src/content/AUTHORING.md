# Writing lessons, challenges and quizzes

Lessons, challenges and quizzes are Markdown files. Adding one never requires changing React code:
create the files described below and the app picks them up.

- [Lessons and modules](#folder-layout)
- [Challenges](#challenges)
- [Quizzes](#quizzes)

These checks protect the content:

| Command                  | What it checks |
| ------------------------ | -------------- |
| `npm run build` / `npm run dev` | Metadata, file layout, required sections and safe Markdown. A problem fails the build, or shows an error overlay in the browser during development, with the file name and the exact problem. |
| `npm run check:examples` | Runs every SQL example against the module's dataset in SQLite and compares the result with the table in the lesson. Run it whenever you change an example, a result table or a dataset. |
| `npm run check:challenges` | Runs every challenge's solution, other accepted answers, wrong answers and starter query in SQLite and checks that each is judged as the file says. Run it whenever you change a challenge or a dataset. |

## Folder layout

```
src/content/
  datasets/
    bookstore.sql               sample data (CREATE TABLE + INSERT statements)
  challenges/
    01-choose-columns.md        one file per challenge; the name only sorts the files
  quizzes/
    01-select-fundamentals.md   one file per quiz
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

## Challenges

A challenge asks the learner for a result and checks their query automatically. Each challenge is
one `.md` file in `src/content/challenges/`.

The app never compares SQL text. When a learner submits, the database worker runs their query and
the challenge's **solution** on two separate fresh, read-only copies of the dataset and compares
the two results (see [Evaluation rules](#evaluation-rules)). Any query that returns the same data
is correct.

### Challenge file

````markdown
---
id: count-books-by-genre
title: Count the books in each genre
order: 6
difficulty: intermediate
topic: GROUP BY
summary: One sentence shown in the challenge list and under the title.
module: sql-fundamentals          # optional
duration: 8
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Group rows with GROUP BY
prerequisites:                    # optional
  - SELECT and FROM from the SQL fundamentals module
---

## Task

What the learner must return. Name every column you expect when checkColumnNames is true.
Explain any concept the lessons do not cover yet, with a `sql syntax` block if useful.

## Starter query

```sql
SELECT genre
FROM books;
```

## Hints

1. A gentle nudge.
2. A more specific hint.
3. Almost the answer.

## Solution

```sql
SELECT genre, COUNT(*) AS book_count
FROM books
GROUP BY genre;
```

## Expected result

| genre | book_count |
| --- | --- |
| Fantasy | 2 |

## Explanation

Why the solution works, shown after the learner reveals it.

## Other accepted answers

```sql
SELECT genre, COUNT(id) AS book_count FROM books GROUP BY genre;
```

## Wrong answers

Feedback: column-mismatch

```sql
SELECT genre, COUNT(*) FROM books GROUP BY genre;
```
````

### Challenge fields

| Field | Required | Rules |
| ----- | -------- | ----- |
| `id` | yes | Lowercase letters, numbers and hyphens; unique. Used in the URL (`/challenges/<id>`), so changing it breaks links. |
| `title`, `summary` | yes | Plain text. |
| `order` | yes | Whole number from 1, unique. Sets the list order and Previous/Next navigation. |
| `difficulty` | yes | `beginner`, `intermediate` or `advanced`. Used by the difficulty filter. |
| `topic` | yes | Main SQL topic, such as `WHERE` or `Window functions`. The topic filter lists every topic used, in order of first appearance. |
| `module` | no | The `id` of a learning module that teaches what the challenge needs. Shown as a link. |
| `duration` | yes | Estimated minutes. |
| `dataset` | yes | A file in `src/content/datasets/` without `.sql`. The browser's database worker currently loads `bookstore`. |
| `tables` | yes | Tables the challenge uses, shown beside the editor. Each must exist in the dataset. |
| `orderMatters` | yes | `true` only when the task asks for an order (and the solution has `ORDER BY`). Otherwise any row order is accepted. |
| `checkColumnNames` | yes | `true` when the task names the columns; names must then match, ignoring capitals. `false` accepts any names but still requires the right number of columns, in the right positions. |
| `objectives` | yes | At least one item, shown as "You will". |
| `prerequisites` | no | What the learner should know first, in plain words. |

### Challenge sections

| Section | Required | Rules |
| ------- | -------- | ----- |
| `## Task` | yes | Markdown. Code blocks may be `sql` or `sql syntax`. |
| `## Starter query` | yes | Exactly one `sql` block: what the editor starts with. It must not already be a correct answer. |
| `## Hints` | yes | One numbered list of at least two hints, gentlest first. Shown one at a time. |
| `## Solution` | yes | Exactly one `sql` block: the trusted reference query. It must return a result. |
| `## Expected result` | yes | One table: exactly what the solution returns. `npm run check:challenges` fails if it differs. Shown only after the learner reveals the solution. |
| `## Explanation` | yes | Markdown, shown with the solution. |
| `## Other accepted answers` | no | Only `sql` blocks. Each must be judged correct; shown with the solution. |
| `## Wrong answers` | no | Pairs of a `Feedback: <kind>` line and a `sql` block. Never shown or bundled: they are test cases, and `npm run check:challenges` fails unless each gets exactly that kind of feedback. Kinds: `incorrect-output`, `syntax-error`, `missing-rows`, `extra-rows`, `wrong-order`, `column-mismatch`, `execution-failure`. |

Unknown fields and sections are rejected.

### What stays hidden

The build splits each challenge in two. The list and the challenge page get the task, starter
query and hints. The solution, expected result, explanation and other accepted answers go into a
separate module that only the database worker imports, plus a chunk the page downloads when the
learner chooses to see the solution. Feedback describes the learner's own result (columns, number
of rows, order) and never shows values from the expected result.

The solution is only revealed after the learner has submitted at least once or used every hint.

### Evaluation rules

Implemented in `src/features/challenges/evaluate.ts` and shared with `npm run check:challenges`.

1. The learner's SQL and the solution each run on a new copy of the dataset with
   `PRAGMA query_only = ON`, so statements that change data fail and change nothing.
2. An error is a **syntax error** (SQLite reports `syntax error`, `incomplete input` or
   `unrecognized token`) or an **execution failure** (anything else, such as an unknown column or
   an attempt to change data).
3. The answer must be exactly one statement that returns a table.
4. **Columns:** the number must match; when `checkColumnNames` is true, the names must match too,
   ignoring capitals.
5. **Rows** are compared as multisets: each row must appear as often as in the expected result, so
   duplicates count. Values are compared by type: `NULL` matches only `NULL`; numbers match by value
   to 12 significant digits (so `18` equals `18.0` and `32.970000000000006` equals `32.97`); text
   is compared exactly, including capitals; the text `'12.99'` is not the number `12.99`.
6. If every row matches, the answer is **correct**, unless `orderMatters` is true and the order
   differs (**wrong order**). Otherwise the feedback is **missing rows**, **extra rows**, or, when
   both, **incorrect output**.
7. Queries are stopped after 5 seconds. Challenges use their own worker, so stopping one never
   resets the practice database.

## Quizzes

A quiz is one `.md` file in `src/content/quizzes/`. Each `##` heading is one question.

````markdown
---
id: select-fundamentals
title: SELECT fundamentals
order: 1
difficulty: beginner
topic: SELECT, WHERE, ORDER BY and LIMIT
summary: One sentence shown in the quiz list.
duration: 5
---

## What does this query return?

Type: predict-output
Topic: ORDER BY
Difficulty: beginner

Optional supporting text or a query to read:

```sql
SELECT title FROM books WHERE price > 15 ORDER BY price;
```

- [x] *Rivers of Glass*, then *The Last Signal*
- [ ] *The Last Signal*, then *Rivers of Glass*

### Explanation

Why the correct option is right, shown after the learner checks their answer.
````

| Part | Rules |
| ---- | ----- |
| Front matter | `id`, `title`, `order`, `difficulty`, `topic`, `summary`, `duration`, all required. |
| `## Question?` | The question. Inline Markdown such as `code` is allowed. |
| `Type`, `Topic`, `Difficulty` | Three lines directly under the question. Types: `multiple-choice`, `predict-output`, `find-the-error`, `choose-the-clause`, `conceptual`. |
| Supporting content | Optional paragraphs and `sql` code blocks between those lines and the options. |
| Options | A task list with at least two options and exactly one `- [x]`. |
| `### Explanation` | Directly after the options; required. |

Quiz answers are checked in the browser and nothing is saved. Quiz queries are not run by a check,
so test any query you show by running it in the practice space.
