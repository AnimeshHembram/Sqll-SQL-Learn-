---
id: da-day-336
title: Users active in the last 28 days
order: 336
difficulty: advanced
topic: Interview practice
summary: Count distinct users active in the 28 days up to each day, without double-counting repeat visits.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count distinct users in a rolling window
  - Join a calendar to events by date range
prerequisites:
  - Day 136
  - Day 107
---

## Task

For each day from **4 to 10 March 2025**, count the **distinct users active in the 28 days ending that day** (that day and the 27 before it), from the activity log in the starter query. Return `day` and `active_28d`, sorted by `day`.

## Starter query

```sql
WITH RECURSIVE activity(user_id, active_on) AS (
  VALUES
    (1, '2025-02-01'), (1, '2025-02-20'), (1, '2025-03-10'), (2, '2025-02-05'), (2, '2025-03-01'), (3, '2025-02-08'),
    (4, '2025-02-25'), (4, '2025-03-08'), (5, '2025-03-03'), (5, '2025-03-09'), (6, '2025-01-30'), (7, '2025-03-10'),
    (8, '2025-03-06')
)
SELECT user_id, active_on
FROM activity
ORDER BY active_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Add a calendar of the seven days.
2. Join each calendar day to activity with `a.active_on BETWEEN date(c.day, '-27 days') AND c.day`.
3. Group by day and `COUNT(DISTINCT a.user_id)`; a window function over rows cannot count distinct users over a date range, which is why the join is needed.

## Solution

```sql
WITH RECURSIVE activity(user_id, active_on) AS (
  VALUES
    (1, '2025-02-01'), (1, '2025-02-20'), (1, '2025-03-10'), (2, '2025-02-05'), (2, '2025-03-01'), (3, '2025-02-08'),
    (4, '2025-02-25'), (4, '2025-03-08'), (5, '2025-03-03'), (5, '2025-03-09'), (6, '2025-01-30'), (7, '2025-03-10'),
    (8, '2025-03-06')
),
calendar(day) AS (
  SELECT '2025-03-04'
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-10'
)
SELECT c.day, COUNT(DISTINCT a.user_id) AS active_28d
FROM calendar AS c
LEFT JOIN activity AS a ON a.active_on BETWEEN date(c.day, '-27 days') AND c.day
GROUP BY c.day
ORDER BY c.day;
```

## Expected result

| day | active_28d |
| --- | --- |
| 2025-03-04 | 5 |
| 2025-03-05 | 5 |
| 2025-03-06 | 6 |
| 2025-03-07 | 6 |
| 2025-03-08 | 5 |
| 2025-03-09 | 5 |
| 2025-03-10 | 6 |

## Explanation

A rolling distinct count cannot be done with a window frame, because `COUNT(DISTINCT ...)` is not allowed over a frame and the frame is defined in days, not rows. Joining each calendar day to all activity in its 28-day window and counting distinct users solves both problems.

User 3's only visit, on 8 February, leaves the window on 8 March, so the count drops from 6 to 5; user 8's first visit on 6 March and user 7's on 10 March add to it. Users who visit several times in the window, like user 1, count once.

**Common mistake:** `COUNT(user_id)` without `DISTINCT`. Repeat visits are counted again, so the "active users" figure becomes a count of visits.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE activity(user_id, active_on) AS ( VALUES (1, '2025-02-01'), (1, '2025-02-20'), (1, '2025-03-10'), (2, '2025-02-05'), (2, '2025-03-01'), (3, '2025-02-08'), (4, '2025-02-25'), (4, '2025-03-08'), (5, '2025-03-03'), (5, '2025-03-09'), (6, '2025-01-30'), (7, '2025-03-10'), (8, '2025-03-06') ), calendar(day) AS (SELECT '2025-03-04' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-10') SELECT c.day, COUNT(a.user_id) AS active_28d FROM calendar AS c LEFT JOIN activity AS a ON a.active_on BETWEEN date(c.day, '-27 days') AND c.day GROUP BY c.day ORDER BY c.day;
```

Feedback: incorrect-output

```sql
WITH RECURSIVE activity(user_id, active_on) AS ( VALUES (1, '2025-02-01'), (1, '2025-02-20'), (1, '2025-03-10'), (2, '2025-02-05'), (2, '2025-03-01'), (3, '2025-02-08'), (4, '2025-02-25'), (4, '2025-03-08'), (5, '2025-03-03'), (5, '2025-03-09'), (6, '2025-01-30'), (7, '2025-03-10'), (8, '2025-03-06') ), calendar(day) AS (SELECT '2025-03-04' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-10') SELECT c.day, COUNT(DISTINCT a.user_id) AS active_28d FROM calendar AS c LEFT JOIN activity AS a ON a.active_on BETWEEN date(c.day, '-28 days') AND c.day GROUP BY c.day ORDER BY c.day;
```
