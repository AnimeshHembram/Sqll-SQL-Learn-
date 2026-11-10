---
id: da-day-062
title: Split the catalogue into price tiers
order: 62
difficulty: intermediate
topic: Window functions
summary: Divide rows into equal-sized groups with NTILE.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - books
orderMatters: true
checkColumnNames: true
objectives:
  - Split rows into equal groups with NTILE
prerequisites:
  - Day 38
---

## Task

Pricing wants three equal tiers. Return `title`, `price` and `tier`: 1 for the cheapest third of books, 2 for the middle third and 3 for the most expensive third, using `NTILE(3)`. Sort by `price`.

## Starter query

```sql
SELECT title, price
FROM books
ORDER BY price;
```

## Hints

1. `NTILE(n) OVER (ORDER BY ...)` splits the ordered rows into `n` groups of (nearly) equal size, numbered 1 to n.
2. Order the window by price from cheapest to most expensive.
3. `NTILE(3) OVER (ORDER BY price) AS tier`

## Solution

```sql
SELECT title, price, NTILE(3) OVER (ORDER BY price) AS tier
FROM books
ORDER BY price;
```

## Expected result

| title | price | tier |
| --- | --- | --- |
| Counting Stars | 9.99 | 1 |
| Paper Lanterns | 11.25 | 1 |
| The Silent Orchard | 12.99 | 2 |
| A Quiet Ledger | 14.75 | 2 |
| Rivers of Glass | 15.5 | 3 |
| The Last Signal | 18 | 3 |

## Explanation

Six books in three tiers gives two books per tier. `NTILE` balances the count of rows, not the price range, so tiers based on fixed price limits (as with `CASE`) and tiers based on `NTILE` answer different questions.
