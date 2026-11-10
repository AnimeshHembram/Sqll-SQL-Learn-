---
id: da-biggest-order-per-customer
title: Each customer's biggest order
order: 1
difficulty: intermediate
topic: Top row per group
summary: Keep the highest-value order of each customer, with its id.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Keep the top row per group with its details
---

## Task

For thank-you notes, return each buyer's **largest non-cancelled order**: `name`, `order_id` and `order_value` (rounded to 2 decimal places). Row order does not matter.

**Steps**

1. The starter query has one row per non-cancelled order with its value. Number each customer's orders from largest to smallest in a second CTE.
2. `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_value DESC) AS rn`
3. In the outer query, keep `rn = 1` and join `customers` for the name.

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

1. `MAX(order_value)` per customer would give the value but not the order id.
2. The filter on `rn` must be outside the CTE that calculates it.
3. `... ranked AS (SELECT id, customer_id, order_value, ROW_NUMBER() OVER (...) AS rn FROM order_values) SELECT c.name, r.id AS order_id, ROUND(r.order_value, 2) AS order_value FROM ranked AS r JOIN customers AS c ON c.id = r.customer_id WHERE r.rn = 1`

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
  SELECT id, customer_id, order_value,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_value DESC) AS rn
  FROM order_values
)
SELECT c.name, r.id AS order_id, ROUND(r.order_value, 2) AS order_value
FROM ranked AS r
JOIN customers AS c ON c.id = r.customer_id
WHERE r.rn = 1;
```

## Expected result

| name | order_id | order_value |
| --- | --- | --- |
| Aisha Khan | 1 | 32.97 |
| Rahul Mehta | 2 | 15.5 |
| Daniel Kim | 5 | 45.75 |

## Explanation

Aisha Khan's largest order is order 1 (32.97), Rahul Mehta's is order 2 (15.50) and Daniel Kim's only order is his largest. Numbering inside each customer keeps the whole row, so the order id comes along with the value.

## Wrong answers

Feedback: extra-rows

```sql
WITH order_values AS ( SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id, o.customer_id, o.order_date ) SELECT c.name, v.id AS order_id, ROUND(v.order_value, 2) AS order_value FROM order_values AS v JOIN customers AS c ON c.id = v.customer_id;
```
