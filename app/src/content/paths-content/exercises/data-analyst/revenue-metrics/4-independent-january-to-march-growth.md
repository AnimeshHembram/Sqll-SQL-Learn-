---
id: da-january-to-march-growth
title: Order and revenue growth, January to March
order: 4
difficulty: advanced
topic: Growth
summary: Compare two months on two metrics and see which one grew.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Compare periods on several metrics
  - Count distinct values conditionally
---

## Task

Leadership asks whether March beat January. Return one row with `jan_orders`, `mar_orders`, `order_growth_pct` and `revenue_growth_pct`, using non-cancelled orders. Growth is (March − January) ÷ January × 100, rounded to 1 decimal place.

## Starter query

```sql
SELECT o.id, o.order_date, oi.quantity * oi.unit_price AS line_value
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Hints

1. Calculate each month's orders and revenue side by side in a CTE, with conditional aggregation.
2. Orders in one month: `COUNT(DISTINCT CASE WHEN o.order_date LIKE '2025-01%' THEN o.id END)`. `COUNT` ignores the `NULL`s that `CASE` returns for other months.
3. In the outer query: `ROUND(100.0 * (mar_orders - jan_orders) / jan_orders, 1)`, and the same for revenue.

## Solution

```sql
WITH months AS (
  SELECT
    COUNT(DISTINCT CASE WHEN o.order_date LIKE '2025-01%' THEN o.id END) AS jan_orders,
    COUNT(DISTINCT CASE WHEN o.order_date LIKE '2025-03%' THEN o.id END) AS mar_orders,
    SUM(CASE WHEN o.order_date LIKE '2025-01%' THEN oi.quantity * oi.unit_price ELSE 0 END) AS jan_revenue,
    SUM(CASE WHEN o.order_date LIKE '2025-03%' THEN oi.quantity * oi.unit_price ELSE 0 END) AS mar_revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
)
SELECT jan_orders, mar_orders,
  ROUND(100.0 * (mar_orders - jan_orders) / jan_orders, 1) AS order_growth_pct,
  ROUND(100.0 * (mar_revenue - jan_revenue) / jan_revenue, 1) AS revenue_growth_pct
FROM months;
```

## Expected result

| jan_orders | mar_orders | order_growth_pct | revenue_growth_pct |
| --- | --- | --- | --- |
| 2 | 2 | 0 | 15 |

## Explanation

Both months had two orders, so orders did not grow at all, but revenue grew by 15.0%. The extra money came from bigger orders, not more of them. Reporting two related metrics side by side shows *why* a number moved.

## Wrong answers

Feedback: incorrect-output

```sql
WITH months AS (SELECT SUM(CASE WHEN o.order_date LIKE '2025-01%' THEN 1 ELSE 0 END) AS jan_orders, SUM(CASE WHEN o.order_date LIKE '2025-03%' THEN 1 ELSE 0 END) AS mar_orders, SUM(CASE WHEN o.order_date LIKE '2025-01%' THEN oi.quantity * oi.unit_price ELSE 0 END) AS jan_revenue, SUM(CASE WHEN o.order_date LIKE '2025-03%' THEN oi.quantity * oi.unit_price ELSE 0 END) AS mar_revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled') SELECT jan_orders, mar_orders, ROUND(100.0 * (mar_orders - jan_orders) / jan_orders, 1) AS order_growth_pct, ROUND(100.0 * (mar_revenue - jan_revenue) / jan_revenue, 1) AS revenue_growth_pct FROM months;
```
