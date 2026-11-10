---
id: da-day-083
title: Share of revenue from returning orders
order: 83
difficulty: advanced
topic: Metrics
summary: Split revenue between customers' first orders and their repeat orders.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Split a total by order sequence
prerequisites:
  - Day 51
  - Day 46
---

## Task

What percentage of non-cancelled revenue comes from **returning** orders (any non-cancelled order after the customer's first non-cancelled one)? Return one row with `returning_pct`, rounded to 1 decimal place.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT customer_id, order_date, order_value
FROM order_values;
```

## Hints

1. Number each customer's orders in the CTE output with `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date)`.
2. Returning orders have a number above 1. Sum their value with `SUM(CASE WHEN ... THEN order_value ELSE 0 END)`.
3. Divide by `SUM(order_value)` and multiply by `100.0`.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
numbered AS (
  SELECT order_value,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number
  FROM order_values
)
SELECT ROUND(100.0 * SUM(CASE WHEN order_number > 1 THEN order_value ELSE 0 END) / SUM(order_value), 1) AS returning_pct
FROM numbered;
```

## Expected result

| returning_pct |
| --- |
| 29.4 |

## Explanation

Two returning orders (29.25 and 9.99) bring in 39.24 of 133.46, or 29.4%. A rising share means growth is coming from keeping customers rather than finding new ones.
