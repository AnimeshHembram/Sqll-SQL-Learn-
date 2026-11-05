---
id: introduction-to-select
title: Introduction to SELECT
module: sql-fundamentals
order: 2
level: beginner
duration: 12
summary: Choose which columns appear in the result, in which order, and under which names.
objectives:
  - Return specific columns instead of every column
  - Control the order of columns in the result
  - Rename a result column with AS
  - Remove duplicate rows with DISTINCT
---

`SELECT *` shows every column. Most of the time you only need a few. In this lesson you will choose exactly which columns come back, in which order, and what they are called.

## The big idea

Imagine printing the bookshop's spreadsheet for a customer who only cares about titles and prices. You would **hide the other columns** before printing. The rows are all still there; you just show fewer columns.

That is what `SELECT` does. It decides which **columns** appear in the result:

- `SELECT` chooses **columns** (what you see about each row).
- It does **not** choose rows. Every book still appears. Choosing rows is the job of `WHERE`, in the next lesson.

## Choosing columns, step by step

**Step 1.** Start from the query you already know: `SELECT * FROM books;`

**Step 2.** Replace the `*` with the name of the column you want: `SELECT title FROM books;`

**Step 3.** To get more than one column, separate the names with **commas**: `SELECT title, author FROM books;`

**Step 4.** If you want a column to have a different heading in the result, add `AS` and the new name: `SELECT title AS book FROM books;`

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name;
SELECT column1 AS new_name FROM table_name;
SELECT DISTINCT column1 FROM table_name;
```

- List the columns you want after `SELECT`, separated by commas. No comma after the last one.
- `AS new_name` gives a column a different heading in the result.
- `DISTINCT` removes repeated rows from the result.

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

What this result means: there are still **6 rows**, one per book, but each row now shows only **2 columns**, the title and the author. The `id`, `genre`, `year` and `price` columns still exist in the table; they are just not shown.

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

`price` is now the first column, because it is first in the list.

### Rename a column with AS

Column names in a database are often short or technical. `AS` gives a column a friendlier heading in the result:

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

The values are the same as in the `title` and `year` columns; only the headings changed. The new name is called an **alias**. The table itself is not renamed: its column is still called `title`.

### Remove duplicates with DISTINCT

Which genres does the shop sell? Asking for the `genre` column gives one row per book, so Fantasy and Mystery would each appear twice. `DISTINCT` keeps each different value once:

```sql
SELECT DISTINCT genre FROM books;
```

| genre |
| --- |
| Mystery |
| Fantasy |
| Science |
| Science fiction |

Six books, but only four different genres.

## How the query runs

For `SELECT title, author FROM books;`:

1. **`FROM books`** picks the table: 6 rows, 6 columns.
2. **`SELECT title, author`** goes through every row and keeps only those two columns, in that order.
3. If there is an **`AS`**, the column heading is changed in the result.
4. If there is a **`DISTINCT`**, repeated rows are removed.

| Step | Rows | Columns |
| --- | --- | --- |
| After `FROM books` | 6 | 6 (`id`, `title`, `author`, `genre`, `year`, `price`) |
| After `SELECT title, author` | 6 | 2 (`title`, `author`) |

`SELECT` changes the number of columns; it never changes the number of rows (unless you add `DISTINCT`).

> The rows above come back in the order they were stored, but SQL does not promise any particular order unless you ask for one. You will sort rows with `ORDER BY` in lesson 4.

## Common mistakes

**Forgetting a comma between columns.** This query does **not** cause an error, which makes the mistake easy to miss:

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

**Why it happens:** `AS` is optional in SQL. Without the comma, SQL reads `author` as a new name for `title`, exactly as if you had written `title AS author`. You get one column of titles, wrongly labelled "author". Always check the column headings of your result.

**Leaving a comma after the last column.** Every comma promises that another column name is coming:

```sql error
SELECT title, author, FROM books;
```

This causes a syntax error, because SQL finds `FROM` where it expected a column name. Remove the comma before `FROM`.

**Misspelling a column name.**

```sql error
SELECT titel FROM books;
```

SQLite answers with `no such column: titel`. **Why it happens:** column names must match the table exactly. If you are not sure of a name, run `SELECT * FROM books;` and read the headings.

## Try it yourself

Open the Practice space and try each task first, then compare with the answer below it.

**Task 1.** Show the name and city of every customer.

```sql
SELECT name, city FROM customers;
```

| name | city |
| --- | --- |
| Aisha Khan | Bangalore |
| Rahul Mehta | Mumbai |
| Sofia Rossi | NULL |
| Daniel Kim | Bangalore |
| Meera Pillai | Chennai |

**Task 2.** Show every book's title and price, with the headings `book_title` and `cost`.

```sql
SELECT title AS book_title, price AS cost FROM books;
```

| book_title | cost |
| --- | --- |
| The Silent Orchard | 12.99 |
| Rivers of Glass | 15.50 |
| Counting Stars | 9.99 |
| The Last Signal | 18.00 |
| Paper Lanterns | 11.25 |
| A Quiet Ledger | 14.75 |

**Task 3.** List each author who has a book in the shop, once each.

```sql
SELECT DISTINCT author FROM books;
```

| author |
| --- |
| Mira Das |
| Tomas Varga |
| Priya Nair |
| Ken Ito |
| Ana Ruiz |

Mira Das wrote two books but appears only once.

## Key takeaways

- List the columns you need after `SELECT`, separated by commas.
- Columns appear in the result in the order you list them.
- `AS` renames a column in the result only; the table does not change.
- `DISTINCT` removes repeated rows from the result.
- `SELECT` chooses columns, not rows: every row is still returned.
- A missing comma can silently turn a column name into an alias, so check the headings of your result.
