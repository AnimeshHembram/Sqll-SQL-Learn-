---
id: da-day-181
title: Subtotals and a grand total in one result
order: 181
difficulty: intermediate
topic: Reporting
summary: Emulate ROLLUP in SQLite with UNION ALL and a sort key, so detail, subtotal and total rows line up.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Emulate ROLLUP with UNION ALL
  - Control report layout with a sort key
prerequisites:
  - Day 149
  - Day 90
---

## Task

Finance wants one table (data in the starter query): revenue for each region and category, a **subtotal** row after each region's categories, and a **grand total** at the end. A sale with no revenue figure (`NULL`) still exists but adds nothing.

Return `region`, `category` and `revenue`. Detail rows show both names; a subtotal row shows the region with `category` = `'All categories'`; the grand total shows `region` = `'All regions'` and `category` = `'All categories'`. Order: regions alphabetically, each region's categories alphabetically followed by its subtotal, then the grand total.

## Starter query

```sql
WITH sales(region, category, revenue) AS (
  VALUES
    ('North', 'Books', 120), ('North', 'Games', 80), ('North', 'Books', 30),
    ('South', 'Books', 200), ('South', 'Toys', 50),
    ('West', 'Games', 90), ('West', 'Toys', NULL)
)
SELECT region, category, revenue
FROM sales
ORDER BY region, category;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. SQLite has no `ROLLUP`, so the three levels are three `SELECT`s.
2. Detail: `GROUP BY region, category`. Subtotals: `GROUP BY region` with `'All categories'`. Grand total: no `GROUP BY`. Combine with `UNION ALL` in a CTE, adding a `level` column (0, 1, 2).
3. Sort the outer query with `ORDER BY level = 2, region, level, category`: the grand total goes last, and within a region the detail rows (level 0) come before the subtotal (level 1).

## Solution

```sql
WITH sales(region, category, revenue) AS (
  VALUES
    ('North', 'Books', 120), ('North', 'Games', 80), ('North', 'Books', 30),
    ('South', 'Books', 200), ('South', 'Toys', 50),
    ('West', 'Games', 90), ('West', 'Toys', NULL)
),
report AS (
  SELECT 0 AS level, region, category, SUM(revenue) AS revenue FROM sales GROUP BY region, category
  UNION ALL
  SELECT 1, region, 'All categories', SUM(revenue) FROM sales GROUP BY region
  UNION ALL
  SELECT 2, 'All regions', 'All categories', SUM(revenue) FROM sales
)
SELECT region, category, revenue
FROM report
ORDER BY level = 2, region, level, category;
```

## Expected result

| region | category | revenue |
| --- | --- | --- |
| North | Books | 150 |
| North | Games | 80 |
| North | All categories | 230 |
| South | Books | 200 |
| South | Toys | 50 |
| South | All categories | 250 |
| West | Games | 90 |
| West | Toys | NULL |
| West | All categories | 90 |
| All regions | All categories | 570 |

## Explanation

Many databases have `GROUP BY ROLLUP (region, category)`; SQLite does not, but the same report is three aggregations at different levels stacked with `UNION ALL`. A hidden `level` column then controls the layout: it keeps each subtotal directly under its region's details and the grand total at the bottom, whatever the labels sort to.

West's toy sale has no revenue figure. `SUM` ignores the `NULL`, so West's toys show `NULL` (nothing known), its subtotal is 90 and the grand total 570. North's two Books rows are combined into one detail row of 150.

**Common mistake:** sorting by `region, category` alone. `'All categories'` sorts before `'Books'`, so each subtotal would appear above its details, and `'All regions'` would land between North and South.

## Wrong answers

Feedback: wrong-order

```sql
WITH sales(region, category, revenue) AS ( VALUES ('North', 'Books', 120), ('North', 'Games', 80), ('North', 'Books', 30), ('South', 'Books', 200), ('South', 'Toys', 50), ('West', 'Games', 90), ('West', 'Toys', NULL) ), report AS (SELECT 0 AS level, region, category, SUM(revenue) AS revenue FROM sales GROUP BY region, category UNION ALL SELECT 1, region, 'All categories', SUM(revenue) FROM sales GROUP BY region UNION ALL SELECT 2, 'All regions', 'All categories', SUM(revenue) FROM sales) SELECT region, category, revenue FROM report ORDER BY region, category;
```
