---
id: three-newest
title: The three newest books
order: 4
difficulty: beginner
topic: LIMIT
summary: Sort by publication year and keep only the first three rows.
module: sql-fundamentals
duration: 4
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: false
objectives:
  - Sort rows from newest to oldest
  - Keep only the first rows with LIMIT
prerequisites:
  - The lessons "Sorting data with ORDER BY" and "Limiting results with LIMIT"
---

## Task

The home page shows the **three most recently published** books. Return the title and publication year of those three books, newest first.

The result should have two columns: the title, then the year. Row order matters.

## Starter query

```sql
SELECT title, year
FROM books;
```

## Hints

1. First sort the books so the newest come first, then keep only the top of the list.
2. Newest first means `ORDER BY year DESC`.
3. `LIMIT 3` goes at the very end of the query, after `ORDER BY`.

## Solution

```sql
SELECT title, year
FROM books
ORDER BY year DESC
LIMIT 3;
```

## Expected result

| title | year |
| --- | --- |
| The Last Signal | 2023 |
| Rivers of Glass | 2021 |
| A Quiet Ledger | 2020 |

## Explanation

`LIMIT` is applied after `ORDER BY`, so the query first sorts every book from newest to oldest and then keeps the first three rows. Without `ORDER BY`, `LIMIT 3` would return three books in no guaranteed order.

## Wrong answers

Feedback: extra-rows

```sql
SELECT title, year FROM books ORDER BY year DESC;
```

Feedback: incorrect-output

```sql
SELECT title, year FROM books ORDER BY year LIMIT 3;
```
