---
id: da-day-329
title: Case study: how delays build up along a delivery route
order: 329
difficulty: advanced
topic: Case studies
summary: Measure lateness at each stop, how much each leg added, and where a route first went late.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure change between consecutive stops
  - Find the first row meeting a condition
prerequisites:
  - Day 41
  - Day 190
---

## Task

A delivery route visits stops in order (starter query). For each stop, compute `delay` (actual − planned arrival, in minutes) and `added_delay` (this stop's delay minus the previous stop's; the first stop's added delay is its own delay). A stop is **late** when its delay is over 10 minutes.

Return `route`, `stop_no`, `delay`, `added_delay` and `first_late` (`'yes'` on the route's first late stop only, else `'no'`). Sort by `route`, then `stop_no`.

## Starter query

```sql
WITH stops(route, stop_no, planned_arrival, actual_arrival) AS (
  VALUES
    ('R1', 1, '09:00', '09:05'), ('R1', 2, '09:30', '09:42'), ('R1', 3, '10:00', '10:20'), ('R1', 4, '10:30', '10:41'),
    ('R1', 5, '11:00', '11:05'), ('R2', 1, '09:00', '08:58'), ('R2', 2, '09:40', '09:41'), ('R2', 3, '10:20', '10:35'),
    ('R2', 4, '11:00', '11:02')
)
SELECT route, stop_no, planned_arrival, actual_arrival
FROM stops
ORDER BY route, stop_no;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Delay in minutes: `(julianday('2025-01-01 ' || actual_arrival) - julianday('2025-01-01 ' || planned_arrival)) * 1440`, rounded to whole minutes.
3. Added delay: `delay - COALESCE(LAG(delay) OVER (PARTITION BY route ORDER BY stop_no), 0)`. First late stop: the late stop with the smallest stop number, for example where `MIN(CASE WHEN delay > 10 THEN stop_no END) OVER (PARTITION BY route)` equals `stop_no`.

## Solution

```sql
WITH stops(route, stop_no, planned_arrival, actual_arrival) AS (
  VALUES
    ('R1', 1, '09:00', '09:05'), ('R1', 2, '09:30', '09:42'), ('R1', 3, '10:00', '10:20'), ('R1', 4, '10:30', '10:41'),
    ('R1', 5, '11:00', '11:05'), ('R2', 1, '09:00', '08:58'), ('R2', 2, '09:40', '09:41'), ('R2', 3, '10:20', '10:35'),
    ('R2', 4, '11:00', '11:02')
),
delays AS (
  SELECT route, stop_no, CAST(ROUND((julianday('2025-01-01 ' || actual_arrival) - julianday('2025-01-01 ' || planned_arrival)) * 1440) AS INTEGER) AS delay FROM stops
),
marked AS (
  SELECT route, stop_no, delay,
    delay - COALESCE(LAG(delay) OVER (PARTITION BY route ORDER BY stop_no), 0) AS added_delay,
    MIN(CASE WHEN delay > 10 THEN stop_no END) OVER (PARTITION BY route) AS first_late_stop
  FROM delays
)
SELECT route, stop_no, delay, added_delay, CASE WHEN stop_no = first_late_stop THEN 'yes' ELSE 'no' END AS first_late
FROM marked
ORDER BY route, stop_no;
```

## Expected result

| route | stop_no | delay | added_delay | first_late |
| --- | --- | --- | --- | --- |
| R1 | 1 | 5 | 5 | no |
| R1 | 2 | 12 | 7 | yes |
| R1 | 3 | 20 | 8 | no |
| R1 | 4 | 11 | -9 | no |
| R1 | 5 | 5 | -6 | no |
| R2 | 1 | -2 | -2 | no |
| R2 | 2 | 1 | 3 | no |
| R2 | 3 | 15 | 14 | yes |
| R2 | 4 | 2 | -13 | no |

## Explanation

Delays on a route build up stop by stop, and each leg can add or recover time. The delay at a stop compares actual and planned arrival; the added delay subtracts the previous stop's delay, so it shows what each leg contributed. R1's first legs each added 5 to 8 minutes, and then the driver recovered 15 minutes over the last two legs.

The first late stop is where the route crossed the 10-minute line: stop 2 for R1, stop 3 for R2. A window `MIN` over late stop numbers finds it in the same pass. Operations teams use this to see whether lateness starts at the depot or in one bad stretch: R2 was on time until a single 14-minute leg.

**Common mistake:** marking every late stop as the first. R1 then appears to go late three times, when it went late once and stayed late.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stops(route, stop_no, planned_arrival, actual_arrival) AS ( VALUES ('R1', 1, '09:00', '09:05'), ('R1', 2, '09:30', '09:42'), ('R1', 3, '10:00', '10:20'), ('R1', 4, '10:30', '10:41'), ('R1', 5, '11:00', '11:05'), ('R2', 1, '09:00', '08:58'), ('R2', 2, '09:40', '09:41'), ('R2', 3, '10:20', '10:35'), ('R2', 4, '11:00', '11:02') ), delays AS (SELECT route, stop_no, CAST(ROUND((julianday('2025-01-01 ' || actual_arrival) - julianday('2025-01-01 ' || planned_arrival)) * 1440) AS INTEGER) AS delay FROM stops) SELECT route, stop_no, delay, delay AS added_delay, CASE WHEN delay > 10 THEN 'yes' ELSE 'no' END AS first_late FROM delays ORDER BY route, stop_no;
```
