---
id: da-day-121
title: Record-breaking months
order: 121
difficulty: intermediate
topic: Window functions
summary: Compare each row with the best of the rows before it, using a frame that stops before the current row.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Use a frame that excludes the current row
  - Handle ties and NULLs in a running comparison
prerequisites:
  - Day 40
  - Day 104
---

## Task

Management celebrates **record months**: a month whose revenue is strictly higher than every earlier month. For each month (in the starter query), return `month`, `revenue`, `previous_best` (the highest revenue of all **earlier** months, `NULL` for the first) and `is_record` (`'yes'` or `'no'`).

The first month with revenue is a record. Equalling the previous best is not a record. A month with no reported revenue (`NULL`) is never a record and does not change the best. Sort by `month`.

## Starter query

```sql
WITH monthly_sales(month, revenue) AS (
  VALUES ('2025-01', 120), ('2025-02', 150), ('2025-03', 140), ('2025-04', 150),
         ('2025-05', 180), ('2025-06', 90), ('2025-07', NULL), ('2025-08', 200)
)
SELECT month, revenue
FROM monthly_sales
ORDER BY month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `MAX(revenue) OVER (ORDER BY month)` includes the current month by default. The frame must stop one row earlier: `ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING`.
3. Then `CASE WHEN revenue IS NULL THEN 'no' WHEN previous_best IS NULL OR revenue > previous_best THEN 'yes' ELSE 'no' END`. Compute `previous_best` in a CTE so you can use it twice.

## Solution

```sql
WITH monthly_sales(month, revenue) AS (
  VALUES ('2025-01', 120), ('2025-02', 150), ('2025-03', 140), ('2025-04', 150),
         ('2025-05', 180), ('2025-06', 90), ('2025-07', NULL), ('2025-08', 200)
),
with_best AS (
  SELECT month, revenue,
    MAX(revenue) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS previous_best
  FROM monthly_sales
)
SELECT month, revenue, previous_best,
  CASE
    WHEN revenue IS NULL THEN 'no'
    WHEN previous_best IS NULL OR revenue > previous_best THEN 'yes'
    ELSE 'no'
  END AS is_record
FROM with_best
ORDER BY month;
```

## Expected result

| month | revenue | previous_best | is_record |
| --- | --- | --- | --- |
| 2025-01 | 120 | NULL | yes |
| 2025-02 | 150 | 120 | yes |
| 2025-03 | 140 | 150 | no |
| 2025-04 | 150 | 150 | no |
| 2025-05 | 180 | 150 | yes |
| 2025-06 | 90 | 180 | no |
| 2025-07 | NULL | 180 | no |
| 2025-08 | 200 | 180 | yes |

## Explanation

A frame that ends at `1 PRECEDING` describes "everything before this row", which is what a record comparison needs. `MAX` ignores `NULL`, so July's missing figure neither counts as a record nor lowers the best.

April equals February's 150 and is not a record; August's 200 beats May's 180 and is.

**Common mistakes:** the default frame, which includes the current month, so `revenue > previous_best` can never be true; and `>=`, which turns April's tie into a record.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly_sales(month, revenue) AS ( VALUES ('2025-01', 120), ('2025-02', 150), ('2025-03', 140), ('2025-04', 150), ('2025-05', 180), ('2025-06', 90), ('2025-07', NULL), ('2025-08', 200) ), with_best AS (SELECT month, revenue, MAX(revenue) OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS previous_best FROM monthly_sales) SELECT month, revenue, previous_best, CASE WHEN revenue IS NULL THEN 'no' WHEN previous_best IS NULL OR revenue >= previous_best THEN 'yes' ELSE 'no' END AS is_record FROM with_best ORDER BY month;
```

Feedback: incorrect-output

```sql
WITH monthly_sales(month, revenue) AS ( VALUES ('2025-01', 120), ('2025-02', 150), ('2025-03', 140), ('2025-04', 150), ('2025-05', 180), ('2025-06', 90), ('2025-07', NULL), ('2025-08', 200) ), with_best AS (SELECT month, revenue, MAX(revenue) OVER (ORDER BY month) AS previous_best FROM monthly_sales) SELECT month, revenue, previous_best, CASE WHEN revenue IS NULL THEN 'no' WHEN previous_best IS NULL OR revenue > previous_best THEN 'yes' ELSE 'no' END AS is_record FROM with_best ORDER BY month;
```
