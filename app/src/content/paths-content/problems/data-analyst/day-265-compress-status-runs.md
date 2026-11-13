---
id: da-day-265
title: Compress a status log into runs
order: 265
difficulty: advanced
topic: Gaps and islands
summary: Collapse consecutive pings with the same status into one row per run, with its start, end and length.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find islands with two row numbers
  - Compress a log into runs
prerequisites:
  - Day 199
  - Day 261
---

## Task

Devices report their status every five minutes (starter query). Compress each device's log into **runs** of consecutive pings with the same status: `device`, `status`, `from_time` (first ping of the run), `to_time` (last ping of the run) and `pings`.

Sort by `device`, then `from_time`.

## Starter query

```sql
WITH device_pings(device, pinged_at, status) AS (
  VALUES
    ('D1', '08:00', 'ok'), ('D1', '08:05', 'ok'), ('D1', '08:10', 'error'), ('D1', '08:15', 'error'), ('D1', '08:20', 'error'),
    ('D1', '08:25', 'ok'), ('D1', '08:30', 'error'), ('D1', '08:35', 'ok'),
    ('D2', '08:00', 'error'), ('D2', '08:05', 'error'), ('D2', '08:10', 'ok'), ('D2', '08:15', 'ok')
)
SELECT device, pinged_at, status
FROM device_pings
ORDER BY device, pinged_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Two row numbers find islands: `ROW_NUMBER() OVER (PARTITION BY device ORDER BY pinged_at)` minus `ROW_NUMBER() OVER (PARTITION BY device, status ORDER BY pinged_at)` is constant within a run of one status and changes when the status changes.
3. Group by device, status and that difference: `MIN(pinged_at)`, `MAX(pinged_at)` and `COUNT(*)`.

## Solution

```sql
WITH device_pings(device, pinged_at, status) AS (
  VALUES
    ('D1', '08:00', 'ok'), ('D1', '08:05', 'ok'), ('D1', '08:10', 'error'), ('D1', '08:15', 'error'), ('D1', '08:20', 'error'),
    ('D1', '08:25', 'ok'), ('D1', '08:30', 'error'), ('D1', '08:35', 'ok'),
    ('D2', '08:00', 'error'), ('D2', '08:05', 'error'), ('D2', '08:10', 'ok'), ('D2', '08:15', 'ok')
),
islands AS (
  SELECT device, pinged_at, status,
    ROW_NUMBER() OVER (PARTITION BY device ORDER BY pinged_at)
      - ROW_NUMBER() OVER (PARTITION BY device, status ORDER BY pinged_at) AS island
  FROM device_pings
)
SELECT device, status, MIN(pinged_at) AS from_time, MAX(pinged_at) AS to_time, COUNT(*) AS pings
FROM islands
GROUP BY device, status, island
ORDER BY device, from_time;
```

## Expected result

| device | status | from_time | to_time | pings |
| --- | --- | --- | --- | --- |
| D1 | ok | 08:00 | 08:05 | 2 |
| D1 | error | 08:10 | 08:20 | 3 |
| D1 | ok | 08:25 | 08:25 | 1 |
| D1 | error | 08:30 | 08:30 | 1 |
| D1 | ok | 08:35 | 08:35 | 1 |
| D2 | error | 08:00 | 08:05 | 2 |
| D2 | ok | 08:10 | 08:15 | 2 |

## Explanation

Compressing a log into runs is the classic islands technique with two row numbers. Numbering all of a device's pings, and separately the pings of each status, gives two counters that grow together while the status stays the same; their difference jumps whenever the status changes and then changes back. Grouping by device, status and that difference gives one row per run.

D1's errors come in two separate runs: three pings from 08:10 to 08:20, then a single ping at 08:30. Grouping by status alone would merge them into one "error" period from 08:10 to 08:30 that hides the recovery at 08:25. The compressed log is what an on-call engineer actually wants to read.

**Common mistake:** grouping by device and status only. Separate runs of the same status merge into one row, with a start and end that span the runs in between.

## Wrong answers

Feedback: incorrect-output

```sql
WITH device_pings(device, pinged_at, status) AS ( VALUES ('D1', '08:00', 'ok'), ('D1', '08:05', 'ok'), ('D1', '08:10', 'error'), ('D1', '08:15', 'error'), ('D1', '08:20', 'error'), ('D1', '08:25', 'ok'), ('D1', '08:30', 'error'), ('D1', '08:35', 'ok'), ('D2', '08:00', 'error'), ('D2', '08:05', 'error'), ('D2', '08:10', 'ok'), ('D2', '08:15', 'ok') ) SELECT device, status, MIN(pinged_at) AS from_time, MAX(pinged_at) AS to_time, COUNT(*) AS pings FROM device_pings GROUP BY device, status ORDER BY device, from_time;
```
