---
id: da-day-047
title: Units sold by city, including cities with none
order: 47
difficulty: advanced
topic: Joins
summary: Put a filter in ON instead of WHERE to keep rows a LEFT JOIN would otherwise lose.
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
  - Filter inside a LEFT JOIN with ON
  - Label missing values
prerequisites:
  - Day 37
  - Data Analyst chapter: Missing values
---

## Task

Return every customer city with `city` (show `'Unknown'` when it is missing) and `units`: books bought in non-cancelled orders by customers in that city, `0` if none. Row order does not matter.

## Starter query

```sql
SELECT COALESCE(c.city, 'Unknown') AS city, SUM(oi.quantity) AS units
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
LEFT JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY COALESCE(c.city, 'Unknown');
```

## Hints

1. Run the starter query: Chennai and Unknown are missing. `WHERE o.status <> 'cancelled'` is false for a `NULL` status, so it removes the customers the `LEFT JOIN` kept.
2. Move the status condition into the join: `LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'`.
3. Then use `COALESCE(SUM(oi.quantity), 0) AS units`.

## Solution

```sql
SELECT COALESCE(c.city, 'Unknown') AS city, COALESCE(SUM(oi.quantity), 0) AS units
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id AND o.status <> 'cancelled'
LEFT JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY COALESCE(c.city, 'Unknown');
```

## Expected result

| city | units |
| --- | --- |
| Bangalore | 8 |
| Chennai | 0 |
| Mumbai | 2 |
| Unknown | 0 |

## Explanation

A condition in `ON` decides which rows match; a condition in `WHERE` removes rows after the join. Putting the status check in `ON` keeps Chennai (Meera Pillai has no orders) and Unknown (Sofia Rossi's order was cancelled) with 0 units.

## Wrong answers

Feedback: missing-rows

```sql
SELECT COALESCE(c.city, 'Unknown') AS city, SUM(oi.quantity) AS units FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.id LEFT JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status <> 'cancelled' GROUP BY COALESCE(c.city, 'Unknown');
```
