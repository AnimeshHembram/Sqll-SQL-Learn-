---
id: da-day-224
title: Carry the last stock count forward
order: 224
difficulty: advanced
topic: Window functions
summary: Fill gaps with the last known value using a running count to form groups, without recursion.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build groups with a running COUNT
  - Fill forward without recursion
prerequisites:
  - Day 127
  - Day 103
---

## Task

A shelf is counted most days, but some days have no count (`NULL`, starter query). For each day, show the last known count on or before that day; days before the first count stay `NULL`. A real count of 0 is a value, not a gap.

Return `day`, `units`, `filled_units` and `is_filled` (`'yes'` when the value was carried forward, `'no'` when it was counted that day, `NULL` while nothing has been counted yet). Sort by `day`.

## Starter query

```sql
WITH stock_counts(day, units) AS (
  VALUES
    ('2025-03-01', NULL), ('2025-03-02', 40), ('2025-03-03', NULL), ('2025-03-04', NULL), ('2025-03-05', 35),
    ('2025-03-06', 0), ('2025-03-07', NULL), ('2025-03-08', 28), ('2025-03-09', NULL)
)
SELECT day, units
FROM stock_counts
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `COUNT(units) OVER (ORDER BY day)` counts non-null values so far. It goes up by one on every counted day and stays the same through the gap after it, so it numbers each counted day together with the gap that follows.
3. Within each group there is exactly one non-null value: `MAX(units) OVER (PARTITION BY grp)` spreads it across the group. The leading group 0 has no count, so it stays `NULL`.

## Solution

```sql
WITH stock_counts(day, units) AS (
  VALUES
    ('2025-03-01', NULL), ('2025-03-02', 40), ('2025-03-03', NULL), ('2025-03-04', NULL), ('2025-03-05', 35),
    ('2025-03-06', 0), ('2025-03-07', NULL), ('2025-03-08', 28), ('2025-03-09', NULL)
),
grouped AS (
  SELECT day, units, COUNT(units) OVER (ORDER BY day) AS grp FROM stock_counts
),
filled AS (
  SELECT day, units, grp, MAX(units) OVER (PARTITION BY grp) AS filled_units FROM grouped
)
SELECT day, units, filled_units,
  CASE WHEN filled_units IS NULL THEN NULL WHEN units IS NULL THEN 'yes' ELSE 'no' END AS is_filled
FROM filled
ORDER BY day;
```

## Expected result

| day | units | filled_units | is_filled |
| --- | --- | --- | --- |
| 2025-03-01 | NULL | NULL | NULL |
| 2025-03-02 | 40 | 40 | no |
| 2025-03-03 | NULL | 40 | yes |
| 2025-03-04 | NULL | 40 | yes |
| 2025-03-05 | 35 | 35 | no |
| 2025-03-06 | 0 | 0 | no |
| 2025-03-07 | NULL | 0 | yes |
| 2025-03-08 | 28 | 28 | no |
| 2025-03-09 | NULL | 28 | yes |

## Explanation

Filling forward is a gaps-and-islands problem in disguise. `COUNT(units) OVER (ORDER BY day)` ignores `NULL`s, so it increases on each counted day and stays flat through the gap that follows: the 2nd to 4th get group 1, the 5th group 2, the 6th and 7th group 3, and so on. Each group holds exactly one real count, which `MAX(...) OVER (PARTITION BY grp)` spreads over its gap days.

This handles gaps of any length in one pass, without recursion. The 3rd and 4th both get 40 from the 2nd, and the 7th gets 0, because a real count of zero is a value (an empty shelf), not a missing count. The 1st comes before any count, so it stays `NULL` rather than being guessed.

**Common mistake:** `COALESCE(units, LAG(units) OVER (...))`. `LAG` only looks back one row, so the second day of a gap (the 4th) still comes out `NULL`.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stock_counts(day, units) AS ( VALUES ('2025-03-01', NULL), ('2025-03-02', 40), ('2025-03-03', NULL), ('2025-03-04', NULL), ('2025-03-05', 35), ('2025-03-06', 0), ('2025-03-07', NULL), ('2025-03-08', 28), ('2025-03-09', NULL) ) SELECT day, units, COALESCE(units, LAG(units) OVER (ORDER BY day)) AS filled_units, CASE WHEN COALESCE(units, LAG(units) OVER (ORDER BY day)) IS NULL THEN NULL WHEN units IS NULL THEN 'yes' ELSE 'no' END AS is_filled FROM stock_counts ORDER BY day;
```
