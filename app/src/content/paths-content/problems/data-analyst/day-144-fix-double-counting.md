---
id: da-day-144
title: Fix a report that double-counts
order: 144
difficulty: advanced
topic: Data quality
summary: Debug a fan-out between two one-to-many joins by aggregating each side first.
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
  - Recognise and fix join fan-out
  - Aggregate to a common grain before joining
prerequisites:
  - Day 113
  - Data Analyst chapter: Reviewing an analysis query
---

## Task

The starter query is a real report with a bug: it shows each customer's `revenue` (non-cancelled order lines), `paid` (payments against those orders, data in the starter query) and `balance` (revenue minus paid, rounded to 2 decimal places), but some numbers are too high. Find the bug and return the correct report with the same columns: `name`, `revenue`, `paid` and `balance`, for every customer with a non-cancelled order. Sort by `name`.

## Starter query

```sql
WITH payments(order_id, paid_on, amount) AS (
  VALUES (1, '2025-01-10', 20.00), (1, '2025-01-12', 12.97), (2, '2025-01-18', 15.50),
         (3, '2025-02-06', 10.00), (4, '2025-02-14', 12.99), (5, '2025-03-01', 45.75)
)
SELECT c.name,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue,
  ROUND(SUM(p.amount), 2) AS paid,
  ROUND(SUM(oi.quantity * oi.unit_price) - SUM(p.amount), 2) AS balance
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'
JOIN order_items AS oi ON oi.order_id = o.id
LEFT JOIN payments AS p ON p.order_id = o.id
GROUP BY c.id, c.name
ORDER BY c.name;
```

## Hints

1. Run the starter query and compare Aisha Khan's revenue with what you know (62.22). Which join could repeat her rows?
2. Order 1 has **two** lines and **two** payments. Joining both to the order gives 2 × 2 = 4 rows, so each line and each payment is counted twice.
3. Aggregate each side to one row per order **before** joining: a CTE with revenue per order and another with payments per order. Then join them to orders and customers and sum.

## Solution

```sql
WITH payments(order_id, paid_on, amount) AS (
  VALUES (1, '2025-01-10', 20.00), (1, '2025-01-12', 12.97), (2, '2025-01-18', 15.50),
         (3, '2025-02-06', 10.00), (4, '2025-02-14', 12.99), (5, '2025-03-01', 45.75)
),
order_revenue AS (
  SELECT order_id, SUM(quantity * unit_price) AS revenue FROM order_items GROUP BY order_id
),
order_paid AS (
  SELECT order_id, SUM(amount) AS paid FROM payments GROUP BY order_id
)
SELECT c.name,
  ROUND(SUM(r.revenue), 2) AS revenue,
  ROUND(COALESCE(SUM(p.paid), 0), 2) AS paid,
  ROUND(SUM(r.revenue) - COALESCE(SUM(p.paid), 0), 2) AS balance
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'
JOIN order_revenue AS r ON r.order_id = o.id
LEFT JOIN order_paid AS p ON p.order_id = o.id
GROUP BY c.id, c.name
ORDER BY c.name;
```

## Expected result

| name | revenue | paid | balance |
| --- | --- | --- | --- |
| Aisha Khan | 62.22 | 42.97 | 19.25 |
| Daniel Kim | 45.75 | 45.75 | 0 |
| Rahul Mehta | 25.49 | 15.5 | 9.99 |

## Explanation

Joining two **independent** one-to-many tables to the same parent multiplies their rows: each of order 1's two lines is paired with each of its two payments. Sums over that result count every line twice and every payment twice. It is one of the most common silent errors in reporting, because the query runs and the numbers look plausible.

The fix is to bring each side to the parent's grain first (one row per order), after which the joins are one-to-one. Quick checks catch the bug: Aisha's revenue should equal the sum of her two orders, 32.97 + 29.25 = 62.22, but the original report shows 95.19; and Daniel Kim, who paid in full, shows a negative balance because his single payment is counted once for each of his two order lines.

Rahul Mehta's order 6 has no payment yet, which the `LEFT JOIN` and `COALESCE` keep as an outstanding 9.99.

**Common mistake:** fixing only one side, for example aggregating payments but still joining raw order lines, which leaves the payments counted once per line.

## Wrong answers

Feedback: incorrect-output

```sql
WITH payments(order_id, paid_on, amount) AS ( VALUES (1, '2025-01-10', 20.00), (1, '2025-01-12', 12.97), (2, '2025-01-18', 15.50), (3, '2025-02-06', 10.00), (4, '2025-02-14', 12.99), (5, '2025-03-01', 45.75) ), order_paid AS (SELECT order_id, SUM(amount) AS paid FROM payments GROUP BY order_id) SELECT c.name, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue, ROUND(COALESCE(SUM(p.paid), 0), 2) AS paid, ROUND(SUM(oi.quantity * oi.unit_price) - COALESCE(SUM(p.paid), 0), 2) AS balance FROM customers AS c JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled' JOIN order_items AS oi ON oi.order_id = o.id LEFT JOIN order_paid AS p ON p.order_id = o.id GROUP BY c.id, c.name ORDER BY c.name;
```
