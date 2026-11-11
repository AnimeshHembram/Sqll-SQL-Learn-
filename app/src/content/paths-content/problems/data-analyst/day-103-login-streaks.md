---
id: da-day-103
title: Find login streaks
order: 103
difficulty: advanced
topic: Window functions
summary: Group consecutive days into "islands" with the date minus ROW_NUMBER trick.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Group consecutive rows into islands
  - Remove duplicates before numbering rows
prerequisites:
  - Day 38
  - Day 74
---

## Task

The app logs every login (in the starter query); people sometimes log in more than once a day. Find each user's **streaks** of two or more consecutive days with at least one login: `user_name`, `streak_start`, `streak_end` (dates in `YYYY-MM-DD` form) and `days`. Sort by `user_name`, then `streak_start`.

## Starter query

```sql
WITH logins(user_name, logged_at) AS (
  VALUES
    ('Ravi', '2025-03-01 08:10'), ('Ravi', '2025-03-01 21:00'), ('Ravi', '2025-03-02 09:00'),
    ('Ravi', '2025-03-03 07:45'), ('Ravi', '2025-03-05 10:00'), ('Ravi', '2025-03-06 22:30'),
    ('Mina', '2025-03-02 12:00'), ('Mina', '2025-03-04 09:15'), ('Mina', '2025-03-05 09:20'),
    ('Mina', '2025-03-06 18:00'), ('Mina', '2025-03-07 08:05'),
    ('Tom', '2025-03-03 14:00')
)
SELECT user_name, date(logged_at) AS day
FROM logins
ORDER BY user_name, day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. First reduce the log to one row per user and day: `SELECT DISTINCT user_name, date(logged_at) AS day`.
2. Number each user's days with `ROW_NUMBER()`. On consecutive days, the date and the row number both go up by 1, so `julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY day)` stays the same until there is a gap.
3. Group by `user_name` and that value: `MIN(day)`, `MAX(day)`, `COUNT(*)`, and keep groups `HAVING COUNT(*) >= 2`.

## Solution

```sql
WITH logins(user_name, logged_at) AS (
  VALUES
    ('Ravi', '2025-03-01 08:10'), ('Ravi', '2025-03-01 21:00'), ('Ravi', '2025-03-02 09:00'),
    ('Ravi', '2025-03-03 07:45'), ('Ravi', '2025-03-05 10:00'), ('Ravi', '2025-03-06 22:30'),
    ('Mina', '2025-03-02 12:00'), ('Mina', '2025-03-04 09:15'), ('Mina', '2025-03-05 09:20'),
    ('Mina', '2025-03-06 18:00'), ('Mina', '2025-03-07 08:05'),
    ('Tom', '2025-03-03 14:00')
),
login_days AS (
  SELECT DISTINCT user_name, date(logged_at) AS day
  FROM logins
),
islands AS (
  SELECT user_name, day,
    julianday(day) - ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY day) AS island
  FROM login_days
)
SELECT user_name, MIN(day) AS streak_start, MAX(day) AS streak_end, COUNT(*) AS days
FROM islands
GROUP BY user_name, island
HAVING COUNT(*) >= 2
ORDER BY user_name, streak_start;
```

## Expected result

| user_name | streak_start | streak_end | days |
| --- | --- | --- | --- |
| Mina | 2025-03-04 | 2025-03-07 | 4 |
| Ravi | 2025-03-01 | 2025-03-03 | 3 |
| Ravi | 2025-03-05 | 2025-03-06 | 2 |

## Explanation

This is the classic **gaps and islands** pattern. Within a run of consecutive days, the date and the row number rise together, so their difference is constant; after a gap the date jumps but the row number does not, so the difference changes. That constant becomes a group key for each island.

Ravi has two streaks (1-3 March and 5-6 March); Mina's single day on 2 March is not a streak; Tom logged in once.

**Common mistake:** skipping the `DISTINCT` day step. Ravi's two logins on 1 March take two row numbers for one date, the differences shift, and his streaks merge into one wrong island.

## Wrong answers

Feedback: incorrect-output

```sql
WITH logins(user_name, logged_at) AS ( VALUES ('Ravi', '2025-03-01 08:10'), ('Ravi', '2025-03-01 21:00'), ('Ravi', '2025-03-02 09:00'), ('Ravi', '2025-03-03 07:45'), ('Ravi', '2025-03-05 10:00'), ('Ravi', '2025-03-06 22:30'), ('Mina', '2025-03-02 12:00'), ('Mina', '2025-03-04 09:15'), ('Mina', '2025-03-05 09:20'), ('Mina', '2025-03-06 18:00'), ('Mina', '2025-03-07 08:05'), ('Tom', '2025-03-03 14:00') ), islands AS (SELECT user_name, date(logged_at) AS day, julianday(date(logged_at)) - ROW_NUMBER() OVER (PARTITION BY user_name ORDER BY logged_at) AS island FROM logins) SELECT user_name, MIN(day) AS streak_start, MAX(day) AS streak_end, COUNT(*) AS days FROM islands GROUP BY user_name, island HAVING COUNT(*) >= 2 ORDER BY user_name, streak_start;
```
