---
id: da-big-spenders
title: Customers who spend more than average
order: 3
difficulty: advanced
topic: Multi-step CTE
summary: Calculate each customer's spend, then keep the customers above the average spend.
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
  - Build an analysis in two steps with WITH
  - Compare each row with an average calculated from a CTE
---

## Task

Marketing wants to thank its best customers. Spend is the total of `quantity * unit_price` over a customer's orders, **not counting cancelled orders**. Return the customers whose spend is **higher than the average spend of the customers who have any**, with:

- `name`
- `spend`: rounded to 2 decimal places

Row order does not matter.

## Starter query

```sql
SELECT *
FROM customers;
```

## Hints

1. Step 1: a CTE with one row per customer and their spend (join orders to order_items, exclude cancelled, group by customer).
2. Step 2: keep rows where the spend is greater than `(SELECT AVG(spend) FROM your_cte)`.
3. Join the result to `customers` for the names, and round the spend in the final `SELECT`.

## Solution

```sql
WITH customer_spend AS (
  SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS spend
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
)
SELECT c.name, ROUND(cs.spend, 2) AS spend
FROM customer_spend AS cs
JOIN customers AS c ON c.id = cs.customer_id
WHERE cs.spend > (SELECT AVG(spend) FROM customer_spend);
```

## Expected result

| name | spend |
| --- | --- |
| Aisha Khan | 62.22 |
| Daniel Kim | 45.75 |

## Explanation

Three customers have spend from non-cancelled orders: 62.22, 45.75 and 25.49. Their average is about 44.49, so Aisha Khan and Daniel Kim are above it. Calculating the spend once in a CTE lets the same step feed both the comparison and the result.
