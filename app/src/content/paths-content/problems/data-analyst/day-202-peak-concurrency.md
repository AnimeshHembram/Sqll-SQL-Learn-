---
id: da-day-202
title: Peak concurrent sessions with an event sweep
order: 202
difficulty: advanced
topic: Temporal analysis
summary: Turn sessions into +1/−1 events and find the busiest moment with a running sum.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure concurrency with an event sweep
  - Order tied events correctly
prerequisites:
  - Day 141
  - Day 157
---

## Task

Support needs to know how many users were online **at the same time** (sessions in the starter query; a session counts from `started` up to, but not including, `ended`). Find the moment(s) of **peak concurrency**: return `at` (a time when the count rises to the peak), `concurrent` (the peak count) and `users_online` (the users online then, alphabetically, joined with `','`). Sort by `at`.

## Starter query

```sql
WITH RECURSIVE sessions(user_id, started, ended) AS (
  VALUES
    ('u1', '2025-03-10 09:00', '2025-03-10 09:40'), ('u2', '2025-03-10 09:10', '2025-03-10 09:20'),
    ('u3', '2025-03-10 09:20', '2025-03-10 10:15'), ('u4', '2025-03-10 09:35', '2025-03-10 09:50'),
    ('u5', '2025-03-10 10:30', '2025-03-10 10:45'), ('u6', '2025-03-10 09:40', '2025-03-10 09:41')
)
SELECT user_id, started, ended
FROM sessions
ORDER BY started;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Turn each session into two events: `+1` at `started` and `-1` at `ended`. At equal times, process the `-1` first (a session ending at 09:40 is gone when another starts at 09:40).
3. A running `SUM(change) OVER (ORDER BY at, change)` gives the count after each event. Keep the events where it equals the maximum, then list who was online: sessions with `started <= at AND at < ended`.

## Solution

```sql
WITH RECURSIVE sessions(user_id, started, ended) AS (
  VALUES
    ('u1', '2025-03-10 09:00', '2025-03-10 09:40'), ('u2', '2025-03-10 09:10', '2025-03-10 09:20'),
    ('u3', '2025-03-10 09:20', '2025-03-10 10:15'), ('u4', '2025-03-10 09:35', '2025-03-10 09:50'),
    ('u5', '2025-03-10 10:30', '2025-03-10 10:45'), ('u6', '2025-03-10 09:40', '2025-03-10 09:41')
),
events AS (
  SELECT started AS at, 1 AS change FROM sessions
  UNION ALL
  SELECT ended, -1 FROM sessions
),
running AS (
  SELECT at, change, SUM(change) OVER (ORDER BY at, change ROWS UNBOUNDED PRECEDING) AS concurrent FROM events
),
peaks AS (
  SELECT DISTINCT at, concurrent FROM running
  WHERE change = 1 AND concurrent = (SELECT MAX(concurrent) FROM running)
)
SELECT p.at, p.concurrent,
  (SELECT group_concat(user_id, ',' ORDER BY user_id) FROM sessions AS s WHERE s.started <= p.at AND p.at < s.ended) AS users_online
FROM peaks AS p
ORDER BY p.at;
```

## Expected result

| at | concurrent | users_online |
| --- | --- | --- |
| 2025-03-10 09:35 | 3 | u1,u3,u4 |
| 2025-03-10 09:40 | 3 | u3,u4,u6 |

## Explanation

The sweep-line technique turns an interval problem into a running total: walk through all start and end events in time order, add 1 at each start and subtract 1 at each end. The count can only change at events, so checking them finds the peak exactly, however many sessions there are.

Ties at the same timestamp decide the answer. u1 ends at 09:40 and u6 starts at 09:40; processing the end first (`ORDER BY at, change`, because −1 sorts before +1) means they never overlap, so the peak is 3, reached at 09:35 (u1, u3, u4) and again at 09:40 (u3, u4, u6). Processing starts first would invent a moment with four users online.

**Common mistake:** counting overlapping pairs or ordering ties the wrong way, which overstates the peak and the staff it calls for.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE sessions(user_id, started, ended) AS ( VALUES ('u1', '2025-03-10 09:00', '2025-03-10 09:40'), ('u2', '2025-03-10 09:10', '2025-03-10 09:20'), ('u3', '2025-03-10 09:20', '2025-03-10 10:15'), ('u4', '2025-03-10 09:35', '2025-03-10 09:50'), ('u5', '2025-03-10 10:30', '2025-03-10 10:45'), ('u6', '2025-03-10 09:40', '2025-03-10 09:41') ), events AS (SELECT started AS at, 1 AS change FROM sessions UNION ALL SELECT ended, -1 FROM sessions), running AS (SELECT at, change, SUM(change) OVER (ORDER BY at, change DESC ROWS UNBOUNDED PRECEDING) AS concurrent FROM events), peaks AS (SELECT DISTINCT at, concurrent FROM running WHERE change = 1 AND concurrent = (SELECT MAX(concurrent) FROM running)) SELECT p.at, p.concurrent, (SELECT group_concat(user_id, ',' ORDER BY user_id) FROM sessions AS s WHERE s.started <= p.at AND p.at <= s.ended) AS users_online FROM peaks AS p ORDER BY p.at;
```
