---
id: da-day-063
title: Three-order moving average
order: 63
difficulty: advanced
topic: Window functions
summary: Smooth a noisy series with a window frame: ROWS BETWEEN ... PRECEDING AND CURRENT ROW.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Use a window frame for a moving average
prerequisites:
  - Day 40
---

## Task

Order values jump around, so finance watches a **moving average of the last three orders** (non-cancelled, by date). Return `order_date`, `order_value` (rounded to 2 decimal places) and `moving_avg`: the average of this order and up to two orders before it, rounded to 2 decimal places. Sort by `order_date`.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT order_date, ROUND(order_value, 2) AS order_value
FROM order_values
ORDER BY order_date;
```

## Hints

1. A window frame limits which rows the window uses. `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` means this row and the two before it.
2. Combine it with an order: `AVG(order_value) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`.
3. Round the result: `ROUND(AVG(order_value) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg`.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT order_date, ROUND(order_value, 2) AS order_value,
  ROUND(AVG(order_value) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg
FROM order_values
ORDER BY order_date;
```

## Expected result

| order_date | order_value | moving_avg |
| --- | --- | --- |
| 2025-01-10 | 32.97 | 32.97 |
| 2025-01-18 | 15.5 | 24.23 |
| 2025-02-05 | 29.25 | 25.91 |
| 2025-03-01 | 45.75 | 30.17 |
| 2025-03-09 | 9.99 | 28.33 |

## Explanation

The first two rows average fewer than three orders because there are not enough earlier rows. Moving averages hide single spikes, such as the 45.75 order on 1 March, and make the trend easier to read.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_values AS (   SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value   FROM orders AS o   JOIN order_items AS oi ON oi.order_id = o.id   WHERE o.status <> 'cancelled'   GROUP BY o.id, o.customer_id, o.order_date ) SELECT order_date, ROUND(order_value, 2) AS order_value, ROUND(AVG(order_value) OVER (ORDER BY order_date), 2) AS moving_avg FROM order_values ORDER BY order_date;
```
