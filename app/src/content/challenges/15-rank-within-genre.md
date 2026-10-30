---
id: rank-within-genre
title: Rank books within their genre
order: 15
difficulty: advanced
topic: Window functions
summary: Use RANK() OVER (PARTITION BY ...) to rank each book by price inside its own genre.
duration: 15
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate a value per row from a group of rows with a window function
  - Restart the calculation for each group with PARTITION BY
prerequisites:
  - ORDER BY from the SQL fundamentals module
  - GROUP BY (see the challenge "Count the books in each genre")
  - Window functions, explained in the task below
---

## Task

For every book, return its position by price **within its own genre**, using four columns:

- `title`
- `genre`
- `price`
- `price_rank`: 1 for the most expensive book in the genre, 2 for the next, and so on

Sort the result by `genre` (A to Z), then by `price_rank`. Row order matters.

**Before you start:** a window function calculates a value for each row from a set of related rows, without combining the rows the way `GROUP BY` does. `RANK() OVER (PARTITION BY column ORDER BY other_column DESC)` numbers the rows of each partition in that order, starting again at 1 for every partition.

```sql syntax
SELECT column_name,
       RANK() OVER (PARTITION BY group_column ORDER BY sort_column DESC) AS new_name
FROM table_name;
```

## Starter query

```sql
SELECT title, genre, price
FROM books
ORDER BY genre;
```

## Hints

1. Add a fourth column to the starter query: a window function named `price_rank`.
2. The ranking restarts for each genre, so partition by `genre`; the most expensive comes first, so order the window by `price DESC`.
3. Add `RANK() OVER (PARTITION BY genre ORDER BY price DESC) AS price_rank`, and sort the result with `ORDER BY genre, price_rank`.

## Solution

```sql
SELECT
  title,
  genre,
  price,
  RANK() OVER (PARTITION BY genre ORDER BY price DESC) AS price_rank
FROM books
ORDER BY genre, price_rank;
```

## Expected result

| title | genre | price | price_rank |
| --- | --- | --- | --- |
| Rivers of Glass | Fantasy | 15.5 | 1 |
| Paper Lanterns | Fantasy | 11.25 | 2 |
| A Quiet Ledger | Mystery | 14.75 | 1 |
| The Silent Orchard | Mystery | 12.99 | 2 |
| Counting Stars | Science | 9.99 | 1 |
| The Last Signal | Science fiction | 18 | 1 |

## Explanation

`PARTITION BY genre` splits the books into one window per genre, and `ORDER BY price DESC` inside `OVER (...)` decides the ranking order within each window. Unlike `GROUP BY`, every book stays in the result as its own row.

The `ORDER BY` at the end of the query is separate: it sorts the final result. `RANK()` gives tied prices the same rank; `ROW_NUMBER()` would number them 1, 2 regardless. No prices are tied within a genre here, so both give the same answer.

## Other accepted answers

```sql
SELECT title, genre, price, ROW_NUMBER() OVER (PARTITION BY genre ORDER BY price DESC) AS price_rank FROM books ORDER BY genre, price_rank;
```

```sql
SELECT b.title, b.genre, b.price,
  (SELECT COUNT(*) FROM books AS other WHERE other.genre = b.genre AND other.price > b.price) + 1 AS price_rank
FROM books AS b
ORDER BY b.genre, price_rank;
```

## Wrong answers

Feedback: incorrect-output

```sql
SELECT title, genre, price, RANK() OVER (ORDER BY price DESC) AS price_rank FROM books ORDER BY genre, price_rank;
```

Feedback: incorrect-output

```sql
SELECT title, genre, price, RANK() OVER (PARTITION BY genre ORDER BY price) AS price_rank FROM books ORDER BY genre, price_rank;
```
