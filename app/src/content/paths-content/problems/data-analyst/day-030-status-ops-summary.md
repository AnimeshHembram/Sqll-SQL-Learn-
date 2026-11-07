---
id: da-day-030
title: Operations summary by status
order: 30
difficulty: advanced
topic: Reporting
summary: Combine joins, distinct counts and totals into a one-table operations report.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Build a multi-metric summary report
  - Avoid double counting after a join
prerequisites:
  - Day 17
  - Day 27
---

## Task

Write the weekly operations summary. For each order `status`, return `orders` (number of orders), `units` (total quantity) and `value` (total `quantity * unit_price`, rounded to 2 decimal places). Sort by `value`, highest first.

## Starter query

```sql
SELECT o.status, oi.quantity, oi.unit_price
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id;
```

## Hints

1. Group the joined rows by `o.status`.
2. After the join there is one row per line, so count orders with `COUNT(DISTINCT o.id)`.
3. `SELECT o.status, COUNT(DISTINCT o.id) AS orders, SUM(oi.quantity) AS units, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS value ... GROUP BY o.status ORDER BY value DESC`

## Solution

```sql
SELECT o.status,
  COUNT(DISTINCT o.id) AS orders,
  SUM(oi.quantity) AS units,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS value
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY o.status
ORDER BY value DESC;
```

## Expected result

| status | orders | units | value |
| --- | --- | --- | --- |
| delivered | 3 | 7 | 94.22 |
| shipped | 2 | 3 | 39.24 |
| cancelled | 1 | 1 | 12.99 |

## Explanation

This brings the month together: a join, grouping, a distinct count (because joining to lines repeats orders), totals and sorting. Counting `*` instead would report 9 "orders".

## Wrong answers

Feedback: incorrect-output

```sql
SELECT o.status, COUNT(*) AS orders, SUM(oi.quantity) AS units, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id GROUP BY o.status ORDER BY value DESC;
```
