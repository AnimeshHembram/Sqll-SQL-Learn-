---
id: da-day-341
title: KPI tiles: this week against last week
order: 341
difficulty: intermediate
topic: Reporting
summary: Compute four headline metrics for two weeks in one query, with change and an up/down label.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare periods with conditional sums
  - Unpivot metrics into rows
prerequisites:
  - Day 89
  - Day 184
---

## Task

A dashboard shows four KPI tiles comparing **this week** (10-16 March 2025) with **last week** (3-9 March) from the daily figures in the starter query: `revenue`, `orders`, `conversion_pct` (orders ÷ visitors × 100) and `aov` (revenue ÷ orders).

Return one row per KPI in that order: `kpi`, `last_week`, `this_week`, `change_pct` (rounded to 1 decimal place) and `direction` (`'up'`, `'down'` or `'flat'` when the change rounds to 0.0). Round `conversion_pct` and `aov` values to 2 decimal places.

## Starter query

```sql
WITH daily(day, revenue, orders, visitors) AS (
  VALUES
    ('2025-03-03', 52000, 130, 4100), ('2025-03-04', 48000, 120, 3900), ('2025-03-05', 50000, 128, 4000), ('2025-03-06', 61000, 150, 4500),
    ('2025-03-07', 58000, 140, 4300), ('2025-03-08', 70000, 172, 5200), ('2025-03-09', 66000, 160, 5000),
    ('2025-03-10', 55000, 125, 4200), ('2025-03-11', 51000, 118, 4050), ('2025-03-12', 56000, 135, 4150), ('2025-03-13', 64000, 145, 4400),
    ('2025-03-14', 60000, 141, 4380), ('2025-03-15', 75000, 190, 5600), ('2025-03-16', 69000, 165, 5100)
)
SELECT day, revenue, orders, visitors
FROM daily
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Total each week with conditional sums: `SUM(CASE WHEN day <= '2025-03-09' THEN revenue END)` and so on, in one CTE row.
3. Compute ratios from the weekly totals (not by averaging daily ratios), then unpivot into four rows with `UNION ALL` and a sort number.

## Solution

```sql
WITH daily(day, revenue, orders, visitors) AS (
  VALUES
    ('2025-03-03', 52000, 130, 4100), ('2025-03-04', 48000, 120, 3900), ('2025-03-05', 50000, 128, 4000), ('2025-03-06', 61000, 150, 4500),
    ('2025-03-07', 58000, 140, 4300), ('2025-03-08', 70000, 172, 5200), ('2025-03-09', 66000, 160, 5000),
    ('2025-03-10', 55000, 125, 4200), ('2025-03-11', 51000, 118, 4050), ('2025-03-12', 56000, 135, 4150), ('2025-03-13', 64000, 145, 4400),
    ('2025-03-14', 60000, 141, 4380), ('2025-03-15', 75000, 190, 5600), ('2025-03-16', 69000, 165, 5100)
),
weeks AS (
  SELECT
    SUM(CASE WHEN day <= '2025-03-09' THEN revenue END) AS rev_lw, SUM(CASE WHEN day >= '2025-03-10' THEN revenue END) AS rev_tw,
    SUM(CASE WHEN day <= '2025-03-09' THEN orders END) AS ord_lw, SUM(CASE WHEN day >= '2025-03-10' THEN orders END) AS ord_tw,
    SUM(CASE WHEN day <= '2025-03-09' THEN visitors END) AS vis_lw, SUM(CASE WHEN day >= '2025-03-10' THEN visitors END) AS vis_tw
  FROM daily
),
kpis AS (
  SELECT 1 AS sort_no, 'revenue' AS kpi, 1.0 * rev_lw AS last_week, 1.0 * rev_tw AS this_week FROM weeks
  UNION ALL SELECT 2, 'orders', ord_lw, ord_tw FROM weeks
  UNION ALL SELECT 3, 'conversion_pct', 100.0 * ord_lw / vis_lw, 100.0 * ord_tw / vis_tw FROM weeks
  UNION ALL SELECT 4, 'aov', 1.0 * rev_lw / ord_lw, 1.0 * rev_tw / ord_tw FROM weeks
)
SELECT kpi, ROUND(last_week, 2) AS last_week, ROUND(this_week, 2) AS this_week,
  ROUND(100 * (this_week - last_week) / last_week, 1) AS change_pct,
  CASE WHEN ROUND(100 * (this_week - last_week) / last_week, 1) > 0 THEN 'up'
       WHEN ROUND(100 * (this_week - last_week) / last_week, 1) < 0 THEN 'down' ELSE 'flat' END AS direction
FROM kpis
ORDER BY sort_no;
```

## Expected result

| kpi | last_week | this_week | change_pct | direction |
| --- | --- | --- | --- | --- |
| revenue | 405000 | 430000 | 6.2 | up |
| orders | 1000 | 1019 | 1 | up |
| conversion_pct | 3.23 | 3.2 | -0.9 | down |
| aov | 405 | 421.98 | 4.2 | up |

## Explanation

KPI tiles compare one period with another, and ratios must be computed from period totals. This week's conversion is 1,019 orders ÷ 31,880 visitors (3.20%), slightly down on last week's 3.23%, even though orders rose 1.0%: traffic grew faster than orders. Average order value rose 4.2%, which is why revenue grew 6.2%.

Conditional sums put both weeks in one row, and `UNION ALL` turns the four metrics into four rows a dashboard can render as tiles. The direction is decided on the rounded change so that a tile never says "up" next to "0.0%".

**Common mistake:** averaging daily ratios. A quiet day counts as much as a busy one, so the weekly conversion and AOV are slightly off, enough to flip small changes like conversion's −0.9%.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily(day, revenue, orders, visitors) AS ( VALUES ('2025-03-03', 52000, 130, 4100), ('2025-03-04', 48000, 120, 3900), ('2025-03-05', 50000, 128, 4000), ('2025-03-06', 61000, 150, 4500), ('2025-03-07', 58000, 140, 4300), ('2025-03-08', 70000, 172, 5200), ('2025-03-09', 66000, 160, 5000), ('2025-03-10', 55000, 125, 4200), ('2025-03-11', 51000, 118, 4050), ('2025-03-12', 56000, 135, 4150), ('2025-03-13', 64000, 145, 4400), ('2025-03-14', 60000, 141, 4380), ('2025-03-15', 75000, 190, 5600), ('2025-03-16', 69000, 165, 5100) ), weeks AS (SELECT SUM(CASE WHEN day <= '2025-03-09' THEN revenue END) AS rev_lw, SUM(CASE WHEN day >= '2025-03-10' THEN revenue END) AS rev_tw, SUM(CASE WHEN day <= '2025-03-09' THEN orders END) AS ord_lw, SUM(CASE WHEN day >= '2025-03-10' THEN orders END) AS ord_tw, AVG(CASE WHEN day <= '2025-03-09' THEN 100.0 * orders / visitors END) AS conv_lw, AVG(CASE WHEN day >= '2025-03-10' THEN 100.0 * orders / visitors END) AS conv_tw, AVG(CASE WHEN day <= '2025-03-09' THEN 1.0 * revenue / orders END) AS aov_lw, AVG(CASE WHEN day >= '2025-03-10' THEN 1.0 * revenue / orders END) AS aov_tw FROM daily), kpis AS (SELECT 1 AS sort_no, 'revenue' AS kpi, 1.0 * rev_lw AS last_week, 1.0 * rev_tw AS this_week FROM weeks UNION ALL SELECT 2, 'orders', ord_lw, ord_tw FROM weeks UNION ALL SELECT 3, 'conversion_pct', conv_lw, conv_tw FROM weeks UNION ALL SELECT 4, 'aov', aov_lw, aov_tw FROM weeks) SELECT kpi, ROUND(last_week, 2) AS last_week, ROUND(this_week, 2) AS this_week, ROUND(100 * (this_week - last_week) / last_week, 1) AS change_pct, CASE WHEN ROUND(100 * (this_week - last_week) / last_week, 1) > 0 THEN 'up' WHEN ROUND(100 * (this_week - last_week) / last_week, 1) < 0 THEN 'down' ELSE 'flat' END AS direction FROM kpis ORDER BY sort_no;
```
