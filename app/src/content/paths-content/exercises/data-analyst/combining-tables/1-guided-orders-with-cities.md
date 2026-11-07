---
id: da-orders-with-cities
title: Where each order was placed from
order: 1
difficulty: beginner
topic: JOIN
summary: Join orders to customers to show the city each order came from.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - orders
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Join two tables on a key
  - Use table aliases to name columns from each table
---

## Task

The delivery team wants to see where orders come from. Return one row per order with two columns:

- `order_id`: the order's id
- `city`: the city of the customer who placed it

Row order does not matter. One customer has not given a city, so one row will show `NULL`. That is correct: keep it.

**Steps**

1. The starter query already reads the orders. Add `JOIN customers AS c ON ...` after the `FROM` line.
2. Orders refer to customers through `customer_id`, which matches `customers.id`.
3. Add `c.city AS city` to the `SELECT` list.

## Starter query

```sql
SELECT o.id AS order_id
FROM orders AS o;
```

## Hints

1. A join needs a second table and a condition that says which rows belong together.
2. The condition is `o.customer_id = c.id`.
3. The full `FROM` part is `FROM orders AS o JOIN customers AS c ON o.customer_id = c.id`.

## Solution

```sql
SELECT o.id AS order_id, c.city AS city
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id;
```

## Expected result

| order_id | city |
| --- | --- |
| 1 | Bangalore |
| 2 | Mumbai |
| 3 | Bangalore |
| 4 | NULL |
| 5 | Bangalore |
| 6 | Mumbai |

## Explanation

Each order has exactly one customer, so the join returns one row per order. Order 4 was placed by Sofia Rossi, whose city is unknown, so its city is `NULL`.

## Wrong answers

Feedback: column-mismatch

```sql
SELECT o.id AS order_id FROM orders AS o JOIN customers AS c ON o.customer_id = c.id;
```
