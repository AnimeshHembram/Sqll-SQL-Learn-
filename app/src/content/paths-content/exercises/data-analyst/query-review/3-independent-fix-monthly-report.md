---
id: da-fix-monthly-report
title: Fix the monthly orders report
order: 3
difficulty: advanced
topic: Review
summary: A report has two silent mistakes. Find both and fix them.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Review a query against its definition
  - Fix join fan-out in a count
---

## Task

The monthly report below should show, for every month with **non-cancelled** orders, `month`, `orders` (number of non-cancelled orders) and `revenue` (rounded to 2 decimal places). It returns plausible numbers, but they are wrong, and a month is missing. Fix the query. Sort by `month`.

## Starter query

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
  COUNT(*) AS orders,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status = 'delivered'
GROUP BY month
ORDER BY month;
```

## Hints

1. Check the grain: after the join, what is one row? What does `COUNT(*)` count?
2. Compare the filter with the definition: "non-cancelled" includes shipped orders.
3. Use `COUNT(DISTINCT o.id)` and `WHERE o.status <> 'cancelled'`.

## Solution

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
  COUNT(DISTINCT o.id) AS orders,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month
ORDER BY month;
```

## Expected result

| month | orders | revenue |
| --- | --- | --- |
| 2025-01 | 2 | 48.47 |
| 2025-02 | 1 | 29.25 |
| 2025-03 | 2 | 55.74 |

## Explanation

The original counted order lines (January showed 3 "orders") and kept only delivered orders, which dropped February entirely, because February's only kept order is still shipping. Each mistake alone produces believable numbers, which is why reviewing the grain and the filter against the definition matters.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, COUNT(DISTINCT o.id) AS orders, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status = 'delivered' GROUP BY month ORDER BY month;
```

Feedback: incorrect-output

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, COUNT(*) AS orders, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY month ORDER BY month;
```
