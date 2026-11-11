---
id: da-day-108
title: Year-over-year growth with missing months
order: 108
difficulty: advanced
topic: Metrics
summary: Compare each month with the same month a year earlier by date, not by row position.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare periods by date arithmetic
  - Guard a percentage against missing and zero bases
prerequisites:
  - Day 44
  - Day 58
---

## Task

Monthly revenue for 2024 and 2025 is in the starter query; 2024 has no row for April. For each **2025** month, return `month`, `revenue`, `last_year` (the same month in 2024, or `NULL`) and `yoy_pct`: the change from last year as a percentage, rounded to 1 decimal place, or `NULL` when there is no figure for last year or it was 0. Sort by `month`.

## Starter query

```sql
WITH monthly_revenue(month, revenue) AS (
  VALUES
    ('2024-01', 100), ('2024-02', 0), ('2024-03', 120),
    ('2025-01', 130), ('2025-02', 90), ('2025-03', 120), ('2025-04', 80)
)
SELECT month, revenue
FROM monthly_revenue
WHERE month LIKE '2025-%'
ORDER BY month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Find last year's month by date arithmetic: `strftime('%Y-%m', month || '-01', '-1 year')` turns `'2025-03'` into `'2024-03'`. `LEFT JOIN` the table to itself on that.
3. Percentage change: `ROUND(100.0 * (cur.revenue - prev.revenue) / NULLIF(prev.revenue, 0), 1)`. `NULLIF` makes a zero last year count as "no comparison".

## Solution

```sql
WITH monthly_revenue(month, revenue) AS (
  VALUES
    ('2024-01', 100), ('2024-02', 0), ('2024-03', 120),
    ('2025-01', 130), ('2025-02', 90), ('2025-03', 120), ('2025-04', 80)
)
SELECT cur.month, cur.revenue,
  prev.revenue AS last_year,
  ROUND(100.0 * (cur.revenue - prev.revenue) / NULLIF(prev.revenue, 0), 1) AS yoy_pct
FROM monthly_revenue AS cur
LEFT JOIN monthly_revenue AS prev ON prev.month = strftime('%Y-%m', cur.month || '-01', '-1 year')
WHERE cur.month LIKE '2025-%'
ORDER BY cur.month;
```

## Expected result

| month | revenue | last_year | yoy_pct |
| --- | --- | --- | --- |
| 2025-01 | 130 | 100 | 30 |
| 2025-02 | 90 | 0 | NULL |
| 2025-03 | 120 | 120 | 0 |
| 2025-04 | 80 | NULL | NULL |

## Explanation

Year-over-year comparisons match **calendar months**, so the join uses the date one year earlier rather than "12 rows back". With a missing month in the data, `LAG(revenue, 12)` lands on the wrong month or on nothing at all.

February 2024 had zero revenue, so a percentage change is undefined: `NULLIF(prev.revenue, 0)` turns the divisor into `NULL` and the result is `NULL`. (SQLite also returns `NULL` for a division by zero, but many databases raise an error, so `NULLIF` is the portable habit.) April has nothing to compare with.

**Common mistake:** using `LAG(revenue, 12)` or `LAG(revenue, 3)`; both depend on every month having a row.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly_revenue(month, revenue) AS ( VALUES ('2024-01', 100), ('2024-02', 0), ('2024-03', 120), ('2025-01', 130), ('2025-02', 90), ('2025-03', 120), ('2025-04', 80) ), lagged AS (SELECT month, revenue, LAG(revenue, 3) OVER (ORDER BY month) AS last_year FROM monthly_revenue) SELECT month, revenue, last_year, ROUND(100.0 * (revenue - last_year) / NULLIF(last_year, 0), 1) AS yoy_pct FROM lagged WHERE month LIKE '2025-%' ORDER BY month;
```
