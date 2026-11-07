---
id: da-day-017
title: How many different books each customer bought
order: 17
difficulty: intermediate
topic: Joins
summary: Count distinct values per group across joined tables.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Count distinct values
  - Group after joining three tables
prerequisites:
  - Day 12
  - Day 16
---

## Task

For a "reading variety" report, return each customer who has bought something, with `name` and `different_books`: how many **different** books they bought in orders that were **not cancelled**. Row order does not matter.

## Starter query

```sql
SELECT c.name, oi.book_id
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id;
```

## Hints

1. Remove cancelled orders, then group by customer.
2. The same book bought twice should count once: use `COUNT(DISTINCT ...)`.
3. `WHERE o.status <> 'cancelled' GROUP BY c.name` with `COUNT(DISTINCT oi.book_id) AS different_books`.

## Solution

```sql
SELECT c.name, COUNT(DISTINCT oi.book_id) AS different_books
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY c.name;
```

## Expected result

| name | different_books |
| --- | --- |
| Aisha Khan | 4 |
| Daniel Kim | 2 |
| Rahul Mehta | 2 |

## Explanation

Rahul Mehta bought *Rivers of Glass* and *Counting Stars*; Aisha Khan bought four different books across two orders. `DISTINCT` stops repeat purchases of the same title from inflating the count.
