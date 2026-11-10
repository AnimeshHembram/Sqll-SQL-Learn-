---
id: da-day-085
title: Flag unusually large orders
order: 85
difficulty: intermediate
topic: Metrics
summary: Compare each row with an overall average using AVG() OVER ().
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Flag outliers against an average
prerequisites:
  - Day 50
  - Day 45
---

## Task

Flag non-cancelled orders worth **more than 1.5 times the average** non-cancelled order. Return `id` and `order_value` (rounded to 2 decimal places). Row order does not matter.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT id, order_value
FROM order_values;
```

## Hints

1. `AVG(order_value) OVER ()` puts the overall average on every row.
2. Calculate it in another CTE and filter in the outer query.
3. `WHERE order_value > 1.5 * avg_value`

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
with_avg AS (
  SELECT id, order_value, AVG(order_value) OVER () AS avg_value
  FROM order_values
)
SELECT id, ROUND(order_value, 2) AS order_value
FROM with_avg
WHERE order_value > 1.5 * avg_value;
```

## Expected result

| id | order_value |
| --- | --- |
| 5 | 45.75 |

## Explanation

The average order is 26.69, so the threshold is 40.04. Only order 5 (45.75) is above it. A simple rule like this is a quick first check for errors or special deals before deeper analysis.

## Other accepted answers

```sql
WITH order_values AS (   SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value   FROM orders AS o   JOIN order_items AS oi ON oi.order_id = o.id   WHERE o.status <> 'cancelled'   GROUP BY o.id, o.customer_id, o.order_date ) SELECT id, ROUND(order_value, 2) AS order_value FROM order_values WHERE order_value > 1.5 * (SELECT AVG(order_value) FROM order_values);
```
