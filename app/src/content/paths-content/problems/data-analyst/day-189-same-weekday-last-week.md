---
id: da-day-189
title: Compare with the same weekday last week
order: 189
difficulty: intermediate
topic: Temporal analysis
summary: Compare each day with exactly seven days earlier using a date join, not a row offset, when days are missing.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare periods with a date-offset self-join
  - Avoid row offsets on gappy data
prerequisites:
  - Day 108
  - Day 74
---

## Task

Traffic has a weekly pattern, so each day (in the starter query) should be compared with the **same weekday one week earlier**. One day (9 March) has no data. For each day, return `day`, `visits`, `last_week` (visits seven days earlier, `NULL` if unknown) and `change_pct` (rounded to 1 decimal place). Sort by `day`.

## Starter query

```sql
WITH daily_visits(day, visits) AS (
  VALUES
    ('2025-03-03', 120), ('2025-03-04', 130), ('2025-03-05', 125), ('2025-03-06', 140), ('2025-03-07', 160),
    ('2025-03-08', 90), ('2025-03-10', 150), ('2025-03-11', 104), ('2025-03-12', 125), ('2025-03-13', 168),
    ('2025-03-14', 200), ('2025-03-15', 85), ('2025-03-16', 70)
)
SELECT day, visits, strftime('%w', day) AS weekday_number
FROM daily_visits
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join the table to itself on the date seven days earlier: `LEFT JOIN daily_visits AS prev ON prev.day = date(cur.day, '-7 days')`.
3. `LAG(visits, 7)` counts rows, not days: with 9 March missing, it would compare with the wrong weekday. The date join cannot drift.

## Solution

```sql
WITH daily_visits(day, visits) AS (
  VALUES
    ('2025-03-03', 120), ('2025-03-04', 130), ('2025-03-05', 125), ('2025-03-06', 140), ('2025-03-07', 160),
    ('2025-03-08', 90), ('2025-03-10', 150), ('2025-03-11', 104), ('2025-03-12', 125), ('2025-03-13', 168),
    ('2025-03-14', 200), ('2025-03-15', 85), ('2025-03-16', 70)
)
SELECT cur.day, cur.visits, prev.visits AS last_week,
  ROUND(100.0 * (cur.visits - prev.visits) / prev.visits, 1) AS change_pct
FROM daily_visits AS cur
LEFT JOIN daily_visits AS prev ON prev.day = date(cur.day, '-7 days')
ORDER BY cur.day;
```

## Expected result

| day | visits | last_week | change_pct |
| --- | --- | --- | --- |
| 2025-03-03 | 120 | NULL | NULL |
| 2025-03-04 | 130 | NULL | NULL |
| 2025-03-05 | 125 | NULL | NULL |
| 2025-03-06 | 140 | NULL | NULL |
| 2025-03-07 | 160 | NULL | NULL |
| 2025-03-08 | 90 | NULL | NULL |
| 2025-03-10 | 150 | 120 | 25 |
| 2025-03-11 | 104 | 130 | -20 |
| 2025-03-12 | 125 | 125 | 0 |
| 2025-03-13 | 168 | 140 | 20 |
| 2025-03-14 | 200 | 160 | 25 |
| 2025-03-15 | 85 | 90 | -5.6 |
| 2025-03-16 | 70 | NULL | NULL |

## Explanation

Week-over-week comparisons remove the weekly cycle: a Saturday dip is normal, a Saturday below last Saturday is news. Friday 14 March is up 25% on the previous Friday; Tuesday 11 March is down 20%.

The missing Sunday shows why a date join beats a row offset. `LAG(visits, 7)` looks seven **rows** back, so once a day is missing every later row compares with the wrong weekday (14 March would be compared with Thursday 6 March). Joining on `date(day, '-7 days')` always finds the right day, or `NULL` when there is none, as for 16 March, whose previous Sunday is the missing day.

**Common mistake:** `LAG(visits, 7) OVER (ORDER BY day)`, which silently drifts after any gap in the data.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_visits(day, visits) AS ( VALUES ('2025-03-03', 120), ('2025-03-04', 130), ('2025-03-05', 125), ('2025-03-06', 140), ('2025-03-07', 160), ('2025-03-08', 90), ('2025-03-10', 150), ('2025-03-11', 104), ('2025-03-12', 125), ('2025-03-13', 168), ('2025-03-14', 200), ('2025-03-15', 85), ('2025-03-16', 70) ) SELECT day, visits, LAG(visits, 7) OVER (ORDER BY day) AS last_week, ROUND(100.0 * (visits - LAG(visits, 7) OVER (ORDER BY day)) / LAG(visits, 7) OVER (ORDER BY day), 1) AS change_pct FROM daily_visits ORDER BY day;
```
