---
id: da-day-076
title: Label customer segments
order: 76
difficulty: advanced
topic: Segmentation
summary: Turn RFM numbers into business segments with CASE rules.
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
  - Apply ordered business rules with CASE
prerequisites:
  - Day 75
  - Day 20
---

## Task

Using the same RFM numbers as yesterday (as of 2025-03-31), label each buyer with `segment`:

- `'Champion'`: 2 or more orders and recency of 30 days or less
- `'Loyal'`: 2 or more orders (but not a champion)
- `'New'`: 1 order and recency of 30 days or less
- `'At risk'`: everyone else

Return `name` and `segment`. Row order does not matter.

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
rfm AS (
  SELECT customer_id,
    CAST(julianday('2025-03-31') - julianday(MAX(order_date)) AS INTEGER) AS recency_days,
    COUNT(*) AS frequency
  FROM order_values
  GROUP BY customer_id
)
SELECT customer_id, recency_days, frequency
FROM rfm;
```

## Hints

1. The starter query already computes recency and frequency. Add a `CASE` in the final `SELECT`.
2. `CASE` checks its conditions in order and uses the first that matches, so put `'Champion'` before `'Loyal'`.
3. `CASE WHEN frequency >= 2 AND recency_days <= 30 THEN 'Champion' WHEN frequency >= 2 THEN 'Loyal' WHEN recency_days <= 30 THEN 'New' ELSE 'At risk' END AS segment`, joined to `customers` for the name.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
rfm AS (
  SELECT customer_id,
    CAST(julianday('2025-03-31') - julianday(MAX(order_date)) AS INTEGER) AS recency_days,
    COUNT(*) AS frequency
  FROM order_values
  GROUP BY customer_id
)
SELECT c.name,
  CASE
    WHEN r.frequency >= 2 AND r.recency_days <= 30 THEN 'Champion'
    WHEN r.frequency >= 2 THEN 'Loyal'
    WHEN r.recency_days <= 30 THEN 'New'
    ELSE 'At risk'
  END AS segment
FROM rfm AS r
JOIN customers AS c ON c.id = r.customer_id;
```

## Expected result

| name | segment |
| --- | --- |
| Aisha Khan | Loyal |
| Rahul Mehta | Champion |
| Daniel Kim | New |

## Explanation

Rahul Mehta is a champion, Aisha Khan is loyal but has not bought for 54 days, and Daniel Kim is new. Because `CASE` stops at the first match, the order of the rules is part of the definition.

## Wrong answers

Feedback: incorrect-output

```sql
WITH order_values AS (   SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value   FROM orders AS o   JOIN order_items AS oi ON oi.order_id = o.id   WHERE o.status <> 'cancelled'   GROUP BY o.id, o.customer_id, o.order_date ), rfm AS (SELECT customer_id, CAST(julianday('2025-03-31') - julianday(MAX(order_date)) AS INTEGER) AS recency_days, COUNT(*) AS frequency FROM order_values GROUP BY customer_id) SELECT c.name, CASE WHEN r.frequency >= 2 THEN 'Loyal' WHEN r.frequency >= 2 AND r.recency_days <= 30 THEN 'Champion' WHEN r.recency_days <= 30 THEN 'New' ELSE 'At risk' END AS segment FROM rfm AS r JOIN customers AS c ON c.id = r.customer_id;
```
