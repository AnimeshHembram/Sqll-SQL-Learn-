---
id: da-price-vs-most-expensive
title: Each price as a share of the most expensive
order: 2
difficulty: intermediate
topic: Aggregate windows
summary: Use MAX() OVER () to compare every row with the whole table.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Compare each row with a whole-table aggregate
---

## Task

Return `title`, `price`, `max_price` (the highest price of any book) and `pct_of_max` (the book's price as a percentage of `max_price`, rounded to 1 decimal place). Row order does not matter.

**Steps**

1. `MAX(price) OVER ()` puts the highest price on every row. The empty brackets make all rows one window.
2. Use the same expression in the percentage: `100.0 * price / MAX(price) OVER ()`.
3. Round the percentage to 1 decimal place.

## Starter query

```sql
SELECT title, price
FROM books;
```

## Hints

1. `MAX(price)` with `GROUP BY` would collapse the rows; `MAX(price) OVER ()` keeps them.
2. Write `100.0` so the division keeps decimals.
3. `MAX(price) OVER () AS max_price, ROUND(100.0 * price / MAX(price) OVER (), 1) AS pct_of_max`

## Solution

```sql
SELECT title, price,
  MAX(price) OVER () AS max_price,
  ROUND(100.0 * price / MAX(price) OVER (), 1) AS pct_of_max
FROM books;
```

## Expected result

| title | price | max_price | pct_of_max |
| --- | --- | --- | --- |
| The Silent Orchard | 12.99 | 18 | 72.2 |
| Rivers of Glass | 15.5 | 18 | 86.1 |
| Counting Stars | 9.99 | 18 | 55.5 |
| The Last Signal | 18 | 18 | 100 |
| Paper Lanterns | 11.25 | 18 | 62.5 |
| A Quiet Ledger | 14.75 | 18 | 81.9 |

## Explanation

*The Last Signal* (18.00) is 100% and *Counting Stars* costs 55.5% of it. A subquery `(SELECT MAX(price) FROM books)` would give the same result; the window form keeps the comparison in one place and extends naturally to `PARTITION BY` when you need the maximum per group.

## Other accepted answers

```sql
SELECT title, price, (SELECT MAX(price) FROM books) AS max_price, ROUND(100.0 * price / (SELECT MAX(price) FROM books), 1) AS pct_of_max FROM books;
```

## Wrong answers

Feedback: missing-rows

```sql
SELECT title, price, MAX(price) AS max_price, ROUND(100.0 * price / MAX(price), 1) AS pct_of_max FROM books;
```
