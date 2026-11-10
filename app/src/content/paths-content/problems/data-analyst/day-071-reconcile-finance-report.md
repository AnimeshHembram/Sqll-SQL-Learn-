---
id: da-day-071
title: Reconcile with the finance report
order: 71
difficulty: advanced
topic: Data quality
summary: Compare your totals with another team's numbers and list every difference.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Reconcile two sources
  - Compare money values safely
prerequisites:
  - Day 70
  - Day 47
---

## Task

Finance sent their order totals (in the starter query). List every order where the numbers **disagree**: either the totals differ, or finance has no row for an order that we have. Return `order_id`, `our_total` (rounded to 2 decimal places) and `reported_total`. Include every order, of any status. Row order does not matter.

## Starter query

```sql
WITH finance_report(order_id, reported_total) AS (
  VALUES (1, 32.97), (2, 15.50), (3, 29.25), (4, 12.99), (5, 44.25)
)
SELECT order_id, reported_total
FROM finance_report;
```

## Hints

1. Calculate our total per order from `order_items` in a second CTE called `ours`.
2. `LEFT JOIN finance_report` to `ours`, so orders missing from the report stay with a `NULL` reported total.
3. Keep rows `WHERE f.reported_total IS NULL OR ROUND(o.our_total, 2) <> f.reported_total`.

## Solution

```sql
WITH finance_report(order_id, reported_total) AS (
  VALUES (1, 32.97), (2, 15.50), (3, 29.25), (4, 12.99), (5, 44.25)
),
ours AS (
  SELECT order_id, SUM(quantity * unit_price) AS our_total
  FROM order_items
  GROUP BY order_id
)
SELECT o.order_id, ROUND(o.our_total, 2) AS our_total, f.reported_total
FROM ours AS o
LEFT JOIN finance_report AS f ON f.order_id = o.order_id
WHERE f.reported_total IS NULL OR ROUND(o.our_total, 2) <> f.reported_total;
```

## Expected result

| order_id | our_total | reported_total |
| --- | --- | --- |
| 5 | 45.75 | 44.25 |
| 6 | 9.99 | NULL |

## Explanation

Order 5 is 1.50 lower in the report, and order 6 is missing from it. Two details matter: compare rounded values, because money calculated with decimals can be off by a tiny fraction, and use a `LEFT JOIN` so a missing row shows up instead of disappearing.

## Wrong answers

Feedback: missing-rows

```sql
WITH finance_report(order_id, reported_total) AS (   VALUES (1, 32.97), (2, 15.50), (3, 29.25), (4, 12.99), (5, 44.25) ), ours AS (SELECT order_id, SUM(quantity * unit_price) AS our_total FROM order_items GROUP BY order_id) SELECT o.order_id, ROUND(o.our_total, 2) AS our_total, f.reported_total FROM ours AS o JOIN finance_report AS f ON f.order_id = o.order_id WHERE ROUND(o.our_total, 2) <> f.reported_total;
```
