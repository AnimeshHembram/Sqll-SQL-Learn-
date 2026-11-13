---
id: da-day-235
title: Machine utilisation by shift
order: 235
difficulty: intermediate
topic: Operations
summary: Compare run time with available time for every machine and shift, including pairs with no runs.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a complete grid with CROSS JOIN
  - Compare actual with capacity
prerequisites:
  - Day 37
  - Day 207
---

## Task

The run log (starter query) records minutes each machine ran in each shift. Each shift has a fixed number of available minutes. For **every** machine and shift (a pair with no runs has 0 minutes), return:

- `run_minutes` and `utilisation_pct` (run minutes ÷ available minutes × 100, rounded to 1 decimal place),
- `flag`: `'idle'` at 0%, `'low'` under 50%, `'high'` above 90%, otherwise `'normal'`.

Return `machine`, `shift`, `run_minutes`, `utilisation_pct` and `flag`, sorted by `machine`, then `shift`.

## Starter query

```sql
WITH machines(machine) AS (
  VALUES ('M1'), ('M2'), ('M3')
),
shifts(shift, available_minutes) AS (
  VALUES ('day', 480), ('night', 420)
),
run_log(machine, shift, minutes) AS (
  VALUES
    ('M1', 'day', 200), ('M1', 'day', 230), ('M1', 'night', 120),
    ('M2', 'day', 300), ('M2', 'day', 210), ('M2', 'night', 400),
    ('M3', 'day', 90)
)
SELECT machine, shift, minutes
FROM run_log
ORDER BY machine, shift;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Build every pair with `machines CROSS JOIN shifts`, then `LEFT JOIN` the run log totals per machine and shift.
3. `COALESCE(minutes, 0)` turns a missing total into 0; compute the percentage on that and label it with `CASE`, checking the 0 case first.

## Solution

```sql
WITH machines(machine) AS (
  VALUES ('M1'), ('M2'), ('M3')
),
shifts(shift, available_minutes) AS (
  VALUES ('day', 480), ('night', 420)
),
run_log(machine, shift, minutes) AS (
  VALUES
    ('M1', 'day', 200), ('M1', 'day', 230), ('M1', 'night', 120),
    ('M2', 'day', 300), ('M2', 'day', 210), ('M2', 'night', 400),
    ('M3', 'day', 90)
),
totals AS (
  SELECT machine, shift, SUM(minutes) AS minutes FROM run_log GROUP BY machine, shift
),
grid AS (
  SELECT m.machine, s.shift, s.available_minutes, COALESCE(t.minutes, 0) AS run_minutes
  FROM machines AS m
  CROSS JOIN shifts AS s
  LEFT JOIN totals AS t ON t.machine = m.machine AND t.shift = s.shift
)
SELECT machine, shift, run_minutes,
  ROUND(100.0 * run_minutes / available_minutes, 1) AS utilisation_pct,
  CASE WHEN run_minutes = 0 THEN 'idle'
       WHEN 100.0 * run_minutes / available_minutes < 50 THEN 'low'
       WHEN 100.0 * run_minutes / available_minutes > 90 THEN 'high'
       ELSE 'normal' END AS flag
FROM grid
ORDER BY machine, shift;
```

## Expected result

| machine | shift | run_minutes | utilisation_pct | flag |
| --- | --- | --- | --- | --- |
| M1 | day | 430 | 89.6 | normal |
| M1 | night | 120 | 28.6 | low |
| M2 | day | 510 | 106.3 | high |
| M2 | night | 400 | 95.2 | high |
| M3 | day | 90 | 18.8 | low |
| M3 | night | 0 | 0 | idle |

## Explanation

A utilisation report has to show what did not happen, so the grid comes first: every machine with every shift (`CROSS JOIN`), and only then the run log, with `LEFT JOIN`. M3 never ran at night, and only the grid makes that row appear, with 0 minutes and an `'idle'` flag.

M2 ran 510 minutes in a 480-minute day shift, 106.3%, which is not physically possible and points to overlapping log entries or overtime worth checking. M1 at night and M3 by day are both under 50%. The order of the `CASE` branches matters: the 0 case is tested first so that idle machines are not just reported as low.

**Common mistake:** starting from the run log. M3's night shift disappears, so the report says nothing about the one machine that was completely unused.

## Wrong answers

Feedback: missing-rows

```sql
WITH machines(machine) AS ( VALUES ('M1'), ('M2'), ('M3') ), shifts(shift, available_minutes) AS ( VALUES ('day', 480), ('night', 420) ), run_log(machine, shift, minutes) AS ( VALUES ('M1', 'day', 200), ('M1', 'day', 230), ('M1', 'night', 120), ('M2', 'day', 300), ('M2', 'day', 210), ('M2', 'night', 400), ('M3', 'day', 90) ) SELECT r.machine, r.shift, SUM(r.minutes) AS run_minutes, ROUND(100.0 * SUM(r.minutes) / s.available_minutes, 1) AS utilisation_pct, CASE WHEN SUM(r.minutes) = 0 THEN 'idle' WHEN 100.0 * SUM(r.minutes) / s.available_minutes < 50 THEN 'low' WHEN 100.0 * SUM(r.minutes) / s.available_minutes > 90 THEN 'high' ELSE 'normal' END AS flag FROM run_log AS r JOIN shifts AS s ON s.shift = r.shift GROUP BY r.machine, r.shift ORDER BY r.machine, r.shift;
```
