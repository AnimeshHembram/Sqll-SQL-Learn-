---
id: da-back-within-60-days
title: Customers who came back within 60 days
order: 4
difficulty: advanced
topic: Retention
summary: Find buyers whose next purchase came within a time window after their first.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Test for a return within a time window
---

## Task

A loyalty programme rewards customers who buy again soon. Return the `name` of every buyer with another non-cancelled order **within 60 days after** their first non-cancelled order (later than the first order, and no more than 60 days after it). Row order does not matter.

## Starter query

```sql
SELECT customer_id, MIN(order_date) AS first_date
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id;
```

## Hints

1. Use the starter query as a CTE, then join `customers` for the names.
2. A later order within the window satisfies `o.order_date > f.first_date AND julianday(o.order_date) - julianday(f.first_date) <= 60`.
3. Keep the buyers for whom such an order `EXISTS`.

## Solution

```sql
WITH firsts AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
)
SELECT c.name
FROM firsts AS f
JOIN customers AS c ON c.id = f.customer_id
WHERE EXISTS (
  SELECT 1 FROM orders AS o
  WHERE o.customer_id = f.customer_id AND o.status <> 'cancelled'
    AND o.order_date > f.first_date
    AND julianday(o.order_date) - julianday(f.first_date) <= 60
);
```

## Expected result

| name |
| --- |
| Aisha Khan |
| Rahul Mehta |

## Explanation

Aisha Khan returned after 26 days and Rahul Mehta after 50, so both qualify; Daniel Kim has not ordered again. A window measured in days is fairer than calendar months: an order on 31 January and another on 1 February are in different months but only one day apart.

## Other accepted answers

```sql
WITH firsts AS (SELECT customer_id, MIN(order_date) AS first_date FROM orders WHERE status <> 'cancelled' GROUP BY customer_id) SELECT DISTINCT c.name FROM firsts AS f JOIN customers AS c ON c.id = f.customer_id JOIN orders AS o ON o.customer_id = f.customer_id AND o.status <> 'cancelled' AND o.order_date > f.first_date AND julianday(o.order_date) - julianday(f.first_date) <= 60;
```

## Wrong answers

Feedback: missing-rows

```sql
WITH firsts AS (SELECT customer_id, MIN(order_date) AS first_date FROM orders WHERE status <> 'cancelled' GROUP BY customer_id) SELECT c.name FROM firsts AS f JOIN customers AS c ON c.id = f.customer_id WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = f.customer_id AND o.status <> 'cancelled' AND o.order_date > f.first_date AND julianday(o.order_date) - julianday(f.first_date) <= 30);
```
