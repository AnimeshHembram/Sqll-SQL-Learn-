---
id: da-day-193
title: Difference in differences
order: 193
difficulty: advanced
topic: Experimentation
summary: Estimate a store change's effect by comparing the change in treated stores with the change in control stores.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Estimate an effect with difference in differences
  - Compare only units with complete data
prerequisites:
  - Day 148
  - Day 112
---

## Task

Two stores got a new layout (`treated`); three did not (`control`). Average weekly sales before and after are in the starter query; one control store has no "after" figure yet and must be left out entirely. Compute, for each group, the average sales before and after (over stores with both figures) and the change; then the **difference in differences**: the treated group's change minus the control group's change.

Return one row per group (`'control'`, `'treated'`) with `grp`, `stores`, `before`, `after` and `change` (rounded to 1 decimal place), then a row `'effect'` with `NULL` for the counts and averages and the difference in differences as `change`. Sort control, treated, effect.

## Starter query

```sql
WITH store_weeks(store, grp, period, avg_sales) AS (
  VALUES
    ('S1', 'treated', 'before', 1000), ('S1', 'treated', 'after', 1200),
    ('S2', 'treated', 'before', 800), ('S2', 'treated', 'after', 940),
    ('S3', 'control', 'before', 900), ('S3', 'control', 'after', 990),
    ('S4', 'control', 'before', 700), ('S4', 'control', 'after', 760),
    ('S5', 'control', 'before', 600), ('S5', 'control', 'after', NULL)
)
SELECT store, grp, period, avg_sales
FROM store_weeks
ORDER BY grp, store, period;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pivot each store to one row: `MAX(CASE WHEN period = 'before' THEN avg_sales END)` and the same for after. Keep stores where both are known.
3. Average per group, then add the effect row: `(SELECT change FROM groups WHERE grp = 'treated') - (SELECT change FROM groups WHERE grp = 'control')`. Sort with `CASE grp WHEN 'control' THEN 1 WHEN 'treated' THEN 2 ELSE 3 END`.

## Solution

```sql
WITH store_weeks(store, grp, period, avg_sales) AS (
  VALUES
    ('S1', 'treated', 'before', 1000), ('S1', 'treated', 'after', 1200),
    ('S2', 'treated', 'before', 800), ('S2', 'treated', 'after', 940),
    ('S3', 'control', 'before', 900), ('S3', 'control', 'after', 990),
    ('S4', 'control', 'before', 700), ('S4', 'control', 'after', 760),
    ('S5', 'control', 'before', 600), ('S5', 'control', 'after', NULL)
),
stores AS (
  SELECT store, grp,
    MAX(CASE WHEN period = 'before' THEN avg_sales END) AS before,
    MAX(CASE WHEN period = 'after' THEN avg_sales END) AS after
  FROM store_weeks
  GROUP BY store, grp
),
groups AS (
  SELECT grp, COUNT(*) AS stores, AVG(before) AS before, AVG(after) AS after, AVG(after) - AVG(before) AS change
  FROM stores
  WHERE before IS NOT NULL AND after IS NOT NULL
  GROUP BY grp
),
report AS (
  SELECT grp, stores, before, after, change FROM groups
  UNION ALL
  SELECT 'effect', NULL, NULL, NULL,
    (SELECT change FROM groups WHERE grp = 'treated') - (SELECT change FROM groups WHERE grp = 'control')
)
SELECT grp, stores, ROUND(before, 1) AS before, ROUND(after, 1) AS after, ROUND(change, 1) AS change
FROM report
ORDER BY CASE grp WHEN 'control' THEN 1 WHEN 'treated' THEN 2 ELSE 3 END;
```

## Expected result

| grp | stores | before | after | change |
| --- | --- | --- | --- | --- |
| control | 2 | 800 | 875 | 75 |
| treated | 2 | 900 | 1070 | 170 |
| effect | NULL | NULL | NULL | 95 |

## Explanation

Treated stores' sales rose by 170 a week after the new layout, but the control stores rose by 75 over the same weeks (season, prices, a holiday). Difference in differences subtracts that shared trend: the layout's estimated effect is about 95 a week, roughly half of the naive "before versus after" figure.

The method assumes both groups would have moved in parallel without the change, which is why the control stores should be as similar as possible. Store S5 has no "after" figure; including it in the "before" average but not the "after" average would compare different sets of stores, so it is dropped from both.

**Common mistake:** reporting the treated stores' before/after change (170) as the effect, which credits the layout with growth that happened everywhere.

## Wrong answers

Feedback: incorrect-output

```sql
WITH store_weeks(store, grp, period, avg_sales) AS ( VALUES ('S1', 'treated', 'before', 1000), ('S1', 'treated', 'after', 1200), ('S2', 'treated', 'before', 800), ('S2', 'treated', 'after', 940), ('S3', 'control', 'before', 900), ('S3', 'control', 'after', 990), ('S4', 'control', 'before', 700), ('S4', 'control', 'after', 760), ('S5', 'control', 'before', 600), ('S5', 'control', 'after', NULL) ), stores AS (SELECT store, grp, MAX(CASE WHEN period = 'before' THEN avg_sales END) AS before, MAX(CASE WHEN period = 'after' THEN avg_sales END) AS after FROM store_weeks GROUP BY store, grp), groups AS (SELECT grp, COUNT(*) AS stores, AVG(before) AS before, AVG(after) AS after, AVG(after) - AVG(before) AS change FROM stores GROUP BY grp), report AS (SELECT grp, stores, before, after, change FROM groups UNION ALL SELECT 'effect', NULL, NULL, NULL, (SELECT change FROM groups WHERE grp = 'treated') - (SELECT change FROM groups WHERE grp = 'control')) SELECT grp, stores, ROUND(before, 1) AS before, ROUND(after, 1) AS after, ROUND(change, 1) AS change FROM report ORDER BY CASE grp WHEN 'control' THEN 1 WHEN 'treated' THEN 2 ELSE 3 END;
```
