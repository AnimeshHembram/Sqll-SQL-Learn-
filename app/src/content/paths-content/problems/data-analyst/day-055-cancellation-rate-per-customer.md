---
id: da-day-055
title: Cancellation rate per customer
order: 55
difficulty: advanced
topic: Missing values
summary: Use NULLIF to avoid dividing by zero for customers with no orders.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Guard a division with NULLIF
  - Keep NULL when there is no answer
prerequisites:
  - Day 54
  - Day 47
---

## Task

Return every customer with `name` and `cancel_pct`: the percentage of their orders that were cancelled, rounded to 1 decimal place. A customer with **no orders** has no rate, so show `NULL` for them rather than 0 or an error. Row order does not matter.

## Starter query

```sql
SELECT c.name, COUNT(o.id) AS orders,
  SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name;
```

## Hints

1. Divide `cancelled` by `orders` and multiply by 100.0.
2. Meera Pillai has 0 orders. `NULLIF(x, 0)` returns `NULL` when `x` is 0, and dividing by `NULL` gives `NULL`.
3. `ROUND(100.0 * SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) / NULLIF(COUNT(o.id), 0), 1) AS cancel_pct`

## Solution

```sql
SELECT c.name,
  ROUND(100.0 * SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) / NULLIF(COUNT(o.id), 0), 1) AS cancel_pct
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name;
```

## Expected result

| name | cancel_pct |
| --- | --- |
| Aisha Khan | 0 |
| Rahul Mehta | 0 |
| Sofia Rossi | 100 |
| Daniel Kim | 0 |
| Meera Pillai | NULL |

## Explanation

SQLite quietly returns `NULL` for division by zero, but many databases stop with an error, so `NULLIF` makes the intent explicit and portable. `NULL` is the honest answer for Meera Pillai: a rate of 0% would claim she never cancels. Sofia Rossi cancelled her only order (100%).

## Wrong answers

Feedback: incorrect-output

```sql
SELECT c.name, COALESCE(ROUND(100.0 * SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) / NULLIF(COUNT(o.id), 0), 1), 0) AS cancel_pct FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id GROUP BY c.id, c.name;
```
