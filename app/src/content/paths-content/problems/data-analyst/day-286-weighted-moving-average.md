---
id: da-day-286
title: A weighted moving average
order: 286
difficulty: intermediate
topic: Statistics
summary: Smooth weekly sales with weights 3, 2 and 1 so recent weeks count more, and compare with a simple average.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Weight recent values more
  - Use LAG with an offset
prerequisites:
  - Day 63
  - Day 187
---

## Task

Smooth weekly sales (starter query) with a **three-week weighted moving average** that gives the current week weight 3, the previous week 2 and the week before that 1: `(3 × this + 2 × last + 1 × the one before) / 6`. Also return the plain three-week average for comparison. Both start from week 3.

Return `week`, `units`, `wma_3` and `sma_3` (rounded to 1 decimal place; `NULL` for weeks 1 and 2). Sort by `week`.

## Starter query

```sql
WITH weekly_sales(week, units) AS (
  VALUES (1, 120), (2, 135), (3, 128), (4, 150), (5, 162), (6, 140), (7, 175), (8, 190)
)
SELECT week, units
FROM weekly_sales
ORDER BY week;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `LAG(units, 1)` and `LAG(units, 2)` (ordered by week) are the previous two weeks; they are `NULL` for the first rows, which makes the formula `NULL` there too.
3. The plain average is `(units + lag1 + lag2) / 3.0`, or `AVG(units) OVER (ORDER BY week ROWS 2 PRECEDING)` restricted to week 3 onwards.

## Solution

```sql
WITH weekly_sales(week, units) AS (
  VALUES (1, 120), (2, 135), (3, 128), (4, 150), (5, 162), (6, 140), (7, 175), (8, 190)
),
lagged AS (
  SELECT week, units, LAG(units, 1) OVER (ORDER BY week) AS lag1, LAG(units, 2) OVER (ORDER BY week) AS lag2 FROM weekly_sales
)
SELECT week, units,
  ROUND((3 * units + 2 * lag1 + lag2) / 6.0, 1) AS wma_3,
  ROUND((units + lag1 + lag2) / 3.0, 1) AS sma_3
FROM lagged
ORDER BY week;
```

## Expected result

| week | units | wma_3 | sma_3 |
| --- | --- | --- | --- |
| 1 | 120 | NULL | NULL |
| 2 | 135 | NULL | NULL |
| 3 | 128 | 129 | 127.7 |
| 4 | 150 | 140.2 | 137.7 |
| 5 | 162 | 152.3 | 146.7 |
| 6 | 140 | 149 | 150.7 |
| 7 | 175 | 161.2 | 159 |
| 8 | 190 | 176.7 | 168.3 |

## Explanation

A weighted moving average reacts faster than a simple one because it gives the most recent week the largest weight. In week 6 sales dipped to 140: the weighted average falls from 152.3 to 149, while the simple average keeps rising to 150.7 because it still gives week 4's and week 5's higher values equal weight. In week 8 the weighted average (176.7) is already close to the latest sales of 190.

`LAG(units, 1)` and `LAG(units, 2)` fetch the two previous weeks, and because they are `NULL` in the first two rows, the formulas are `NULL` there too, which is the honest answer when there is not enough history.

**Common mistake:** reversing the weights (1 for this week, 3 for the oldest). The average then lags even further behind the trend than the simple one.

## Wrong answers

Feedback: incorrect-output

```sql
WITH weekly_sales(week, units) AS ( VALUES (1, 120), (2, 135), (3, 128), (4, 150), (5, 162), (6, 140), (7, 175), (8, 190) ), lagged AS (SELECT week, units, LAG(units, 1) OVER (ORDER BY week) AS lag1, LAG(units, 2) OVER (ORDER BY week) AS lag2 FROM weekly_sales) SELECT week, units, ROUND((units + 2 * lag1 + 3 * lag2) / 6.0, 1) AS wma_3, ROUND((units + lag1 + lag2) / 3.0, 1) AS sma_3 FROM lagged ORDER BY week;
```
