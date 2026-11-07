---
id: da-day-023
title: Customers who ordered within 30 days
order: 23
difficulty: advanced
topic: Dates
summary: Combine a join, MIN and a date difference to find fast-converting customers.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Filter groups on a date difference
prerequisites:
  - Day 13
  - Day 22
---

## Task

Growth counts a customer as a "quick converter" if their first order (any status) came **within 30 days** of joining. Return the `name` of each quick converter.

## Starter query

```sql
SELECT c.name, c.joined, o.order_date
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id;
```

## Hints

1. First find each customer's first order date with `MIN` after grouping.
2. A condition on `MIN(...)` goes in `HAVING`.
3. `GROUP BY c.name, c.joined HAVING julianday(MIN(o.order_date)) - julianday(c.joined) <= 30`

## Solution

```sql
SELECT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name, c.joined
HAVING julianday(MIN(o.order_date)) - julianday(c.joined) <= 30;
```

## Expected result

| name |
| --- |
| Daniel Kim |

## Explanation

Only Daniel Kim ordered soon after joining (18 days). The others took between 270 and 361 days. The threshold applies to the first order, so it needs `MIN` and `HAVING`.
