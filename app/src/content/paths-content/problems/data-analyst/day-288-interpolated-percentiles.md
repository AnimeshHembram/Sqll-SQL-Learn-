---
id: da-day-288
title: Percentiles with linear interpolation
order: 288
difficulty: advanced
topic: Statistics
summary: Compute the 25th, 50th, 75th and 90th percentiles of order value the way spreadsheets do.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Interpolate between ranked values
  - Reproduce spreadsheet percentiles in SQL
prerequisites:
  - Day 234
  - Day 151
---

## Task

Spreadsheet `PERCENTILE` functions interpolate between values. For a percentile `p` over `n` sorted values, the position is `1 + p × (n − 1)` (counting from 1); when it falls between two values, take the value at the lower position plus the fraction of the way to the next value.

For the order values in the starter query, return one row per percentile `p` in 0.25, 0.5, 0.75 and 0.9: `percentile` (as 25, 50, 75, 90), `position` (rounded to 2 decimal places) and `value` (rounded to 2 decimal places). Sort by `percentile`.

## Starter query

```sql
WITH orders(id, order_value) AS (
  VALUES (1, 120), (2, 340), (3, 560), (4, 210), (5, 980), (6, 450), (7, 300), (8, 760), (9, 150), (10, 610)
)
SELECT id, order_value
FROM orders
ORDER BY order_value;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Add the four percentiles as `VALUES`.
2. Number the sorted values with `ROW_NUMBER() OVER (ORDER BY order_value)`. For each `p`, `pos = 1 + p * (n - 1)`; the lower position is `CAST(pos AS INTEGER)` and the fraction is `pos - lower`.
3. Join each percentile to the rows at `lower` and `lower + 1` (`LEFT JOIN` for the second, in case `pos` is exactly the last row) and compute `lo + fraction * (COALESCE(hi, lo) - lo)`.

## Solution

```sql
WITH orders(id, order_value) AS (
  VALUES (1, 120), (2, 340), (3, 560), (4, 210), (5, 980), (6, 450), (7, 300), (8, 760), (9, 150), (10, 610)
),
ps(p) AS (
  VALUES (0.25), (0.5), (0.75), (0.9)
),
ranked AS (
  SELECT order_value, ROW_NUMBER() OVER (ORDER BY order_value) AS rn FROM orders
),
positions AS (
  SELECT p, 1 + p * ((SELECT COUNT(*) FROM orders) - 1) AS pos FROM ps
)
SELECT CAST(ROUND(p.p * 100) AS INTEGER) AS percentile, ROUND(p.pos, 2) AS position,
  ROUND(lo.order_value + (p.pos - CAST(p.pos AS INTEGER)) * (COALESCE(hi.order_value, lo.order_value) - lo.order_value), 2) AS value
FROM positions AS p
JOIN ranked AS lo ON lo.rn = CAST(p.pos AS INTEGER)
LEFT JOIN ranked AS hi ON hi.rn = CAST(p.pos AS INTEGER) + 1
ORDER BY percentile;
```

## Expected result

| percentile | position | value |
| --- | --- | --- |
| 25 | 3.25 | 232.5 |
| 50 | 5.5 | 395 |
| 75 | 7.75 | 597.5 |
| 90 | 9.1 | 782 |

## Explanation

Percentiles of a small sample depend on the method. Spreadsheet `PERCENTILE` interpolates: with 10 values, the median sits at position 5.5, halfway between the 5th value (340) and the 6th (450), so it is 395. The 90th percentile sits at position 9.1, a tenth of the way from 760 to 980: 782.

In SQL, number the sorted values, compute each position, and join to the values just below and just above it; the fraction of the position decides how far to move between them. The `LEFT JOIN` for the upper value handles a percentile that lands exactly on the last row. Nearest-rank percentiles (Day 234) would instead pick an actual value, which is often preferred for operational targets.

**Common mistake:** taking the value at the lower position without interpolating. Every percentile falls back to an observed value (210, 340, 560, 760), and the median is reported 55 too low.

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders(id, order_value) AS ( VALUES (1, 120), (2, 340), (3, 560), (4, 210), (5, 980), (6, 450), (7, 300), (8, 760), (9, 150), (10, 610) ), ps(p) AS (VALUES (0.25), (0.5), (0.75), (0.9)), ranked AS (SELECT order_value, ROW_NUMBER() OVER (ORDER BY order_value) AS rn FROM orders), positions AS (SELECT p, 1 + p * ((SELECT COUNT(*) FROM orders) - 1) AS pos FROM ps) SELECT CAST(ROUND(p.p * 100) AS INTEGER) AS percentile, ROUND(p.pos, 2) AS position, ROUND(lo.order_value, 2) AS value FROM positions AS p JOIN ranked AS lo ON lo.rn = CAST(p.pos AS INTEGER) ORDER BY percentile;
```
