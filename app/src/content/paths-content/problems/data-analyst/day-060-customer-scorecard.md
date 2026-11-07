---
id: da-day-060
title: Customer scorecard
order: 60
difficulty: advanced
topic: Reporting
summary: Bring two months of skills together in one per-customer report.
module: data-analyst
duration: 15
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Combine CTEs, LEFT JOIN, aggregates and a window in one report
prerequisites:
  - Day 47
  - Day 39
  - Day 30
---

## Task

Build the customer scorecard. Return **every** customer with:

- `name`
- `orders`: number of non-cancelled orders (0 if none)
- `revenue`: their non-cancelled revenue, rounded to 2 decimal places (0 if none)
- `last_order`: date of their latest non-cancelled order (`NULL` if none)
- `revenue_rank`: rank by revenue using `RANK()`, 1 = highest

Sort by `revenue_rank`, then `name`.

## Starter query

```sql
SELECT c.name
FROM customers AS c;
```

## Hints

1. Work out each order's value first in a CTE, keeping only non-cancelled orders.
2. `LEFT JOIN` that CTE to `customers` so everyone stays, then group by customer. Use `COUNT`, `COALESCE(SUM(...), 0)` and `MAX`.
3. Add `RANK() OVER (ORDER BY COALESCE(SUM(v.order_value), 0) DESC) AS revenue_rank`.

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
  COUNT(v.id) AS orders,
  ROUND(COALESCE(SUM(v.order_value), 0), 2) AS revenue,
  MAX(v.order_date) AS last_order,
  RANK() OVER (ORDER BY COALESCE(SUM(v.order_value), 0) DESC) AS revenue_rank
FROM customers AS c
LEFT JOIN order_values AS v ON v.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY revenue_rank, c.name;
```

## Expected result

| name | orders | revenue | last_order | revenue_rank |
| --- | --- | --- | --- | --- |
| Aisha Khan | 2 | 62.22 | 2025-02-05 | 1 |
| Daniel Kim | 1 | 45.75 | 2025-03-01 | 2 |
| Rahul Mehta | 2 | 25.49 | 2025-03-09 | 3 |
| Meera Pillai | 0 | 0 | NULL | 4 |
| Sofia Rossi | 0 | 0 | NULL | 4 |

## Explanation

Summarising orders before joining keeps each order counted once, the `LEFT JOIN` keeps customers who have not bought, and `RANK()` lets the two non-buyers share last place (4). Aisha Khan leads with 62.22 across two orders.

## Wrong answers

Feedback: missing-rows

```sql
WITH order_values AS (SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY o.id, o.customer_id, o.order_date) SELECT c.name, COUNT(v.id) AS orders, ROUND(SUM(v.order_value), 2) AS revenue, MAX(v.order_date) AS last_order, RANK() OVER (ORDER BY SUM(v.order_value) DESC) AS revenue_rank FROM customers AS c JOIN order_values AS v ON v.customer_id = c.id GROUP BY c.id, c.name ORDER BY revenue_rank, c.name;
```
