---
id: da-top-spender-per-city
title: Top spender in each city, ties kept
order: 3
difficulty: advanced
topic: Ties
summary: Rank customers by spend within their city and keep every customer tied for first.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Keep tied rows when picking the top per group
---

## Task

For a city ambassador programme, return the customer with the **highest non-cancelled spend** in each city, keeping all customers if several tie for first: `city`, `name` and `spend` (rounded to 2 decimal places). Only customers who have spent something are considered. Row order does not matter.

## Starter query

```sql
SELECT c.city, c.name, o.id AS order_id, oi.quantity * oi.unit_price AS line_value
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Hints

1. First total each customer's spend in a CTE, grouped by customer and city.
2. Rank within each city with `RANK()` so that tied customers share first place.
3. Keep rank 1 in the outer query.

## Solution

```sql
WITH spend AS (
  SELECT c.city, c.name, SUM(oi.quantity * oi.unit_price) AS spend
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.id
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY c.id, c.city, c.name
),
ranked AS (
  SELECT city, name, spend, RANK() OVER (PARTITION BY city ORDER BY spend DESC) AS place
  FROM spend
)
SELECT city, name, ROUND(spend, 2) AS spend
FROM ranked
WHERE place = 1;
```

## Expected result

| city | name | spend |
| --- | --- | --- |
| Bangalore | Aisha Khan | 62.22 |
| Mumbai | Rahul Mehta | 25.49 |

## Explanation

Aisha Khan leads Bangalore with 62.22 and Rahul Mehta is Mumbai's only buyer. There is no tie in this data, but using `RANK()` means a future tie would show both customers instead of silently dropping one, which matters for a programme that rewards people.

## Other accepted answers

```sql
WITH spend AS (SELECT c.city, c.name, SUM(oi.quantity * oi.unit_price) AS spend FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY c.id, c.city, c.name) SELECT s.city, s.name, ROUND(s.spend, 2) AS spend FROM spend AS s WHERE s.spend = (SELECT MAX(t.spend) FROM spend AS t WHERE t.city IS s.city);
```

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.city, c.name, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS spend FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY c.id, c.city, c.name;
```
