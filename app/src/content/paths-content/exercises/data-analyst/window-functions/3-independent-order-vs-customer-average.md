---
id: da-order-vs-customer-average
title: Each order against the customer's average
order: 3
difficulty: advanced
topic: Aggregate windows
summary: Put each customer's average order value beside each of their orders.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Compare a row with its own group
---

## Task

For every non-cancelled order, return `id`, `customer_id`, `order_value`, `customer_avg` (the customer's average non-cancelled order value) and `difference` (`order_value` minus `customer_avg`). Round the three money columns to 2 decimal places. Sort by `customer_id`, then `id`.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT id, customer_id, order_value
FROM order_values;
```

## Hints

1. The starter CTE gives one row per order with its value. Add the window in the final `SELECT`.
2. The customer's average is `AVG(order_value) OVER (PARTITION BY customer_id)`.
3. Subtract it from `order_value` for the difference, then round each money column.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT id, customer_id,
  ROUND(order_value, 2) AS order_value,
  ROUND(AVG(order_value) OVER (PARTITION BY customer_id), 2) AS customer_avg,
  ROUND(order_value - AVG(order_value) OVER (PARTITION BY customer_id), 2) AS difference
FROM order_values
ORDER BY customer_id, id;
```

## Expected result

| id | customer_id | order_value | customer_avg | difference |
| --- | --- | --- | --- | --- |
| 1 | 1 | 32.97 | 31.11 | 1.86 |
| 3 | 1 | 29.25 | 31.11 | -1.86 |
| 2 | 2 | 15.5 | 12.75 | 2.75 |
| 6 | 2 | 9.99 | 12.75 | -2.76 |
| 5 | 4 | 45.75 | 45.75 | 0 |

## Explanation

Aisha Khan's two orders average 31.11, so her first is 1.86 above and her second 1.86 below. Customers with a single order are exactly at their average. The window is calculated on the CTE's one-row-per-order result, so each order counts once in its customer's average.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_values AS ( SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id, o.customer_id, o.order_date ) SELECT id, customer_id, ROUND(order_value, 2) AS order_value, ROUND(AVG(order_value) OVER (), 2) AS customer_avg, ROUND(order_value - AVG(order_value) OVER (), 2) AS difference FROM order_values ORDER BY customer_id, id;
```
