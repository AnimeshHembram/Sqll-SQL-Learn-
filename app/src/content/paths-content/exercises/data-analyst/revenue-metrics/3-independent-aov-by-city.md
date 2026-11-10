---
id: da-aov-by-city
title: Average order value by city
order: 3
difficulty: intermediate
topic: Average order value
summary: Calculate orders and average order value for each customer city.
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
  - Calculate a ratio metric per group
---

## Task

The marketing team plans city campaigns. For each customer city with non-cancelled orders, return `city`, `orders` and `aov` (net revenue divided by orders, rounded to 2 decimal places). Row order does not matter.

## Starter query

```sql
SELECT c.city, o.id, oi.quantity * oi.unit_price AS line_value
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id;
```

## Hints

1. The starter query is missing the cancelled-order filter.
2. Group by city. Inside each city, count orders once each with `COUNT(DISTINCT o.id)`.
3. `ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS aov`

## Solution

```sql
SELECT c.city, COUNT(DISTINCT o.id) AS orders,
  ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS aov
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY c.city;
```

## Expected result

| city | orders | aov |
| --- | --- | --- |
| Bangalore | 3 | 35.99 |
| Mumbai | 2 | 12.75 |

## Explanation

Bangalore's three orders average 35.99, Mumbai's two average 12.75. The customer without a city has only a cancelled order, so no row is left for her once cancelled orders are removed. Calculating AOV per group keeps each group's own denominator.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT c.city, COUNT(*) AS orders, ROUND(AVG(oi.quantity * oi.unit_price), 2) AS aov FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY c.city;
```

Feedback: extra-rows

```sql
SELECT c.city, COUNT(DISTINCT o.id) AS orders, ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS aov FROM customers AS c JOIN orders AS o ON o.customer_id = c.id JOIN order_items AS oi ON oi.order_id = o.id GROUP BY c.city;
```
