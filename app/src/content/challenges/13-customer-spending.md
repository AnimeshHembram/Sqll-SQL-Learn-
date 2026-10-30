---
id: customer-spending
title: Who spends the most?
order: 13
difficulty: advanced
topic: CTEs
summary: Build order totals in a common table expression, then rank customers by what they spent.
duration: 15
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Break a query into steps with a common table expression (WITH)
  - Join three tables
  - Exclude rows before aggregating
prerequisites:
  - INNER JOIN (see the challenge "Where do the authors come from?")
  - GROUP BY and SUM, and ROUND (see "Summarise the prices")
  - Common table expressions, explained in the task below
---

## Task

Rank the customers by how much they have spent. Return two columns:

- `name`: the customer's name
- `total_spent`: the total of `quantity * unit_price` over all their **non-cancelled** orders, rounded to 2 decimal places

Leave out cancelled orders (`status = 'cancelled'`) and customers who have spent nothing. Sort from the highest total to the lowest. Row order matters.

**Before you start:** a common table expression (CTE) names a query with `WITH`, so the main query can use it like a table. CTEs let you build a complicated answer in readable steps.

```sql syntax
WITH step_name AS (
  SELECT ...
)
SELECT ... FROM step_name;
```

## Starter query

```sql
WITH order_totals AS (
  SELECT order_id, SUM(quantity * unit_price) AS order_total
  FROM order_items
  GROUP BY order_id
)
SELECT *
FROM order_totals;
```

## Hints

1. The starter query already calculates each order's total. Next, connect each total to its order and customer.
2. Join `order_totals` to `orders` (on `order_id = orders.id`) and `orders` to `customers` (on `customer_id = customers.id`), and keep only orders whose status is not `'cancelled'`.
3. Finish with `GROUP BY customers.id, customers.name`, `ROUND(SUM(order_total), 2) AS total_spent` and `ORDER BY total_spent DESC`.

## Solution

```sql
WITH order_totals AS (
  SELECT order_id, SUM(quantity * unit_price) AS order_total
  FROM order_items
  GROUP BY order_id
)
SELECT c.name, ROUND(SUM(t.order_total), 2) AS total_spent
FROM order_totals AS t
JOIN orders AS o ON o.id = t.order_id
JOIN customers AS c ON c.id = o.customer_id
WHERE o.status <> 'cancelled'
GROUP BY c.id, c.name
ORDER BY total_spent DESC;
```

## Expected result

| name | total_spent |
| --- | --- |
| Aisha Khan | 62.22 |
| Daniel Kim | 45.75 |
| Rahul Mehta | 25.49 |

## Explanation

The CTE turns the order items into one total per order. The main query joins each total to its order, to filter out the cancelled one, and to its customer, to get the name. Grouping by customer then adds up each customer's orders.

Sofia Rossi's only order was cancelled and Meera Pillai has not ordered, so neither appears. Grouping by `c.id` as well as `c.name` keeps two customers with the same name apart.

## Other accepted answers

```sql
SELECT c.name, ROUND(SUM(i.quantity * i.unit_price), 2) AS total_spent
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS i ON i.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY c.id
ORDER BY total_spent DESC;
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.name, ROUND(SUM(i.quantity * i.unit_price), 2) AS total_spent FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS i ON i.order_id = o.id GROUP BY c.id ORDER BY total_spent DESC;
```

Feedback: wrong-order

```sql
SELECT c.name, ROUND(SUM(i.quantity * i.unit_price), 2) AS total_spent FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS i ON i.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY c.id ORDER BY total_spent;
```

Feedback: execution-failure

```sql
DELETE FROM orders WHERE status = 'cancelled';
```
