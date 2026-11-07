---
id: da-day-040
title: Running revenue total
order: 40
difficulty: advanced
topic: Window functions
summary: Accumulate a total over time with SUM() OVER (ORDER BY ...).
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate a running total
prerequisites:
  - Day 38
  - Day 30
---

## Task

Finance tracks revenue to date. For each non-cancelled order, return `order_date`, `order_value` (its `quantity * unit_price` total, rounded to 2 decimal places) and `revenue_to_date` (the running total of order values up to and including that order, rounded to 2 decimal places). Sort by `order_date`.

## Starter query

```sql
SELECT o.order_date, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS order_value
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY o.id, o.order_date
ORDER BY o.order_date;
```

## Hints

1. Keep the starter query: it gives one row per order with its value.
2. `SUM(x) OVER (ORDER BY order_date)` adds up `x` for every row up to the current one.
3. Add `ROUND(SUM(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY o.order_date), 2) AS revenue_to_date`, or do it in two steps with a CTE.

## Solution

```sql
WITH order_values AS (
  SELECT o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.order_date
)
SELECT order_date,
  ROUND(order_value, 2) AS order_value,
  ROUND(SUM(order_value) OVER (ORDER BY order_date), 2) AS revenue_to_date
FROM order_values
ORDER BY order_date;
```

## Expected result

| order_date | order_value | revenue_to_date |
| --- | --- | --- |
| 2025-01-10 | 32.97 | 32.97 |
| 2025-01-18 | 15.5 | 48.47 |
| 2025-02-05 | 29.25 | 77.72 |
| 2025-03-01 | 45.75 | 123.47 |
| 2025-03-09 | 9.99 | 133.46 |

## Explanation

With an `ORDER BY` inside `OVER`, `SUM` becomes a running total. Rounding only the displayed numbers, after adding, avoids small rounding errors building up. The last row equals total revenue: 133.46.

## Other accepted answers

```sql
SELECT o.order_date, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS order_value, ROUND(SUM(SUM(oi.quantity * oi.unit_price)) OVER (ORDER BY o.order_date), 2) AS revenue_to_date FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id, o.order_date ORDER BY o.order_date;
```
