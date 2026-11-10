---
id: da-day-089
title: One-row executive summary
order: 89
difficulty: advanced
topic: Reporting
summary: Combine six headline metrics, each with its own definition, into one row.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Combine metrics with different definitions in one report
prerequisites:
  - Day 45
  - Day 46
  - Day 27
---

## Task

Write the one-row summary for the leadership meeting, with these columns:

- `revenue`: non-cancelled revenue, rounded to 2 decimal places
- `orders`: non-cancelled orders
- `buyers`: customers with a non-cancelled order
- `aov`: revenue ÷ orders, rounded to 2 decimal places
- `delivered_pct`: delivered orders as a percentage of **all** orders, rounded to 1 decimal place
- `repeat_pct`: buyers with 2 or more non-cancelled orders as a percentage of buyers, rounded to 1 decimal place

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT *
FROM order_values;
```

## Hints

1. Most metrics come from the `order_values` CTE. `delivered_pct` needs all orders, including cancelled ones, so it needs its own subquery.
2. For `repeat_pct`, count orders per buyer in another CTE.
3. Combine them with scalar subqueries: `(SELECT ... FROM order_values) AS revenue`, and so on.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
per_buyer AS (
  SELECT customer_id, COUNT(*) AS orders FROM order_values GROUP BY customer_id
)
SELECT
  (SELECT ROUND(SUM(order_value), 2) FROM order_values) AS revenue,
  (SELECT COUNT(*) FROM order_values) AS orders,
  (SELECT COUNT(*) FROM per_buyer) AS buyers,
  (SELECT ROUND(SUM(order_value) / COUNT(*), 2) FROM order_values) AS aov,
  (SELECT ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*), 1) FROM orders) AS delivered_pct,
  (SELECT ROUND(100.0 * SUM(CASE WHEN orders >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) FROM per_buyer) AS repeat_pct;
```

## Expected result

| revenue | orders | buyers | aov | delivered_pct | repeat_pct |
| --- | --- | --- | --- | --- | --- |
| 133.46 | 5 | 3 | 26.69 | 50 | 66.7 |

## Explanation

Each metric has its own population: revenue, orders and AOV exclude cancellations, the delivery rate counts every order, and the repeat rate counts buyers. Writing each as a separate subquery keeps those definitions from interfering with one another.
