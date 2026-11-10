---
id: da-day-081
title: Customers who spend more than their city's average
order: 81
difficulty: advanced
topic: Segmentation
summary: Compare each customer with the average of their own group using AVG() OVER (PARTITION BY ...).
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
  - Compare a row with its group average
prerequisites:
  - Day 42
  - Day 43
---

## Task

Among customers with non-cancelled revenue, return those who spend **more than the average buyer in their own city**: `name`, `city` and `revenue` (rounded to 2 decimal places). Row order does not matter.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT c.name, c.city, SUM(v.order_value) AS revenue
FROM order_values AS v
JOIN customers AS c ON c.id = v.customer_id
GROUP BY c.id, c.name, c.city;
```

## Hints

1. Each buyer's city average is `AVG(revenue) OVER (PARTITION BY city)`.
2. A window result cannot go in `WHERE` of the same query. Calculate it in a CTE, then filter.
3. Add `spend AS (starter query)`, then `SELECT name, city, ROUND(revenue, 2) ... FROM (SELECT *, AVG(revenue) OVER (PARTITION BY city) AS city_avg FROM spend) WHERE revenue > city_avg`.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
spend AS (
  SELECT c.name, c.city, SUM(v.order_value) AS revenue
  FROM order_values AS v
  JOIN customers AS c ON c.id = v.customer_id
  GROUP BY c.id, c.name, c.city
),
compared AS (
  SELECT name, city, revenue, AVG(revenue) OVER (PARTITION BY city) AS city_avg
  FROM spend
)
SELECT name, city, ROUND(revenue, 2) AS revenue
FROM compared
WHERE revenue > city_avg;
```

## Expected result

| name | city | revenue |
| --- | --- | --- |
| Aisha Khan | Bangalore | 62.22 |

## Explanation

Bangalore's two buyers average 53.99, and Aisha Khan (62.22) is above it. Rahul Mehta is Mumbai's only buyer, so he equals his city's average and is not above it. Comparing within a group is fairer than comparing with everyone.

## Wrong answers

Feedback: extra-rows

```sql
WITH order_values AS (   SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value   FROM orders AS o   JOIN order_items AS oi ON oi.order_id = o.id   WHERE o.status <> 'cancelled'   GROUP BY o.id, o.customer_id, o.order_date ), spend AS (SELECT c.name, c.city, SUM(v.order_value) AS revenue FROM order_values AS v JOIN customers AS c ON c.id = v.customer_id GROUP BY c.id, c.name, c.city) SELECT name, city, ROUND(revenue, 2) AS revenue FROM spend WHERE revenue > (SELECT AVG(revenue) FROM spend);
```
