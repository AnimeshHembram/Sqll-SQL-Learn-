---
id: da-day-352
title: Capstone (retail) 2: like-for-like growth
order: 352
difficulty: advanced
topic: Capstone
summary: Separate the growth of mature stores from the effect of a new store, month on month.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Separate like-for-like from total growth
  - Compare consecutive months
prerequisites:
  - Day 149
  - Day 44
---

## Task

Same chain. A store counts as **like-for-like** (comparable) if it opened at least **12 months** before the start of January 2025 (on or before 2024-01-01). For each month, return `month`, `total_revenue`, `lfl_revenue` (comparable stores only) and `lfl_mom_pct` (comparable revenue change against the previous month, rounded to 1 decimal place, `NULL` for January) and `total_mom_pct` (the same for all stores). Sort by `month`.

## Starter query

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
)
SELECT store, opened FROM stores ORDER BY opened;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Join sales to stores and sum per month twice: all stores, and `SUM(CASE WHEN s.opened <= '2024-01-01' THEN revenue ELSE 0 END)`.
3. Month-on-month change: `100.0 * (x - LAG(x) OVER (ORDER BY month)) / LAG(x) OVER (ORDER BY month)`.

## Solution

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
),
monthly AS (
  SELECT x.month, SUM(x.revenue) AS total_revenue, SUM(CASE WHEN s.opened <= '2024-01-01' THEN x.revenue ELSE 0 END) AS lfl_revenue
  FROM sales AS x
  JOIN stores AS s ON s.store = x.store
  GROUP BY x.month
)
SELECT month, total_revenue, lfl_revenue,
  ROUND(100.0 * (lfl_revenue - LAG(lfl_revenue) OVER (ORDER BY month)) / LAG(lfl_revenue) OVER (ORDER BY month), 1) AS lfl_mom_pct,
  ROUND(100.0 * (total_revenue - LAG(total_revenue) OVER (ORDER BY month)) / LAG(total_revenue) OVER (ORDER BY month), 1) AS total_mom_pct
FROM monthly
ORDER BY month;
```

## Expected result

| month | total_revenue | lfl_revenue | lfl_mom_pct | total_mom_pct |
| --- | --- | --- | --- | --- |
| 2025-01 | 4470000 | 4050000 | NULL | NULL |
| 2025-02 | 4370000 | 3860000 | -4.7 | -2.2 |
| 2025-03 | 4870000 | 4230000 | 9.6 | 11.4 |

## Explanation

Like-for-like growth separates organic growth from the effect of new stores. Total revenue rose 11.4% from February to March, but S4 (opened in November 2024 and still ramping up) is included in that. Among comparable stores, growth was 9.6%, and February's dip was steeper for them (−4.7%) than for the chain (−2.2%), because S4's growth cushioned the total.

The cut-off is whether a store had a full year of trading before the comparison period: opened on or before 1 January 2024. S2 qualifies (opened in September 2023); S4 does not.

**Common mistake:** moving the cut-off to 1 January 2025. S4 then counts as comparable, like-for-like equals total, and the reason for comparing like for like disappears.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stores(store, city, opened, sq_ft) AS ( VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500) ), sales(store, month, revenue, transactions, staff_hours) AS ( VALUES ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480), ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120), ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190), ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870) ), monthly AS (SELECT x.month, SUM(x.revenue) AS total_revenue, SUM(CASE WHEN s.opened <= '2025-01-01' THEN x.revenue ELSE 0 END) AS lfl_revenue FROM sales AS x JOIN stores AS s ON s.store = x.store GROUP BY x.month) SELECT month, total_revenue, lfl_revenue, ROUND(100.0 * (lfl_revenue - LAG(lfl_revenue) OVER (ORDER BY month)) / LAG(lfl_revenue) OVER (ORDER BY month), 1) AS lfl_mom_pct, ROUND(100.0 * (total_revenue - LAG(total_revenue) OVER (ORDER BY month)) / LAG(total_revenue) OVER (ORDER BY month), 1) AS total_mom_pct FROM monthly ORDER BY month;
```
