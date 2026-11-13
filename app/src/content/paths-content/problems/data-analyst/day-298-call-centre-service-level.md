---
id: da-day-298
title: Case study: call centre service level by half hour
order: 298
difficulty: advanced
topic: Case studies
summary: Measure calls answered within 20 seconds, abandonment and handle time for each half-hour interval.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure a service level
  - Keep abandoned work in the denominator
prerequisites:
  - Day 114
  - Day 207
---

## Task

A call centre's target is **80% of calls answered within 20 seconds**. Using the morning's calls (starter query; abandoned calls have no `answered_at`), report for each **half-hour interval** of arrival (`'09:00'` and `'09:30'`):

- `calls`, `answered`, `abandoned` and `abandon_pct`,
- `service_level_pct`: calls answered within 20 seconds ÷ **all** calls,
- `avg_wait_sec` and `avg_handle_sec` (average seconds from arrival to answer, and from answer to end, over answered calls),
- `met_target`: `'yes'` when the service level is at least 80%.

Round percentages and averages to 1 decimal place. Sort by `interval`.

## Starter query

```sql
WITH calls(call_id, arrived_at, answered_at, ended_at) AS (
  VALUES
    (1, '09:01:00', '09:01:10', '09:05:10'), (2, '09:03:00', '09:03:25', '09:09:25'), (3, '09:07:00', '09:07:40', '09:10:40'),
    (4, '09:12:00', '09:12:05', '09:20:05'), (5, '09:18:00', NULL, NULL), (6, '09:24:00', '09:24:15', '09:28:15'),
    (7, '09:31:00', '09:31:50', '09:39:50'), (8, '09:35:00', '09:35:05', '09:41:05'), (9, '09:41:00', '09:42:30', '09:45:30'),
    (10, '09:47:00', '09:47:10', '09:52:10'), (11, '09:52:00', NULL, NULL), (12, '09:58:00', '09:58:12', '10:03:12')
)
SELECT call_id, arrived_at, answered_at, ended_at
FROM calls
ORDER BY arrived_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Interval label: `SUBSTR(arrived_at, 1, 3) || CASE WHEN CAST(SUBSTR(arrived_at, 4, 2) AS INTEGER) < 30 THEN '00' ELSE '30' END`.
3. Seconds between two times: `(julianday('2025-01-01 ' || b) - julianday('2025-01-01 ' || a)) * 86400`. Abandoned calls give `NULL` waits, which `AVG` skips and `SUM(wait <= 20)` does not count, while `COUNT(*)` still includes them in the service level.

## Solution

```sql
WITH calls(call_id, arrived_at, answered_at, ended_at) AS (
  VALUES
    (1, '09:01:00', '09:01:10', '09:05:10'), (2, '09:03:00', '09:03:25', '09:09:25'), (3, '09:07:00', '09:07:40', '09:10:40'),
    (4, '09:12:00', '09:12:05', '09:20:05'), (5, '09:18:00', NULL, NULL), (6, '09:24:00', '09:24:15', '09:28:15'),
    (7, '09:31:00', '09:31:50', '09:39:50'), (8, '09:35:00', '09:35:05', '09:41:05'), (9, '09:41:00', '09:42:30', '09:45:30'),
    (10, '09:47:00', '09:47:10', '09:52:10'), (11, '09:52:00', NULL, NULL), (12, '09:58:00', '09:58:12', '10:03:12')
),
timed AS (
  SELECT SUBSTR(arrived_at, 1, 3) || CASE WHEN CAST(SUBSTR(arrived_at, 4, 2) AS INTEGER) < 30 THEN '00' ELSE '30' END AS interval,
    answered_at IS NOT NULL AS answered,
    (julianday('2025-01-01 ' || answered_at) - julianday('2025-01-01 ' || arrived_at)) * 86400 AS wait,
    (julianday('2025-01-01 ' || ended_at) - julianday('2025-01-01 ' || answered_at)) * 86400 AS handle
  FROM calls
)
SELECT interval, COUNT(*) AS calls, SUM(answered) AS answered, COUNT(*) - SUM(answered) AS abandoned,
  ROUND(100.0 * (COUNT(*) - SUM(answered)) / COUNT(*), 1) AS abandon_pct,
  ROUND(100.0 * SUM(wait <= 20.001) / COUNT(*), 1) AS service_level_pct,
  ROUND(AVG(wait), 1) AS avg_wait_sec, ROUND(AVG(handle), 1) AS avg_handle_sec,
  CASE WHEN 100.0 * SUM(wait <= 20.001) / COUNT(*) >= 80 THEN 'yes' ELSE 'no' END AS met_target
FROM timed
GROUP BY interval
ORDER BY interval;
```

## Expected result

| interval | calls | answered | abandoned | abandon_pct | service_level_pct | avg_wait_sec | avg_handle_sec | met_target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 09:00 | 6 | 5 | 1 | 16.7 | 50 | 19 | 300 | no |
| 09:30 | 6 | 5 | 1 | 16.7 | 50 | 33.4 | 324 | no |

## Explanation

Service level measures the share of **all** calls answered within the target time, abandoned calls included: a caller who hung up after a minute was not served within 20 seconds. Each half hour, 3 of 6 calls were answered within 20 seconds, so the service level is 50% against an 80% target, even though most answered calls were picked up fairly quickly.

`NULL` handles the abandoned calls naturally: their wait and handle times are `NULL`, so `AVG` leaves them out of the averages for answered calls, `SUM(wait <= 20)` does not count them as quick answers, and `COUNT(*)` still keeps them in the denominator. Average handle time rises in the second half hour, which could explain the longer waits.

**Common mistake:** dividing by answered calls only. Abandoned calls vanish from the denominator, and the service level rises to 60%, rewarding the centre for callers giving up.

## Wrong answers

Feedback: incorrect-output

```sql
WITH calls(call_id, arrived_at, answered_at, ended_at) AS ( VALUES (1, '09:01:00', '09:01:10', '09:05:10'), (2, '09:03:00', '09:03:25', '09:09:25'), (3, '09:07:00', '09:07:40', '09:10:40'), (4, '09:12:00', '09:12:05', '09:20:05'), (5, '09:18:00', NULL, NULL), (6, '09:24:00', '09:24:15', '09:28:15'), (7, '09:31:00', '09:31:50', '09:39:50'), (8, '09:35:00', '09:35:05', '09:41:05'), (9, '09:41:00', '09:42:30', '09:45:30'), (10, '09:47:00', '09:47:10', '09:52:10'), (11, '09:52:00', NULL, NULL), (12, '09:58:00', '09:58:12', '10:03:12') ), timed AS (SELECT SUBSTR(arrived_at, 1, 3) || CASE WHEN CAST(SUBSTR(arrived_at, 4, 2) AS INTEGER) < 30 THEN '00' ELSE '30' END AS interval, answered_at IS NOT NULL AS answered, (julianday('2025-01-01 ' || answered_at) - julianday('2025-01-01 ' || arrived_at)) * 86400 AS wait, (julianday('2025-01-01 ' || ended_at) - julianday('2025-01-01 ' || answered_at)) * 86400 AS handle FROM calls) SELECT interval, COUNT(*) AS calls, SUM(answered) AS answered, COUNT(*) - SUM(answered) AS abandoned, ROUND(100.0 * (COUNT(*) - SUM(answered)) / COUNT(*), 1) AS abandon_pct, ROUND(100.0 * SUM(wait <= 20.001) / SUM(answered), 1) AS service_level_pct, ROUND(AVG(wait), 1) AS avg_wait_sec, ROUND(AVG(handle), 1) AS avg_handle_sec, CASE WHEN 100.0 * SUM(wait <= 20.001) / SUM(answered) >= 80 THEN 'yes' ELSE 'no' END AS met_target FROM timed GROUP BY interval ORDER BY interval;
```
