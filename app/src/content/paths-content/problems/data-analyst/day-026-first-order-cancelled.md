---
id: da-day-026
title: Customers whose first order was cancelled
order: 26
difficulty: advanced
topic: Subqueries and CTEs
summary: Use a CTE to find each customer's first order, then check its status.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Build a two-step analysis with a CTE
  - Join on two conditions
prerequisites:
  - Day 25
  - Data Analyst chapter: Subqueries and CTEs
---

## Task

A cancelled first order is a warning sign. Return the `name` of every customer whose **first** order (by date) was cancelled.

## Starter query

```sql
SELECT customer_id, MIN(order_date) AS first_date
FROM orders
GROUP BY customer_id;
```

## Hints

1. The starter query finds each customer's first order date. Make it a CTE.
2. Join the CTE back to `orders` on customer and date to get that order's status.
3. `WITH firsts AS (...) SELECT c.name FROM firsts AS f JOIN orders AS o ON o.customer_id = f.customer_id AND o.order_date = f.first_date JOIN customers AS c ON c.id = f.customer_id WHERE o.status = 'cancelled'`

## Solution

```sql
WITH firsts AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  GROUP BY customer_id
)
SELECT c.name
FROM firsts AS f
JOIN orders AS o ON o.customer_id = f.customer_id AND o.order_date = f.first_date
JOIN customers AS c ON c.id = f.customer_id
WHERE o.status = 'cancelled';
```

## Expected result

| name |
| --- |
| Sofia Rossi |

## Explanation

Step one finds each customer's first order date; step two looks that order up again to read its status. Sofia Rossi's only (and so first) order was cancelled.
