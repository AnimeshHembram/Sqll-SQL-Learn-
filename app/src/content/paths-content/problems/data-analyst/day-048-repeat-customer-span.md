---
id: da-day-048
title: How long repeat customers keep buying
order: 48
difficulty: intermediate
topic: Metrics
summary: Measure the span between a customer's first and last order.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Measure a span with MIN and MAX dates
prerequisites:
  - Day 23
  - Day 41
---

## Task

For customers with **more than one** order (any status), return `name` and `active_days`: whole days between their first and last order. Row order does not matter.

## Starter query

```sql
SELECT c.name, MIN(o.order_date) AS first_order, MAX(o.order_date) AS last_order
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name;
```

## Hints

1. Subtract the dates with `julianday(MAX(...)) - julianday(MIN(...))`.
2. Keep only customers with more than one order: a condition on a count goes in `HAVING`.
3. `CAST(julianday(MAX(o.order_date)) - julianday(MIN(o.order_date)) AS INTEGER) AS active_days ... HAVING COUNT(*) > 1`

## Solution

```sql
SELECT c.name,
  CAST(julianday(MAX(o.order_date)) - julianday(MIN(o.order_date)) AS INTEGER) AS active_days
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name
HAVING COUNT(*) > 1;
```

## Expected result

| name | active_days |
| --- | --- |
| Aisha Khan | 26 |
| Rahul Mehta | 50 |

## Explanation

A single-order customer always has a span of 0, which would drag a later average down, so they are excluded. Aisha Khan was active for 26 days and Rahul Mehta for 50.

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.name, CAST(julianday(MAX(o.order_date)) - julianday(MIN(o.order_date)) AS INTEGER) AS active_days FROM customers AS c JOIN orders AS o ON o.customer_id = c.id GROUP BY c.name;
```
