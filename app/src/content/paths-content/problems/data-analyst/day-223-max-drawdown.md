---
id: da-day-223
title: The worst fall from a peak
order: 223
difficulty: advanced
topic: Window functions
summary: Track the running peak of a value and find its deepest drawdown, with the peak it fell from.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Track a running maximum
  - Find the deepest drawdown
prerequisites:
  - Day 121
  - Day 190
---

## Task

A portfolio's daily value is in the starter query. Its **drawdown** on a day is how far it sits below the highest value reached so far: `(value / running_peak − 1) × 100`. Find the **maximum drawdown**, the deepest one.

Return one row: `peak_day` (the day the running peak was set), `peak_value`, `trough_day`, `trough_value` and `drawdown_pct` (rounded to 1 decimal place). If two days tie for the deepest drawdown, take the earlier one.

## Starter query

```sql
WITH portfolio(day, value) AS (
  VALUES
    ('2025-03-03', 100.0), ('2025-03-04', 104.0), ('2025-03-05', 110.0), ('2025-03-06', 99.0), ('2025-03-07', 93.5),
    ('2025-03-10', 97.0), ('2025-03-11', 115.0), ('2025-03-12', 108.0), ('2025-03-13', 112.0), ('2025-03-14', 120.0)
)
SELECT day, value
FROM portfolio
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Running peak: `MAX(value) OVER (ORDER BY day)` (the default frame ends at the current row, which is what you want here).
3. Pick the trough with `ORDER BY drawdown, day LIMIT 1`. Its peak day is the latest day on or before the trough whose value equals that peak: `(SELECT MAX(day) FROM portfolio WHERE day <= trough_day AND value = peak)`.

## Solution

```sql
WITH portfolio(day, value) AS (
  VALUES
    ('2025-03-03', 100.0), ('2025-03-04', 104.0), ('2025-03-05', 110.0), ('2025-03-06', 99.0), ('2025-03-07', 93.5),
    ('2025-03-10', 97.0), ('2025-03-11', 115.0), ('2025-03-12', 108.0), ('2025-03-13', 112.0), ('2025-03-14', 120.0)
),
peaks AS (
  SELECT day, value, MAX(value) OVER (ORDER BY day) AS running_peak FROM portfolio
),
trough AS (
  SELECT day, value, running_peak, 100 * (value / running_peak - 1) AS drawdown
  FROM peaks
  ORDER BY drawdown, day
  LIMIT 1
)
SELECT (SELECT MAX(p.day) FROM portfolio AS p WHERE p.day <= t.day AND p.value = t.running_peak) AS peak_day,
  t.running_peak AS peak_value, t.day AS trough_day, t.value AS trough_value, ROUND(t.drawdown, 1) AS drawdown_pct
FROM trough AS t;
```

## Expected result

| peak_day | peak_value | trough_day | trough_value | drawdown_pct |
| --- | --- | --- | --- | --- |
| 2025-03-05 | 110 | 2025-03-07 | 93.5 | -15 |

## Explanation

Drawdown measures pain rather than performance: how far a value has fallen from the best level it had reached. The running peak is a window `MAX` with the default frame, which ends at the current row, so each day sees only the past.

The portfolio peaked at 110 on 5 March and fell to 93.5 on 7 March, a drawdown of 15%. It later recovered and set new highs (115, then 120), and the dip to 108 on 12 March is only 6.1% below its peak of 115. Taking the overall maximum (120) and minimum (93.5) would compare a low that came **before** the high, which no investor experienced; the peak has to come from on or before the trough day.

**Common mistake:** comparing the all-time minimum with the all-time maximum. The 22.1% "drawdown" mixes a low with a later high and overstates the real loss.

## Wrong answers

Feedback: incorrect-output

```sql
WITH portfolio(day, value) AS ( VALUES ('2025-03-03', 100.0), ('2025-03-04', 104.0), ('2025-03-05', 110.0), ('2025-03-06', 99.0), ('2025-03-07', 93.5), ('2025-03-10', 97.0), ('2025-03-11', 115.0), ('2025-03-12', 108.0), ('2025-03-13', 112.0), ('2025-03-14', 120.0) ) SELECT (SELECT day FROM portfolio ORDER BY value DESC LIMIT 1) AS peak_day, MAX(value) AS peak_value, (SELECT day FROM portfolio ORDER BY value LIMIT 1) AS trough_day, MIN(value) AS trough_value, ROUND(100 * (MIN(value) / MAX(value) - 1), 1) AS drawdown_pct FROM portfolio;
```
