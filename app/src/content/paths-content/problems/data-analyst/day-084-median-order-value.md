---
id: da-day-084
title: Median order value
order: 84
difficulty: advanced
topic: Metrics
summary: Calculate a median in SQLite, which has no MEDIAN function.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate a median with window functions
prerequisites:
  - Day 45
  - Day 54
---

## Task

Averages are pulled up by large orders, so finance also wants the **median** value of non-cancelled orders. Return one row with `median_order_value`, rounded to 2 decimal places. Your query should also work when the number of orders is even.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT order_value
FROM order_values
ORDER BY order_value;
```

## Hints

1. Number the orders by value with `ROW_NUMBER() OVER (ORDER BY order_value)` and count them with `COUNT(*) OVER ()`.
2. The middle position is `(cnt + 1) / 2` for an odd count; for an even count, average positions `cnt / 2` and `cnt / 2 + 1`. Integer division makes `rn IN ((cnt + 1) / 2, (cnt + 2) / 2)` cover both cases.
3. `SELECT ROUND(AVG(order_value), 2) AS median_order_value FROM ranked WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)`

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
ranked AS (
  SELECT order_value,
    ROW_NUMBER() OVER (ORDER BY order_value) AS rn,
    COUNT(*) OVER () AS cnt
  FROM order_values
)
SELECT ROUND(AVG(order_value), 2) AS median_order_value
FROM ranked
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2);
```

## Expected result

| median_order_value |
| --- |
| 29.25 |

## Explanation

With five orders, both expressions give position 3, so the median is the third value: 29.25, against an average of 26.69. With six orders they would give positions 3 and 4, and `AVG` would average the two. Here integer division is used on purpose.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_values AS (   SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value   FROM orders AS o   JOIN order_items AS oi ON oi.order_id = o.id   WHERE o.status <> 'cancelled'   GROUP BY o.id, o.customer_id, o.order_date ) SELECT ROUND(AVG(order_value), 2) AS median_order_value FROM order_values;
```
