---
id: da-day-034
title: Customers who came back
order: 34
difficulty: intermediate
topic: Set operations
summary: Find the overlap of two lists with INTERSECT.
module: data-analyst
duration: 7
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Find rows common to two results with INTERSECT
prerequisites:
  - Day 33
---

## Task

Which customers ordered in **January 2025 and again in March 2025** (any status)? Return their `name`. Use `INTERSECT`. Row order does not matter.

## Starter query

```sql
SELECT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.order_date LIKE '2025-01%';
```

## Hints

1. The starter query lists January buyers. Write the same for March.
2. `INTERSECT` keeps only rows that appear in both results.
3. Put `INTERSECT` between the January query and the March query.

## Solution

```sql
SELECT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.order_date LIKE '2025-01%'
INTERSECT
SELECT c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
WHERE o.order_date LIKE '2025-03%';
```

## Expected result

| name |
| --- |
| Rahul Mehta |

## Explanation

Aisha Khan and Rahul Mehta ordered in January; Daniel Kim and Rahul Mehta in March. Only Rahul Mehta is in both lists. A single query with `AND` on the date cannot do this, because one order cannot be in two months.

## Wrong answers

Feedback: extra-rows

```sql
SELECT c.name FROM customers AS c JOIN orders AS o ON o.customer_id = c.id WHERE o.order_date LIKE '2025-01%' OR o.order_date LIKE '2025-03%';
```
