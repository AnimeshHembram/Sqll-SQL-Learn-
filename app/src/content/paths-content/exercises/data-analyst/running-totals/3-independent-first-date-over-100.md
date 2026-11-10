---
id: da-first-date-over-100
title: The day revenue passed 100
order: 3
difficulty: advanced
topic: Running totals
summary: Find the first point at which a running total crosses a threshold.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Find when a running total crosses a threshold
---

## Task

The team celebrates when net revenue to date first reaches **100**. Return one row with `order_date` (the first order date on which revenue to date was 100 or more) and `revenue_to_date` on that date (rounded to 2 decimal places).

## Starter query

```sql
WITH order_values AS (
  SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.order_date
)
SELECT order_date, order_value
FROM order_values
ORDER BY order_date;
```

## Hints

1. Add the running total in a second CTE; a window cannot be filtered in the same `SELECT`.
2. Keep the rows where the running total is at least 100 and take the earliest.
3. `... WHERE revenue_to_date >= 100 ORDER BY order_date LIMIT 1`

## Solution

```sql
WITH order_values AS (
  SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.order_date
),
running AS (
  SELECT order_date, SUM(order_value) OVER (ORDER BY order_date) AS revenue_to_date
  FROM order_values
)
SELECT order_date, ROUND(revenue_to_date, 2) AS revenue_to_date
FROM running
WHERE revenue_to_date >= 100
ORDER BY order_date
LIMIT 1;
```

## Expected result

| order_date | revenue_to_date |
| --- | --- |
| 2025-03-01 | 123.47 |

## Explanation

Revenue stood at 77.72 after 5 February and jumped to 123.47 with the order of 1 March, the first day at or above 100. Every later day is also above 100, so the earliest matching row is the answer.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_values AS (SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id, o.order_date) SELECT order_date, ROUND(order_value, 2) AS revenue_to_date FROM order_values WHERE order_value >= 30 ORDER BY order_date LIMIT 1;
```
