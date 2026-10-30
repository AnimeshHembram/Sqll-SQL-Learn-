---
id: introduction-to-select
title: Introduction to SELECT
module: sql-fundamentals
order: 2
level: beginner
duration: 10
summary: Choose which columns appear in the result, in which order, and under which names.
objectives:
  - Return specific columns instead of every column
  - Control the order of columns in the result
  - Rename a result column with AS
---

`SELECT *` returns every column. Most of the time you only need a few, and naming them makes the result smaller and easier to read. `SELECT` decides which **columns** appear in the result. It does not decide which rows appear; that is the job of `WHERE`, in the next lesson.

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name;
SELECT column1 AS new_name FROM table_name;
```

- List the columns you want after `SELECT`, separated by commas.
- `AS new_name` gives a column a different name in the result.

## Examples

### Choose specific columns

```sql
SELECT title, author FROM books;
```

Expected output:

| title | author |
| --- | --- |
| The Silent Orchard | Mira Das |
| Rivers of Glass | Tomas Varga |
| Counting Stars | Priya Nair |
| The Last Signal | Mira Das |
| Paper Lanterns | Ken Ito |
| A Quiet Ledger | Ana Ruiz |

You still get all 6 rows, but only the two columns you asked for.

### Column order follows your list

Columns appear in the order you write them. Swap them and the result swaps too:

```sql
SELECT price, title FROM books;
```

| price | title |
| --- | --- |
| 12.99 | The Silent Orchard |
| 15.50 | Rivers of Glass |
| 9.99 | Counting Stars |
| 18.00 | The Last Signal |
| 11.25 | Paper Lanterns |
| 14.75 | A Quiet Ledger |

### Rename a column with AS

```sql
SELECT title AS book, year AS published FROM books;
```

| book | published |
| --- | --- |
| The Silent Orchard | 2018 |
| Rivers of Glass | 2021 |
| Counting Stars | 2015 |
| The Last Signal | 2023 |
| Paper Lanterns | 2019 |
| A Quiet Ledger | 2020 |

## How the query runs

1. `FROM books` picks the table.
2. `SELECT` goes through every row and keeps only the listed columns, in the listed order.
3. `AS` renames a column in the result. The table itself is not changed: its column is still called `title`.

> The rows above come back in the order they were stored, but SQL does not promise any particular order unless you ask for one. You will sort rows with `ORDER BY` in lesson 4.

## Common mistakes

**Forgetting a comma between columns.** This query does not cause an error, which makes the mistake easy to miss:

```sql
SELECT title author FROM books;
```

| author |
| --- |
| The Silent Orchard |
| Rivers of Glass |
| Counting Stars |
| The Last Signal |
| Paper Lanterns |
| A Quiet Ledger |

Without the comma, SQL reads `author` as a new name for `title`, exactly as if you had written `title AS author`. You get one column of titles, wrongly labelled "author".

**Leaving a comma after the last column.** The database expects another column name after every comma:

```sql error
SELECT title, author, FROM books;
```

This causes a syntax error. Remove the comma before `FROM`.

**Misspelling a column name.**

```sql error
SELECT titel FROM books;
```

SQLite answers with `no such column: titel`. Column names must match the table exactly.

## Key takeaways

- List the columns you need after `SELECT`, separated by commas.
- Columns appear in the result in the order you list them.
- `AS` renames a column in the result only.
- A missing comma can silently turn a column name into an alias, so check the column headings of your result.
- `SELECT *` is handy for a quick look; in real queries, name the columns you need.
