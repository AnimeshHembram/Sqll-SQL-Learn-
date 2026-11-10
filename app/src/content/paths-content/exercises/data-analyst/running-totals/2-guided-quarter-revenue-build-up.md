---
id: da-quarter-revenue-build-up
title: How the quarter's revenue built up
order: 2
difficulty: intermediate
topic: Cumulative percentage
summary: Show each month's cumulative revenue as a percentage of the quarter.
module: data-analyst
duration: 9
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Express a running total as a share of the whole
---

## Task

Return `month`, `revenue` (net, rounded to 2 decimal places) and `cumulative_pct`: revenue from the start of the quarter up to and including that month, as a percentage of the whole quarter's revenue, rounded to 1 decimal place. Sort by `month`.

**Steps**

1. The starter query has one row per month in a CTE called `monthly`.
2. Revenue so far is `SUM(revenue) OVER (ORDER BY month)`; the quarter total is `SUM(revenue) OVER ()`.
3. Divide the first by the second and multiply by `100.0`.

## Starter query

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY month
)
SELECT month, ROUND(revenue, 2) AS revenue
FROM monthly
ORDER BY month;
```

## Hints

1. Two windows in one expression: one running, one over everything.
2. Write `100.0` so the division keeps decimals.
3. `ROUND(100.0 * SUM(revenue) OVER (ORDER BY month) / SUM(revenue) OVER (), 1) AS cumulative_pct`

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
  ROUND(100.0 * SUM(revenue) OVER (ORDER BY month) / SUM(revenue) OVER (), 1) AS cumulative_pct
FROM monthly
ORDER BY month;
```

## Expected result

| month | revenue | cumulative_pct |
| --- | --- | --- |
| 2025-01 | 48.47 | 36.3 |
| 2025-02 | 29.25 | 58.2 |
| 2025-03 | 55.74 | 100 |

## Explanation

January brought in 36.3% of the quarter, and by the end of February the store had 58.2%, so March alone delivered the remaining 41.8%. The last row is always 100%, which makes a quick check that both windows cover the same rows.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly AS ( SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY month ) SELECT month, ROUND(revenue, 2) AS revenue, ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS cumulative_pct FROM monthly ORDER BY month;
```
