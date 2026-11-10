---
id: da-revenue-per-buyer
title: Revenue per buyer
order: 2
difficulty: intermediate
topic: Ratio metrics
summary: Divide revenue by the number of different customers who bought.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Choose the denominator of a metric
---

## Task

Finance tracks how much the average **buyer** spends. Return one row with `buyers` (different customers with a non-cancelled order), `revenue` (net, rounded to 2 decimal places) and `revenue_per_buyer` (rounded to 2 decimal places).

**Steps**

1. Start from the join of orders and order lines, without cancelled orders.
2. Count buyers with `COUNT(DISTINCT o.customer_id)`: a customer with several orders counts once.
3. Divide the revenue total by that count.

## Starter query

```sql
SELECT o.customer_id, oi.quantity * oi.unit_price AS line_value
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Hints

1. One row for the whole result: use aggregates and no `GROUP BY`.
2. `COUNT(o.customer_id)` would count lines; add `DISTINCT`.
3. `ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.customer_id), 2) AS revenue_per_buyer`

## Solution

```sql
SELECT COUNT(DISTINCT o.customer_id) AS buyers,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.customer_id), 2) AS revenue_per_buyer
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled';
```

## Expected result

| buyers | revenue | revenue_per_buyer |
| --- | --- | --- |
| 3 | 133.46 | 44.49 |

## Explanation

Three customers bought, spending 133.46 between them, so each buyer spent 44.49 on average. Revenue per buyer is higher than average order value (26.69) because two buyers ordered twice. The denominator decides the metric.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT COUNT(o.customer_id) AS buyers, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue, ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(o.customer_id), 2) AS revenue_per_buyer FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled';
```
