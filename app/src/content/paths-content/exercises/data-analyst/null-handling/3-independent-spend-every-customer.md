---
id: da-spend-every-customer
title: Spend for every customer, including zero
order: 3
difficulty: advanced
topic: LEFT JOIN and COALESCE
summary: List every customer with their spend from non-cancelled orders, showing 0 for customers with none.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Keep every customer with LEFT JOIN
  - Exclude some orders without dropping customers
  - Turn a missing total into 0 with COALESCE
---

## Task

Finance wants a row for **every** customer with:

- `name`
- `spend`: the total of `quantity * unit_price` over the customer's orders that are **not cancelled**, rounded to 2 decimal places, and `0` for customers with no such orders

Row order does not matter.

## Starter query

```sql
SELECT name
FROM customers;
```

## Hints

1. An inner join drops customers without orders, so use `LEFT JOIN` for both `orders` and `order_items`.
2. If you exclude cancelled orders in `WHERE`, customers with only cancelled orders disappear. Put the condition in the `ON` of the orders join instead.
3. `LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'`, then `COALESCE(ROUND(SUM(oi.quantity * oi.unit_price), 2), 0) AS spend` and `GROUP BY c.name`.

## Solution

```sql
SELECT c.name,
  COALESCE(ROUND(SUM(oi.quantity * oi.unit_price), 2), 0) AS spend
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'
LEFT JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY c.name;
```

## Expected result

| name | spend |
| --- | --- |
| Aisha Khan | 62.22 |
| Daniel Kim | 45.75 |
| Meera Pillai | 0 |
| Rahul Mehta | 25.49 |
| Sofia Rossi | 0 |

## Explanation

Both joins are `LEFT JOIN`s, so every customer stays. The status condition sits in the `ON` clause: Sofia Rossi's cancelled order is not joined, but she keeps her row. For her and Meera Pillai, `SUM` has only `NULL` values and returns `NULL`, which `COALESCE` turns into 0.

## Wrong answers

Feedback: missing-rows

```sql
SELECT c.name, COALESCE(ROUND(SUM(oi.quantity * oi.unit_price), 2), 0) AS spend FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id LEFT JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY c.name;
```
