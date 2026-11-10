---
id: da-fix-average-spend
title: Fix the average spend per customer
order: 4
difficulty: advanced
topic: Review
summary: A metric silently leaves out customers who spent nothing. Find out why and fix it.
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
  - Check who is included in a metric
  - Handle NULL in averages
---

## Task

The metric "average net spend per customer" must include **every** customer, counting customers who have spent nothing as 0. The starter query reports a much higher figure. Fix it so it returns one row with `avg_spend`, rounded to 2 decimal places.

## Starter query

```sql
WITH spend AS (
  SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS spend
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
)
SELECT ROUND(AVG(spend), 2) AS avg_spend
FROM spend;
```

## Hints

1. Which customers are in the `spend` CTE? Who is missing from it?
2. Start from `customers` and `LEFT JOIN` the spend, so every customer has a row.
3. Customers without spend have `NULL`, and `AVG` ignores `NULL`. Use `AVG(COALESCE(s.spend, 0))`.

## Solution

```sql
WITH spend AS (
  SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS spend
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.customer_id
)
SELECT ROUND(AVG(COALESCE(s.spend, 0)), 2) AS avg_spend
FROM customers AS c
LEFT JOIN spend AS s ON s.customer_id = c.id;
```

## Expected result

| avg_spend |
| --- |
| 26.69 |

## Explanation

The starter query averaged only the three buyers (44.49). Counting all five customers, with Sofia Rossi and Meera Pillai at 0, gives 26.69. There were two traps: the CTE only contained buyers, and even after a `LEFT JOIN`, `AVG` skips `NULL` values unless they are turned into 0.

## Wrong answers

Feedback: incorrect-output

```sql
WITH spend AS (SELECT o.customer_id, SUM(oi.quantity * oi.unit_price) AS spend FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.customer_id) SELECT ROUND(AVG(s.spend), 2) AS avg_spend FROM customers AS c LEFT JOIN spend AS s ON s.customer_id = c.id;
```
