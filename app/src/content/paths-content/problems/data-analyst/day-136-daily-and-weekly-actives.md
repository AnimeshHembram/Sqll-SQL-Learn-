---
id: da-day-136
title: Daily actives and weekly stickiness
order: 136
difficulty: advanced
topic: Behavioural analytics
summary: Count distinct users in a sliding seven-day window, which window functions cannot do directly.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count distinct values in a sliding window
  - Calculate an engagement ratio
prerequisites:
  - Day 107
  - Day 29
---

## Task

The activity log (in the starter query) has one row per user action, so a user can appear several times a day. For each day that has activity, return `day`, `dau` (distinct users that day), `wau` (distinct users in the **seven days ending that day**) and `stickiness_pct` (`dau` as a percentage of `wau`, rounded to 1 decimal place). Sort by `day`.

## Starter query

```sql
WITH activity(user_id, day) AS (
  VALUES
    ('u1', '2025-03-01'), ('u2', '2025-03-01'),
    ('u1', '2025-03-02'), ('u3', '2025-03-02'), ('u1', '2025-03-02'), ('u6', '2025-03-02'),
    ('u2', '2025-03-03'),
    ('u1', '2025-03-04'), ('u4', '2025-03-04'),
    ('u1', '2025-03-05'),
    ('u5', '2025-03-06'), ('u2', '2025-03-06'),
    ('u1', '2025-03-07'), ('u2', '2025-03-07'), ('u3', '2025-03-07'),
    ('u4', '2025-03-09')
)
SELECT day, COUNT(*) AS actions
FROM activity
GROUP BY day
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. SQLite does not allow `COUNT(DISTINCT ...)` in a window function. Instead, for each day, count the distinct users with a correlated subquery over a date range.
3. Days: `SELECT DISTINCT day FROM activity`. WAU: `(SELECT COUNT(DISTINCT a.user_id) FROM activity AS a WHERE a.day BETWEEN date(d.day, '-6 days') AND d.day)`.

## Solution

```sql
WITH activity(user_id, day) AS (
  VALUES
    ('u1', '2025-03-01'), ('u2', '2025-03-01'),
    ('u1', '2025-03-02'), ('u3', '2025-03-02'), ('u1', '2025-03-02'), ('u6', '2025-03-02'),
    ('u2', '2025-03-03'),
    ('u1', '2025-03-04'), ('u4', '2025-03-04'),
    ('u1', '2025-03-05'),
    ('u5', '2025-03-06'), ('u2', '2025-03-06'),
    ('u1', '2025-03-07'), ('u2', '2025-03-07'), ('u3', '2025-03-07'),
    ('u4', '2025-03-09')
),
days AS (
  SELECT day, COUNT(DISTINCT user_id) AS dau FROM activity GROUP BY day
),
weekly AS (
  SELECT d.day, d.dau,
    (SELECT COUNT(DISTINCT a.user_id) FROM activity AS a
     WHERE a.day BETWEEN date(d.day, '-6 days') AND d.day) AS wau
  FROM days AS d
)
SELECT day, dau, wau, ROUND(100.0 * dau / wau, 1) AS stickiness_pct
FROM weekly
ORDER BY day;
```

## Expected result

| day | dau | wau | stickiness_pct |
| --- | --- | --- | --- |
| 2025-03-01 | 2 | 2 | 100 |
| 2025-03-02 | 3 | 4 | 75 |
| 2025-03-03 | 1 | 4 | 25 |
| 2025-03-04 | 2 | 5 | 40 |
| 2025-03-05 | 1 | 5 | 20 |
| 2025-03-06 | 2 | 6 | 33.3 |
| 2025-03-07 | 3 | 6 | 50 |
| 2025-03-09 | 1 | 5 | 20 |

## Explanation

Stickiness (DAU ÷ WAU, or DAU ÷ MAU) measures how often active users come back: 50% means the average weekly user is active on half the days they could be.

A rolling distinct count cannot be built from daily counts: a user active on three days in the week is one weekly user, not three. That is why the weekly figure is recounted from the raw log for each day. On 9 March the window is 3 to 9 March, so u6, who was only active on 2 March, has dropped out.

**Common mistake:** `COUNT(*)` instead of `COUNT(DISTINCT user_id)`. u1's two actions on 2 March would count as two daily users.

## Wrong answers

Feedback: incorrect-output

```sql
WITH activity(user_id, day) AS ( VALUES ('u1', '2025-03-01'), ('u2', '2025-03-01'), ('u1', '2025-03-02'), ('u3', '2025-03-02'), ('u1', '2025-03-02'), ('u6', '2025-03-02'), ('u2', '2025-03-03'), ('u1', '2025-03-04'), ('u4', '2025-03-04'), ('u1', '2025-03-05'), ('u5', '2025-03-06'), ('u2', '2025-03-06'), ('u1', '2025-03-07'), ('u2', '2025-03-07'), ('u3', '2025-03-07'), ('u4', '2025-03-09') ), days AS (SELECT day, COUNT(*) AS dau FROM activity GROUP BY day), weekly AS (SELECT d.day, d.dau, (SELECT COUNT(DISTINCT a.user_id) FROM activity AS a WHERE a.day BETWEEN date(d.day, '-6 days') AND d.day) AS wau FROM days AS d) SELECT day, dau, wau, ROUND(100.0 * dau / wau, 1) AS stickiness_pct FROM weekly ORDER BY day;
```
