---
id: choose-columns
title: Choose the columns you need
order: 1
difficulty: beginner
topic: SELECT
summary: Return only the title and author of every book, instead of every column.
module: sql-fundamentals
duration: 3
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Name the columns you want after SELECT
  - Read every row of a table with FROM
prerequisites:
  - The lesson "Introduction to SELECT"
---

## Task

The bookstore's website needs a simple list of its books. Write a query that returns the `title` and `author` of **every** book in the `books` table, in that column order.

The starter query returns every column. Change it so the result has exactly two columns: `title`, then `author`.

## Starter query

```sql
SELECT *
FROM books;
```

## Hints

1. `*` means "every column". Replace it with the names of the columns you want.
2. Separate column names with a comma.
3. The query starts with `SELECT title, author` and still reads `FROM books`.

## Solution

```sql
SELECT title, author
FROM books;
```

## Expected result

| title | author |
| --- | --- |
| The Silent Orchard | Mira Das |
| Rivers of Glass | Tomas Varga |
| Counting Stars | Priya Nair |
| The Last Signal | Mira Das |
| Paper Lanterns | Ken Ito |
| A Quiet Ledger | Ana Ruiz |

## Explanation

`SELECT` lists the columns to return, in the order they should appear. `FROM books` reads every row of the table, and because there is no `WHERE` clause, all six books are kept.

The task did not ask for an order, so any row order is accepted.

## Other accepted answers

```sql
SELECT books.title, books.author FROM books;
```

## Wrong answers

Feedback: column-mismatch

```sql
SELECT * FROM books;
```

Feedback: column-mismatch

```sql
SELECT author, title FROM books;
```

Feedback: syntax-error

```sql
SELECT title author, FROM books;
```
