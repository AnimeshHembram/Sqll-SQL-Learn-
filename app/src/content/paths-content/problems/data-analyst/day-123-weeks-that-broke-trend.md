---
id: da-day-123
title: Weeks that broke from the trend
order: 123
difficulty: advanced
topic: Window functions
summary: Compare each week with the average of the four weeks before it, and only when four weeks exist.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare a value with a trailing baseline that excludes it
  - Require a full window before judging
prerequisites:
  - Day 63
  - Day 107
---

## Task

Growth watches weekly sign-ups (in the starter query) against the **average of the previous four weeks** (not including the week itself). For each week, return `week_start`, `signups`, `trailing_avg` (rounded to 2 decimal places, `NULL` until four earlier weeks exist) and `flag`: `'spike'` above 1.5 times the trailing average, `'dip'` below 0.6 times it, `'normal'` otherwise, and `NULL` when there is no trailing average. Sort by `week_start`.

## Starter query

```sql
WITH weekly_signups(week_start, signups) AS (
  VALUES
    ('2025-01-06', 100), ('2025-01-13', 110), ('2025-01-20', 90), ('2025-01-27', 100), ('2025-02-03', 170),
    ('2025-02-10', 105), ('2025-02-17', 95), ('2025-02-24', 60), ('2025-03-03', 120), ('2025-03-10', 230)
)
SELECT week_start, signups
FROM weekly_signups
ORDER BY week_start;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. The frame for "the four weeks before" is `ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING`.
3. Count the rows in the same frame: only use the average when `COUNT(*) OVER (same window) = 4`, for example `CASE WHEN COUNT(*) OVER w = 4 THEN AVG(signups) OVER w END`. Then compare in an outer query.

## Solution

```sql
WITH weekly_signups(week_start, signups) AS (
  VALUES
    ('2025-01-06', 100), ('2025-01-13', 110), ('2025-01-20', 90), ('2025-01-27', 100), ('2025-02-03', 170),
    ('2025-02-10', 105), ('2025-02-17', 95), ('2025-02-24', 60), ('2025-03-03', 120), ('2025-03-10', 230)
),
trailing AS (
  SELECT week_start, signups,
    CASE WHEN COUNT(*) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING) = 4
      THEN AVG(signups) OVER (ORDER BY week_start ROWS BETWEEN 4 PRECEDING AND 1 PRECEDING)
    END AS trailing_avg
  FROM weekly_signups
)
SELECT week_start, signups, ROUND(trailing_avg, 2) AS trailing_avg,
  CASE
    WHEN trailing_avg IS NULL THEN NULL
    WHEN signups > 1.5 * trailing_avg THEN 'spike'
    WHEN signups < 0.6 * trailing_avg THEN 'dip'
    ELSE 'normal'
  END AS flag
FROM trailing
ORDER BY week_start;
```

## Expected result

| week_start | signups | trailing_avg | flag |
| --- | --- | --- | --- |
| 2025-01-06 | 100 | NULL | NULL |
| 2025-01-13 | 110 | NULL | NULL |
| 2025-01-20 | 90 | NULL | NULL |
| 2025-01-27 | 100 | NULL | NULL |
| 2025-02-03 | 170 | 100 | spike |
| 2025-02-10 | 105 | 117.5 | normal |
| 2025-02-17 | 95 | 116.25 | normal |
| 2025-02-24 | 60 | 117.5 | dip |
| 2025-03-03 | 120 | 107.5 | normal |
| 2025-03-10 | 230 | 95 | spike |

## Explanation

Excluding the current week matters: a spike included in its own baseline raises the baseline and hides itself. Requiring four earlier weeks avoids judging week 2 against a single week of history.

Week 5's 170 is 1.7 times its baseline of 100. Week 8's 60 is below 0.6 × 117.5 = 70.5. Week 10's baseline is weeks 6 to 9, which include week 8's dip, so its average falls to 95 and 230 is a clear spike.

**Common mistake:** `ROWS BETWEEN 4 PRECEDING AND CURRENT ROW` (or a frame with no count check), which averages the week with itself or flags the first weeks against too little history.

## Wrong answers

Feedback: incorrect-output

```sql
WITH weekly_signups(week_start, signups) AS ( VALUES ('2025-01-06', 100), ('2025-01-13', 110), ('2025-01-20', 90), ('2025-01-27', 100), ('2025-02-03', 170), ('2025-02-10', 105), ('2025-02-17', 95), ('2025-02-24', 60), ('2025-03-03', 120), ('2025-03-10', 230) ), trailing AS (SELECT week_start, signups, CASE WHEN COUNT(*) OVER (ORDER BY week_start ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) = 4 THEN AVG(signups) OVER (ORDER BY week_start ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) END AS trailing_avg FROM weekly_signups) SELECT week_start, signups, ROUND(trailing_avg, 2) AS trailing_avg, CASE WHEN trailing_avg IS NULL THEN NULL WHEN signups > 1.5 * trailing_avg THEN 'spike' WHEN signups < 0.6 * trailing_avg THEN 'dip' ELSE 'normal' END AS flag FROM trailing ORDER BY week_start;
```
