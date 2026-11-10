---
id: da-day-064
title: Compare each book with the cheapest in its genre
order: 64
difficulty: advanced
topic: Window functions
summary: Pull a value from the first row of each partition with FIRST_VALUE.
module: data-analyst
duration: 9
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Read a value from the first row of a partition
prerequisites:
  - Day 43
  - Day 42
---

## Task

For each book, return `title`, `genre`, `price`, `cheapest_title` (the cheapest book in the same genre) and `extra_cost` (how much more this book costs than that one, rounded to 2 decimal places). Sort by `genre`, then `price`.

## Starter query

```sql
SELECT title, genre, price
FROM books
ORDER BY genre, price;
```

## Hints

1. `FIRST_VALUE(column) OVER (PARTITION BY ... ORDER BY ...)` returns the value from the first row of each partition.
2. Order each genre by price so the first row is the cheapest: `FIRST_VALUE(title) OVER (PARTITION BY genre ORDER BY price)`.
3. For the price gap use `price - MIN(price) OVER (PARTITION BY genre)`, rounded.

## Solution

```sql
SELECT title, genre, price,
  FIRST_VALUE(title) OVER (PARTITION BY genre ORDER BY price) AS cheapest_title,
  ROUND(price - MIN(price) OVER (PARTITION BY genre), 2) AS extra_cost
FROM books
ORDER BY genre, price;
```

## Expected result

| title | genre | price | cheapest_title | extra_cost |
| --- | --- | --- | --- | --- |
| Paper Lanterns | Fantasy | 11.25 | Paper Lanterns | 0 |
| Rivers of Glass | Fantasy | 15.5 | Paper Lanterns | 4.25 |
| The Silent Orchard | Mystery | 12.99 | The Silent Orchard | 0 |
| A Quiet Ledger | Mystery | 14.75 | The Silent Orchard | 1.76 |
| Counting Stars | Science | 9.99 | Counting Stars | 0 |
| The Last Signal | Science fiction | 18 | The Last Signal | 0 |

## Explanation

`FIRST_VALUE` can return any column of the first row, which `MIN` alone cannot: `MIN` gives the lowest price but not which title has it. *A Quiet Ledger* costs 1.76 more than *The Silent Orchard*; books alone in their genre are their own cheapest.
