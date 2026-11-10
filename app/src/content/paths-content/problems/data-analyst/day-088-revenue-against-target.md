---
id: da-day-088
title: Revenue against target
order: 88
difficulty: advanced
topic: Reporting
summary: Join actual figures to a targets table and report attainment.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Compare actuals with targets
prerequisites:
  - Day 44
  - Day 72
---

## Task

Management set monthly revenue targets (in the starter query). Return `month`, `target`, `revenue` (non-cancelled, rounded to 2 decimal places) and `attainment_pct`: revenue as a percentage of target, rounded to 1 decimal place. Sort by month.

## Starter query

```sql
WITH targets(month, target) AS (
  VALUES ('2025-01', 50.00), ('2025-02', 40.00), ('2025-03', 50.00)
)
SELECT month, target
FROM targets;
```

## Hints

1. Calculate monthly revenue in a second CTE called `actuals`.
2. Join `targets` to `actuals` on `month`.
3. `ROUND(100.0 * a.revenue / t.target, 1) AS attainment_pct`

## Solution

```sql
WITH targets(month, target) AS (
  VALUES ('2025-01', 50.00), ('2025-02', 40.00), ('2025-03', 50.00)
),
actuals AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY month
)
SELECT t.month, t.target, ROUND(a.revenue, 2) AS revenue,
  ROUND(100.0 * a.revenue / t.target, 1) AS attainment_pct
FROM targets AS t
JOIN actuals AS a ON a.month = t.month
ORDER BY t.month;
```

## Expected result

| month | target | revenue | attainment_pct |
| --- | --- | --- | --- |
| 2025-01 | 50 | 48.47 | 96.9 |
| 2025-02 | 40 | 29.25 | 73.1 |
| 2025-03 | 50 | 55.74 | 111.5 |

## Explanation

January reached 96.9% of target, February 73.1%, and March beat it with 111.5%. Keeping targets in their own table, rather than typing them into the query, lets them change without touching the calculation.
