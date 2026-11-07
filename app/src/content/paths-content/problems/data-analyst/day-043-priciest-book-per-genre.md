---
id: da-day-043
title: The most expensive book in each genre
order: 43
difficulty: advanced
topic: Window functions
summary: Keep the top row of each group by filtering on a window result.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Keep the top row per group
prerequisites:
  - Day 38
---

## Task

For a "premium picks" shelf, return the single most expensive book in each genre: `genre`, `title` and `price`. Row order does not matter.

## Starter query

```sql
SELECT genre, title, price,
  ROW_NUMBER() OVER (PARTITION BY genre ORDER BY price DESC) AS position
FROM books;
```

## Hints

1. The starter query numbers books by price within each genre. You want the rows numbered 1.
2. A window function cannot be used in `WHERE` in the same query, because `WHERE` runs first.
3. Put the starter query in a CTE called `ranked`, then `SELECT genre, title, price FROM ranked WHERE position = 1`.

## Solution

```sql
WITH ranked AS (
  SELECT genre, title, price,
    ROW_NUMBER() OVER (PARTITION BY genre ORDER BY price DESC) AS position
  FROM books
)
SELECT genre, title, price
FROM ranked
WHERE position = 1;
```

## Expected result

| genre | title | price |
| --- | --- | --- |
| Fantasy | Rivers of Glass | 15.5 |
| Mystery | A Quiet Ledger | 14.75 |
| Science | Counting Stars | 9.99 |
| Science fiction | The Last Signal | 18 |

## Explanation

"Top N per group" is a two-step pattern: number the rows in a CTE, then filter the numbers. `MAX(price)` with `GROUP BY` finds the highest price but cannot tell you which title has it.

## Other accepted answers

```sql
SELECT b.genre, b.title, b.price FROM books AS b WHERE b.price = (SELECT MAX(price) FROM books AS g WHERE g.genre = b.genre);
```
