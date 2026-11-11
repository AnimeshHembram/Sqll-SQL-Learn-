---
id: da-day-110
title: Split clicks into sessions
order: 110
difficulty: advanced
topic: Metrics
summary: Flag a new session after 30 minutes of inactivity, then number sessions with a running sum.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Group events into sessions with LAG and a running SUM
  - Get a time boundary exactly right
prerequisites:
  - Day 103
  - Day 41
---

## Task

Web analytics groups a visitor's clicks into **sessions**: a new session starts with the visitor's first click and whenever **more than 30 minutes** have passed since their previous click (exactly 30 minutes is still the same session). Using the clicks in the starter query, return `visitor`, `session_no` (1, 2, ... per visitor), `started` (the session's first click time, as written) and `clicks`. Sort by `visitor`, then `session_no`.

## Starter query

```sql
WITH clicks(visitor, clicked_at) AS (
  VALUES
    ('v1', '2025-03-01 10:00'), ('v1', '2025-03-01 10:10'), ('v1', '2025-03-01 10:35'),
    ('v1', '2025-03-01 11:20'), ('v1', '2025-03-01 11:25'),
    ('v2', '2025-03-01 09:00'), ('v2', '2025-03-01 09:31'), ('v2', '2025-03-01 09:50'),
    ('v3', '2025-03-01 14:00'), ('v3', '2025-03-01 14:30')
)
SELECT visitor, clicked_at
FROM clicks
ORDER BY visitor, clicked_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Get the previous click with `LAG(clicked_at) OVER (PARTITION BY visitor ORDER BY clicked_at)`, and the gap in minutes with `(unixepoch(clicked_at) - unixepoch(previous)) / 60.0`.
3. Flag a new session with `CASE WHEN previous IS NULL OR gap > 30 THEN 1 ELSE 0 END`. A running `SUM(flag) OVER (PARTITION BY visitor ORDER BY clicked_at)` then numbers the sessions; group by visitor and that number.

## Solution

```sql
WITH clicks(visitor, clicked_at) AS (
  VALUES
    ('v1', '2025-03-01 10:00'), ('v1', '2025-03-01 10:10'), ('v1', '2025-03-01 10:35'),
    ('v1', '2025-03-01 11:20'), ('v1', '2025-03-01 11:25'),
    ('v2', '2025-03-01 09:00'), ('v2', '2025-03-01 09:31'), ('v2', '2025-03-01 09:50'),
    ('v3', '2025-03-01 14:00'), ('v3', '2025-03-01 14:30')
),
gaps AS (
  SELECT visitor, clicked_at,
    LAG(clicked_at) OVER (PARTITION BY visitor ORDER BY clicked_at) AS previous
  FROM clicks
),
flagged AS (
  SELECT visitor, clicked_at,
    CASE WHEN previous IS NULL OR (unixepoch(clicked_at) - unixepoch(previous)) / 60.0 > 30 THEN 1 ELSE 0 END AS new_session
  FROM gaps
),
numbered AS (
  SELECT visitor, clicked_at,
    SUM(new_session) OVER (PARTITION BY visitor ORDER BY clicked_at) AS session_no
  FROM flagged
)
SELECT visitor, session_no, MIN(clicked_at) AS started, COUNT(*) AS clicks
FROM numbered
GROUP BY visitor, session_no
ORDER BY visitor, session_no;
```

## Expected result

| visitor | session_no | started | clicks |
| --- | --- | --- | --- |
| v1 | 1 | 2025-03-01 10:00 | 3 |
| v1 | 2 | 2025-03-01 11:20 | 2 |
| v2 | 1 | 2025-03-01 09:00 | 1 |
| v2 | 2 | 2025-03-01 09:31 | 2 |
| v3 | 1 | 2025-03-01 14:00 | 2 |

## Explanation

Sessionisation is a three-step window pattern: compare each row with the previous one (`LAG`), flag where a new group starts, and turn the flags into group numbers with a running `SUM`. The same steps split trips, shifts or support conversations.

v1's click at 11:20 comes 45 minutes after 10:35, so it starts session 2. v2's click at 09:31 is 31 minutes after 09:00 and starts a new session; v3's click at 14:30 is exactly 30 minutes after 14:00 and stays in the same one. Working in whole seconds with `unixepoch` keeps that boundary exact; fractional days from `julianday` can be off by a tiny amount.

**Common mistake:** testing `>= 30`, which splits v3 into two sessions.

## Wrong answers

Feedback: incorrect-output

```sql
WITH clicks(visitor, clicked_at) AS ( VALUES ('v1', '2025-03-01 10:00'), ('v1', '2025-03-01 10:10'), ('v1', '2025-03-01 10:35'), ('v1', '2025-03-01 11:20'), ('v1', '2025-03-01 11:25'), ('v2', '2025-03-01 09:00'), ('v2', '2025-03-01 09:31'), ('v2', '2025-03-01 09:50'), ('v3', '2025-03-01 14:00'), ('v3', '2025-03-01 14:30') ), gaps AS (SELECT visitor, clicked_at, LAG(clicked_at) OVER (PARTITION BY visitor ORDER BY clicked_at) AS previous FROM clicks), flagged AS (SELECT visitor, clicked_at, CASE WHEN previous IS NULL OR (unixepoch(clicked_at) - unixepoch(previous)) / 60.0 >= 30 THEN 1 ELSE 0 END AS new_session FROM gaps), numbered AS (SELECT visitor, clicked_at, SUM(new_session) OVER (PARTITION BY visitor ORDER BY clicked_at) AS session_no FROM flagged) SELECT visitor, session_no, MIN(clicked_at) AS started, COUNT(*) AS clicks FROM numbered GROUP BY visitor, session_no ORDER BY visitor, session_no;
```
