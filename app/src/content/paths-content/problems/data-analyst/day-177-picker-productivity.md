---
id: da-day-177
title: Case study: warehouse picker productivity
order: 177
difficulty: advanced
topic: Case studies
summary: Measure items per hour, idle gaps and the top performer per shift from a pick log.
module: data-analyst
duration: 18
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Combine row-level gaps with group aggregates
  - Compare each group with its partition maximum
prerequisites:
  - Day 110
  - Day 147
---

## Task

The warehouse logs every pick (in the starter query). For each picker in each shift, return:

- `shift`, `picker`, `picks`, `items`,
- `items_per_hour`: items ÷ hours between the first and last pick, rounded to 1 decimal place (`NULL` with a single pick),
- `long_gaps`: gaps of **more than 15 minutes** between consecutive picks,
- `top`: `'yes'` for the highest items per hour in the shift (every picker tied at the top gets `'yes'`), otherwise `'no'`.

Sort by `shift`, then `picker`.

## Starter query

```sql
WITH picks(picker, shift, picked_at, items) AS (
  VALUES
    ('Anu', 'AM', '2025-03-10 08:00', 12), ('Anu', 'AM', '2025-03-10 08:10', 9), ('Anu', 'AM', '2025-03-10 08:40', 15),
    ('Anu', 'AM', '2025-03-10 09:00', 14),
    ('Bala', 'AM', '2025-03-10 08:05', 20), ('Bala', 'AM', '2025-03-10 08:35', 22), ('Bala', 'AM', '2025-03-10 09:05', 18),
    ('Chen', 'AM', '2025-03-10 08:30', 7),
    ('Dev', 'PM', '2025-03-10 14:00', 10), ('Dev', 'PM', '2025-03-10 14:12', 10), ('Dev', 'PM', '2025-03-10 14:24', 10),
    ('Esha', 'PM', '2025-03-10 14:00', 15), ('Esha', 'PM', '2025-03-10 14:24', 15)
)
SELECT picker, shift, picked_at, items
FROM picks
ORDER BY shift, picker, picked_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Gap to the previous pick, in minutes: `(julianday(picked_at) - julianday(LAG(picked_at) OVER (PARTITION BY shift, picker ORDER BY picked_at))) * 24 * 60`. Round it before comparing, because time arithmetic in days leaves tiny fractions.
3. Group by shift and picker: hours = `(julianday(MAX(picked_at)) - julianday(MIN(picked_at))) * 24`; divide only when hours > 0. Then `MAX(items_per_hour) OVER (PARTITION BY shift)` finds the top value; `NULL` rates are never top.

## Solution

```sql
WITH picks(picker, shift, picked_at, items) AS (
  VALUES
    ('Anu', 'AM', '2025-03-10 08:00', 12), ('Anu', 'AM', '2025-03-10 08:10', 9), ('Anu', 'AM', '2025-03-10 08:40', 15),
    ('Anu', 'AM', '2025-03-10 09:00', 14),
    ('Bala', 'AM', '2025-03-10 08:05', 20), ('Bala', 'AM', '2025-03-10 08:35', 22), ('Bala', 'AM', '2025-03-10 09:05', 18),
    ('Chen', 'AM', '2025-03-10 08:30', 7),
    ('Dev', 'PM', '2025-03-10 14:00', 10), ('Dev', 'PM', '2025-03-10 14:12', 10), ('Dev', 'PM', '2025-03-10 14:24', 10),
    ('Esha', 'PM', '2025-03-10 14:00', 15), ('Esha', 'PM', '2025-03-10 14:24', 15)
),
gaps AS (
  SELECT shift, picker, picked_at, items,
    ROUND((julianday(picked_at) - julianday(LAG(picked_at) OVER (PARTITION BY shift, picker ORDER BY picked_at))) * 24 * 60) AS gap_minutes
  FROM picks
),
per_picker AS (
  SELECT shift, picker, COUNT(*) AS picks, SUM(items) AS items,
    (julianday(MAX(picked_at)) - julianday(MIN(picked_at))) * 24 AS hours,
    SUM(CASE WHEN gap_minutes > 15 THEN 1 ELSE 0 END) AS long_gaps
  FROM gaps
  GROUP BY shift, picker
),
rated AS (
  SELECT shift, picker, picks, items, long_gaps,
    CASE WHEN hours > 0 THEN ROUND(items / hours, 1) END AS items_per_hour
  FROM per_picker
)
SELECT shift, picker, picks, items, items_per_hour, long_gaps,
  CASE WHEN items_per_hour = MAX(items_per_hour) OVER (PARTITION BY shift) THEN 'yes' ELSE 'no' END AS top
FROM rated
ORDER BY shift, picker;
```

## Expected result

| shift | picker | picks | items | items_per_hour | long_gaps | top |
| --- | --- | --- | --- | --- | --- | --- |
| AM | Anu | 4 | 50 | 50 | 2 | no |
| AM | Bala | 3 | 60 | 60 | 2 | yes |
| AM | Chen | 1 | 7 | NULL | 0 | no |
| PM | Dev | 3 | 30 | 75 | 0 | yes |
| PM | Esha | 2 | 30 | 75 | 1 | yes |

## Explanation

Productivity reports combine per-row calculations (gaps with `LAG`), per-group aggregates (items and hours) and comparisons across groups (the shift's best rate). Each step is a separate CTE, which keeps the logic checkable.

Edge cases decide the ranking. Chen made one pick, so there is no time span and no meaningful rate: `NULL`, never top. In the PM shift Dev and Esha both picked 30 items in 24 minutes, 75 an hour, so both are top, although Esha's single 24-minute pause counts as a long gap. Bala's gaps are exactly 30 minutes and count as long; Anu's 10-minute gap does not.

Rounding the gap matters: 15 minutes computed through `julianday` comes out as 14.999999… or 15.000001…, so an unrounded comparison could flip on an exact boundary.

**Common mistake:** dividing by the number of picks or by a fixed shift length instead of the time actually worked, which ranks pickers by how many picks they logged rather than by speed.

## Wrong answers

Feedback: incorrect-output

```sql
WITH picks(picker, shift, picked_at, items) AS ( VALUES ('Anu', 'AM', '2025-03-10 08:00', 12), ('Anu', 'AM', '2025-03-10 08:10', 9), ('Anu', 'AM', '2025-03-10 08:40', 15), ('Anu', 'AM', '2025-03-10 09:00', 14), ('Bala', 'AM', '2025-03-10 08:05', 20), ('Bala', 'AM', '2025-03-10 08:35', 22), ('Bala', 'AM', '2025-03-10 09:05', 18), ('Chen', 'AM', '2025-03-10 08:30', 7), ('Dev', 'PM', '2025-03-10 14:00', 10), ('Dev', 'PM', '2025-03-10 14:12', 10), ('Dev', 'PM', '2025-03-10 14:24', 10), ('Esha', 'PM', '2025-03-10 14:00', 15), ('Esha', 'PM', '2025-03-10 14:24', 15) ), gaps AS (SELECT shift, picker, picked_at, items, ROUND((julianday(picked_at) - julianday(LAG(picked_at) OVER (PARTITION BY shift, picker ORDER BY picked_at))) * 24 * 60) AS gap_minutes FROM picks), per_picker AS (SELECT shift, picker, COUNT(*) AS picks, SUM(items) AS items, SUM(CASE WHEN gap_minutes > 15 THEN 1 ELSE 0 END) AS long_gaps FROM gaps GROUP BY shift, picker), rated AS (SELECT shift, picker, picks, items, long_gaps, ROUND(items * 1.0 / picks, 1) AS items_per_hour FROM per_picker) SELECT shift, picker, picks, items, items_per_hour, long_gaps, CASE WHEN items_per_hour = MAX(items_per_hour) OVER (PARTITION BY shift) THEN 'yes' ELSE 'no' END AS top FROM rated ORDER BY shift, picker;
```
