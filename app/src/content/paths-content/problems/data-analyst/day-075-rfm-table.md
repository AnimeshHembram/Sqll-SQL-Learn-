---
id: da-day-075
title: Recency, frequency and spend
order: 75
difficulty: advanced
topic: Segmentation
summary: Build an RFM table: days since last purchase, number of orders and total spend.
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
  - Build an RFM table
prerequisites:
  - Day 60
  - Day 22
---

## Task

Build an RFM table as of **2025-03-31** for every customer with a non-cancelled order: `name`, `recency_days` (whole days from their last non-cancelled order to 2025-03-31), `frequency` (non-cancelled orders) and `monetary` (their non-cancelled revenue, rounded to 2 decimal places). Row order does not matter.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT customer_id, order_date, order_value
FROM order_values;
```

## Hints

1. The starter CTE already has one row per non-cancelled order with its value. Group it by customer.
2. Recency: `julianday('2025-03-31') - julianday(MAX(order_date))`. Frequency: `COUNT(*)`. Monetary: `SUM(order_value)`.
3. Join `customers` for the name and `GROUP BY c.id, c.name`.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT c.name,
  CAST(julianday('2025-03-31') - julianday(MAX(v.order_date)) AS INTEGER) AS recency_days,
  COUNT(*) AS frequency,
  ROUND(SUM(v.order_value), 2) AS monetary
FROM order_values AS v
JOIN customers AS c ON c.id = v.customer_id
GROUP BY c.id, c.name;
```

## Expected result

| name | recency_days | frequency | monetary |
| --- | --- | --- | --- |
| Aisha Khan | 54 | 2 | 62.22 |
| Rahul Mehta | 22 | 2 | 25.49 |
| Daniel Kim | 30 | 1 | 45.75 |

## Explanation

RFM describes customers by how recently, how often and how much they buy. Rahul Mehta bought most recently (22 days), Aisha Khan spends most. A fixed "as of" date keeps the table reproducible.
