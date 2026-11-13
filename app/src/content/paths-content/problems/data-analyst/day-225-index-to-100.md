---
id: da-day-225
title: Rebase revenue to 100 at each product's start
order: 225
difficulty: intermediate
topic: Window functions
summary: Index every product's revenue to its own first month so growth can be compared on one scale.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Rebase a series with FIRST_VALUE
  - Compare growth on a common scale
prerequisites:
  - Day 221
  - Day 44
---

## Task

Products of very different sizes (starter query) are hard to compare on one chart. Rebase each one so its **first month** with revenue is 100: `index = 100 × revenue / first_month_revenue`. Products launched later start at 100 in their own first month.

Return `product`, `month`, `revenue` and `revenue_index` (rounded to 1 decimal place). Sort by `product`, then `month`.

## Starter query

```sql
WITH monthly(product, month, revenue) AS (
  VALUES
    ('Atlas', '2025-01', 400), ('Atlas', '2025-02', 440), ('Atlas', '2025-03', 380), ('Atlas', '2025-04', 500),
    ('Beacon', '2025-01', 120), ('Beacon', '2025-02', 150), ('Beacon', '2025-03', 210), ('Beacon', '2025-04', 240),
    ('Comet', '2025-03', 90), ('Comet', '2025-04', 135)
)
SELECT product, month, revenue
FROM monthly
ORDER BY product, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `FIRST_VALUE(revenue) OVER (PARTITION BY product ORDER BY month)` is each product's first month's revenue, on every row.
3. Divide with `100.0 *` so the result is not integer division.

## Solution

```sql
WITH monthly(product, month, revenue) AS (
  VALUES
    ('Atlas', '2025-01', 400), ('Atlas', '2025-02', 440), ('Atlas', '2025-03', 380), ('Atlas', '2025-04', 500),
    ('Beacon', '2025-01', 120), ('Beacon', '2025-02', 150), ('Beacon', '2025-03', 210), ('Beacon', '2025-04', 240),
    ('Comet', '2025-03', 90), ('Comet', '2025-04', 135)
)
SELECT product, month, revenue,
  ROUND(100.0 * revenue / FIRST_VALUE(revenue) OVER (PARTITION BY product ORDER BY month), 1) AS revenue_index
FROM monthly
ORDER BY product, month;
```

## Expected result

| product | month | revenue | revenue_index |
| --- | --- | --- | --- |
| Atlas | 2025-01 | 400 | 100 |
| Atlas | 2025-02 | 440 | 110 |
| Atlas | 2025-03 | 380 | 95 |
| Atlas | 2025-04 | 500 | 125 |
| Beacon | 2025-01 | 120 | 100 |
| Beacon | 2025-02 | 150 | 125 |
| Beacon | 2025-03 | 210 | 175 |
| Beacon | 2025-04 | 240 | 200 |
| Comet | 2025-03 | 90 | 100 |
| Comet | 2025-04 | 135 | 150 |

## Explanation

Revenue figures of 400 and 90 cannot share a chart axis in a useful way, but indexed figures can: each product starts at 100, and every later month shows its growth from there. `FIRST_VALUE(revenue) OVER (PARTITION BY product ORDER BY month)` puts each product's own starting revenue on every one of its rows.

Atlas is the biggest product but the slowest grower (125 by April). Beacon doubled (200), and Comet, launched only in March, starts at 100 in its own first month and reaches 150 a month later, the fastest growth even though it is the smallest. The partition matters: each product needs its own baseline.

**Common mistake:** leaving out `PARTITION BY product`. Every product is then divided by Atlas's January revenue, which is not an index at all.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly(product, month, revenue) AS ( VALUES ('Atlas', '2025-01', 400), ('Atlas', '2025-02', 440), ('Atlas', '2025-03', 380), ('Atlas', '2025-04', 500), ('Beacon', '2025-01', 120), ('Beacon', '2025-02', 150), ('Beacon', '2025-03', 210), ('Beacon', '2025-04', 240), ('Comet', '2025-03', 90), ('Comet', '2025-04', 135) ) SELECT product, month, revenue, ROUND(100.0 * revenue / FIRST_VALUE(revenue) OVER (ORDER BY month), 1) AS revenue_index FROM monthly ORDER BY product, month;
```
