---
id: limiting-results
title: Limiting results with LIMIT
module: sql-fundamentals
order: 5
level: beginner
duration: 8
summary: Return only the first few rows of a sorted result, and skip rows with OFFSET.
objectives:
  - Return a fixed number of rows with LIMIT
  - Combine LIMIT with ORDER BY to answer "top N" questions
  - Skip rows with OFFSET
---

Tables in real databases can hold millions of rows. `LIMIT` sets the **maximum number of rows** in the result. Combined with `ORDER BY`, it answers questions such as "what are the three most expensive books?".

## Syntax

```sql syntax
SELECT column1, column2 FROM table_name ORDER BY column1 LIMIT row_count OFFSET rows_to_skip;
```

- `LIMIT row_count` returns at most that many rows.
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

### Skip rows with OFFSET

`OFFSET` is how results are split into pages. The 3rd and 4th most expensive books:

```sql
SELECT title, price FROM books ORDER BY price DESC LIMIT 2 OFFSET 2;
```

| title | price |
| --- | --- |
| A Quiet Ledger | 14.75 |
| The Silent Orchard | 12.99 |

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

A query can span several lines. Putting each clause on its own line makes longer queries much easier to read.

## How the query runs

The clauses are **written** in one order but **processed** in another. For the last example:

1. `FROM books` picks the table: 6 rows.
2. `WHERE price < 15` keeps 4 rows.
3. `SELECT title, author, price` keeps three columns.
4. `ORDER BY price DESC` sorts those 4 rows, most expensive first.
5. `LIMIT 3` keeps the first 3 rows of the sorted result.

Because `LIMIT` is applied last, after sorting, `ORDER BY ... LIMIT` reliably gives you the top rows.

> This is the *logical* order: it describes what the result will be. A database may do the work in a cleverer way internally, but the result is always the same as if it had followed these steps.

## Common mistakes

**Using LIMIT without ORDER BY.** This query runs, but which two books it returns is not guaranteed:

```sql
SELECT title FROM books LIMIT 2;
```

Without `ORDER BY`, "the first two rows" has no defined meaning. Whenever the choice of rows matters, sort first.

**Putting LIMIT before ORDER BY.**

```sql error
SELECT title FROM books LIMIT 3 ORDER BY price;
```

This causes a syntax error. `LIMIT` always comes last.

**Using another database's keyword.** Microsoft SQL Server uses `TOP` instead of `LIMIT`. SQLite, MySQL and PostgreSQL do not understand it:

```sql error
SELECT TOP 3 title FROM books;
```

In SQLite, write `SELECT title FROM books LIMIT 3;` instead.

## Key takeaways

- `LIMIT n` returns at most `n` rows; `OFFSET m` skips the first `m`.
- Use `ORDER BY` with `LIMIT` so you know which rows you get.
- Clauses are written as `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `LIMIT`.
- They are processed as `FROM`, `WHERE`, `SELECT`, `ORDER BY`, `LIMIT`.
- You can now write a complete query that reads, filters, sorts and limits data from one table.
