---
id: da-day-092
title: Match orders to shipping fee bands
order: 92
difficulty: intermediate
topic: Joins
summary: Join on a range instead of an equal key, with an open-ended top band.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Join on a range condition
  - Handle an open-ended band with IS NULL
prerequisites:
  - Day 20
  - Day 45
---

## Task

Shipping is charged by order value, using the bands in the starter query: an order belongs to the band where `min_value <= order value < max_value`, and the top band has no upper limit (`max_value` is `NULL`). For each **non-cancelled** order, return `order_id`, `order_value` (rounded to 2 decimal places) and `fee`. Sort by `order_id`.

An order worth exactly 15.50 belongs to the second band, not the first.

## Starter query

```sql
WITH fee_bands(min_value, max_value, fee) AS (
  VALUES (0.00, 15.50, 4.99), (15.50, 30.00, 2.99), (30.00, NULL, 0.00)
),
order_values AS (
  SELECT o.id AS order_id, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id
)
SELECT order_id, ROUND(order_value, 2) AS order_value
FROM order_values
ORDER BY order_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Both CTEs are ready: `fee_bands` and `order_values`.
2. Join the two on a condition, not an equal key: `ON v.order_value >= f.min_value AND v.order_value < f.max_value`.
3. The top band has `max_value IS NULL`, and `x < NULL` is never true. Write `(f.max_value IS NULL OR v.order_value < f.max_value)`.

## Solution

```sql
WITH fee_bands(min_value, max_value, fee) AS (
  VALUES (0.00, 15.50, 4.99), (15.50, 30.00, 2.99), (30.00, NULL, 0.00)
),
order_values AS (
  SELECT o.id AS order_id, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id
)
SELECT v.order_id, ROUND(v.order_value, 2) AS order_value, f.fee
FROM order_values AS v
JOIN fee_bands AS f
  ON v.order_value >= f.min_value
 AND (f.max_value IS NULL OR v.order_value < f.max_value)
ORDER BY v.order_id;
```

## Expected result

| order_id | order_value | fee |
| --- | --- | --- |
| 1 | 32.97 | 0 |
| 2 | 15.5 | 2.99 |
| 3 | 29.25 | 2.99 |
| 5 | 45.75 | 0 |
| 6 | 9.99 | 4.99 |

## Explanation

A join condition can be any expression. A **range join** like this one matches each order to the band whose limits surround its value, which is how price tiers, tax brackets and age groups are applied from a table instead of a long `CASE`.

Order 2 is worth exactly 15.50. Because the lower limit is inclusive and the upper limit exclusive, it falls in exactly one band. Orders 1 and 5 are above 30 and only match because of the `IS NULL` test on the open top band.

**Common mistake:** `BETWEEN min_value AND max_value` includes both ends, so a value on a boundary matches two bands and the order appears twice.

## Wrong answers

Feedback: extra-rows

```sql
WITH fee_bands(min_value, max_value, fee) AS ( VALUES (0.00, 15.50, 4.99), (15.50, 30.00, 2.99), (30.00, NULL, 0.00) ), order_values AS ( SELECT o.id AS order_id, SUM(oi.quantity * oi.unit_price) AS order_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id ) SELECT v.order_id, ROUND(v.order_value, 2) AS order_value, f.fee FROM order_values AS v JOIN fee_bands AS f ON v.order_value BETWEEN f.min_value AND COALESCE(f.max_value, 1e9) ORDER BY v.order_id;
```

Feedback: missing-rows

```sql
WITH fee_bands(min_value, max_value, fee) AS ( VALUES (0.00, 15.50, 4.99), (15.50, 30.00, 2.99), (30.00, NULL, 0.00) ), order_values AS ( SELECT o.id AS order_id, SUM(oi.quantity * oi.unit_price) AS order_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id ) SELECT v.order_id, ROUND(v.order_value, 2) AS order_value, f.fee FROM order_values AS v JOIN fee_bands AS f ON v.order_value >= f.min_value AND v.order_value < f.max_value ORDER BY v.order_id;
```
