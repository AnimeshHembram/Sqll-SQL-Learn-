---
id: limiting-results
title: Limiting results with LIMIT
module: sql-fundamentals
order: 5
level: beginner
duration: 12
summary: Return only the first few rows of a sorted result, and skip rows with OFFSET.
objectives:
  - Return a fixed number of rows with LIMIT
  - Combine LIMIT with ORDER BY to answer "top N" questions
  - Skip rows with OFFSET to show results page by page
  - Write a complete query using every clause in this module
---

Real tables can hold millions of rows, and you rarely want them all. `LIMIT` sets the **maximum number of rows** in the result. Together with `ORDER BY`, it answers questions such as "what are the three most expensive books?".

## The big idea

Think of a "Top 3 bestsellers" list in a shop window. To make it, you:

1. **Sort** all the books from best-selling to worst.
2. **Take the first three** and ignore the rest.

`ORDER BY` does step 1 and `LIMIT` does step 2. And when a website shows search results "10 per page", page 2 means **skip the first 10, then take the next 10**. Skipping rows is what `OFFSET` does.

## Limiting, step by step

**Step 1.** Sort the rows so "first" means something: `SELECT title, price FROM books ORDER BY price DESC`

**Step 2.** Add `LIMIT` and how many rows you want: `... LIMIT 3`

**Step 3.** To skip some rows first, add `OFFSET` and how many to skip: `... LIMIT 2 OFFSET 2`

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name ORDER BY column1 LIMIT row_count OFFSET rows_to_skip;
```

- `LIMIT row_count` returns **at most** that many rows. If fewer rows exist, you get all of them.
- `OFFSET rows_to_skip` is optional. It skips rows before `LIMIT` starts counting.
- `LIMIT` goes at the very end of the query.

## Examples

### Top 3

The three most expensive books:

```sql
SELECT title, price FROM books ORDER BY price DESC LIMIT 3;
```

Expected output:

| title | price |
| --- | --- |
| The Last Signal | 18.00 |
| Rivers of Glass | 15.50 |
| A Quiet Ledger | 14.75 |

`ORDER BY price DESC` puts all 6 books in order from most to least expensive, and `LIMIT 3` keeps the first three.

### Skip rows with OFFSET

The 3rd and 4th most expensive books:

```sql
SELECT title, price FROM books ORDER BY price DESC LIMIT 2 OFFSET 2;
```

| title | price |
| --- | --- |
| A Quiet Ledger | 14.75 |
| The Silent Orchard | 12.99 |

`OFFSET 2` skips *The Last Signal* and *Rivers of Glass*, then `LIMIT 2` takes the next two.

### Everything together

A complete single-table query using every clause in this module:

```sql
SELECT title, author, price
FROM books
WHERE price < 15
ORDER BY price DESC
LIMIT 3;
```

| title | author | price |
| --- | --- | --- |
| A Quiet Ledger | Ana Ruiz | 14.75 |
| The Silent Orchard | Mira Das | 12.99 |
| Paper Lanterns | Ken Ito | 11.25 |

In plain words: "the three most expensive books that cost less than 15". A query can span several lines; putting each clause on its own line makes longer queries much easier to read.

## How the query runs

The clauses are **written** in one order but **processed** in another. For the last example:

| Step | Clause | What happens | Rows left |
| --- | --- | --- | --- |
| 1 | `FROM books` | pick the table | 6 |
| 2 | `WHERE price < 15` | keep the cheaper books | 4 |
| 3 | `SELECT title, author, price` | keep three columns | 4 |
| 4 | `ORDER BY price DESC` | sort, most expensive first | 4 |
| 5 | `LIMIT 3` | keep the first 3 | 3 |

Because `LIMIT` is applied last, after sorting, `ORDER BY ... LIMIT` reliably gives you the top rows.

> This is the *logical* order: it describes what the result will be. A database may do the work in a cleverer way internally, but the result is always the same as if it had followed these steps.

## Common mistakes

**Using LIMIT without ORDER BY.** This query runs, but which two books it returns is not guaranteed:

```sql
SELECT title FROM books LIMIT 2;
```

**Why it happens:** it feels natural to say "give me the first two", but without `ORDER BY`, "first" has no defined meaning. Whenever the choice of rows matters, sort first.

**Putting LIMIT before ORDER BY.**

```sql error
SELECT title FROM books LIMIT 3 ORDER BY price;
```

This causes a syntax error. `LIMIT` always comes last.

**Using another database's keyword.** Microsoft SQL Server uses `TOP` instead of `LIMIT`. SQLite, MySQL and PostgreSQL do not understand it:

```sql error
SELECT TOP 3 title FROM books;
```

**Why it happens:** SQL is a standard, but each database adds its own words, and examples found online may be written for a different one. In SQLite, write `SELECT title FROM books LIMIT 3;` instead.

## Try it yourself

Open the Practice space and try each task first, then compare with the answer below it.

**Task 1.** Show the title and price of the two cheapest books.

```sql
SELECT title, price FROM books ORDER BY price LIMIT 2;
```

| title | price |
| --- | --- |
| Counting Stars | 9.99 |
| Paper Lanterns | 11.25 |

**Task 2.** Which customer joined most recently? Show their name and join date.

```sql
SELECT name, joined FROM customers ORDER BY joined DESC LIMIT 1;
```

| name | joined |
| --- | --- |
| Meera Pillai | 2025-06-30 |

**Task 3.** A web page lists book titles alphabetically, 2 per page. Show page 2.

```sql
SELECT title FROM books ORDER BY title LIMIT 2 OFFSET 2;
```

| title |
| --- |
| Paper Lanterns |
| Rivers of Glass |

Page 1 holds the first 2 titles, so page 2 skips 2 and takes the next 2. In general, page *n* uses `OFFSET` (*n* − 1) × the page size.

## Key takeaways

- `LIMIT n` returns at most `n` rows; `OFFSET m` skips the first `m`.
- Use `ORDER BY` with `LIMIT` so you know which rows you get.
- Clauses are **written** as `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `LIMIT`.
- They are **processed** as `FROM`, `WHERE`, `SELECT`, `ORDER BY`, `LIMIT`.
- You can now write a complete query that reads, filters, sorts and limits data from one table. Next, the **Summarising data** module shows you how to count and total rows.
