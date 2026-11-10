---
id: da-day-066
title: Each book's price percentile
order: 66
difficulty: advanced
topic: Window functions
summary: Place each row on a 0-to-1 scale with PERCENT_RANK.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Express position as a percentile
prerequisites:
  - Day 62
---

## Task

Return `title`, `price` and `price_percentile`: where the price sits among all books from 0 (cheapest) to 1 (most expensive), using `PERCENT_RANK()` and rounded to 2 decimal places. Sort by `price`.

## Starter query

```sql
SELECT title, price
FROM books
ORDER BY price;
```

## Hints

1. `PERCENT_RANK()` returns (rank − 1) ÷ (rows − 1): 0 for the first row and 1 for the last.
2. Order the window by price.
3. `ROUND(PERCENT_RANK() OVER (ORDER BY price), 2) AS price_percentile`

## Solution

```sql
SELECT title, price, ROUND(PERCENT_RANK() OVER (ORDER BY price), 2) AS price_percentile
FROM books
ORDER BY price;
```

## Expected result

| title | price | price_percentile |
| --- | --- | --- |
| Counting Stars | 9.99 | 0 |
| Paper Lanterns | 11.25 | 0.2 |
| The Silent Orchard | 12.99 | 0.4 |
| A Quiet Ledger | 14.75 | 0.6 |
| Rivers of Glass | 15.5 | 0.8 |
| The Last Signal | 18 | 1 |

## Explanation

With six books the steps are 0, 0.2, 0.4, 0.6, 0.8 and 1. Percentiles let you compare positions across groups of different sizes, which raw ranks cannot.
