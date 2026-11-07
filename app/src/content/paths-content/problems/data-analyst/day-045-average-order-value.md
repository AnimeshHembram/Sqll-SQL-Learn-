---
id: da-day-045
title: Average order value
order: 45
difficulty: intermediate
topic: Metrics
summary: Calculate AOV correctly: total revenue divided by number of orders, not the average line.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate average order value
  - Choose the right denominator
prerequisites:
  - Day 30
  - Day 11
---

## Task

Average order value (AOV) is total revenue divided by the number of orders. Return one row with `aov`, for non-cancelled orders, rounded to 2 decimal places.

## Starter query

```sql
SELECT ROUND(AVG(oi.quantity * oi.unit_price), 2) AS aov
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Hints

1. The starter query averages order *lines*. An order with two lines counts twice.
2. Divide the total revenue by the number of different orders.
3. `ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS aov`

## Solution

```sql
SELECT ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS aov
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Expected result

| aov |
| --- |
| 26.69 |

## Explanation

133.46 of revenue across 5 orders gives an AOV of 26.69. The starter query answers a different question, the average line value (16.68), because the join produces one row per line.

## Other accepted answers

```sql
SELECT ROUND(AVG(order_value), 2) AS aov FROM (SELECT SUM(oi.quantity * oi.unit_price) AS order_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id);
```

## Wrong answers

Feedback: incorrect-output

```sql
SELECT ROUND(AVG(oi.quantity * oi.unit_price), 2) AS aov FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled';
```
