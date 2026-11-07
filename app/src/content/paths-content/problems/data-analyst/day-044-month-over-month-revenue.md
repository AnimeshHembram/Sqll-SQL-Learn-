---
id: da-day-044
title: Month-over-month revenue change
order: 44
difficulty: advanced
topic: Window functions
summary: Compare each month with the previous one using LAG on an aggregate.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Compare a period with the previous one
prerequisites:
  - Day 41
  - Data Analyst chapter: Working with dates
---

## Task

Return `month` (`YYYY-MM`), `revenue` (not counting cancelled orders, rounded to 2 decimal places) and `change`: this month's revenue minus last month's, rounded to 2 decimal places (`NULL` for the first month). Sort by month.

## Starter query

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month
ORDER BY month;
```

## Hints

1. Put the starter query in a CTE called `monthly`.
2. `LAG(revenue) OVER (ORDER BY month)` gives the previous month's revenue.
3. `ROUND(revenue - LAG(revenue) OVER (ORDER BY month), 2) AS change`

## Solution

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY month
)
SELECT month, ROUND(revenue, 2) AS revenue,
  ROUND(revenue - LAG(revenue) OVER (ORDER BY month), 2) AS change
FROM monthly
ORDER BY month;
```

## Expected result

| month | revenue | change |
| --- | --- | --- |
| 2025-01 | 48.47 | NULL |
| 2025-02 | 29.25 | -19.22 |
| 2025-03 | 55.74 | 26.49 |

## Explanation

Revenue fell by 19.22 in February and rose by 26.49 in March. Aggregate first, then compare: `LAG` in the CTE's outer query sees one row per month.
