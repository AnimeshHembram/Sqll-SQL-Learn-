---
id: da-day-012
title: Orders per customer
order: 12
difficulty: beginner
topic: Grouping
summary: Count rows per group with GROUP BY on a single table.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Group rows and count each group
prerequisites:
  - Day 10
---

## Task

Return one row per customer who has orders, with `customer_id` and `orders` (how many orders they placed, any status). Row order does not matter.

## Starter query

```sql
SELECT customer_id
FROM orders;
```

## Hints

1. One row per customer means grouping by `customer_id`.
2. `COUNT(*)` counts the rows in each group.
3. `SELECT customer_id, COUNT(*) AS orders FROM orders GROUP BY customer_id`

## Solution

```sql
SELECT customer_id, COUNT(*) AS orders
FROM orders
GROUP BY customer_id;
```

## Expected result

| customer_id | orders |
| --- | --- |
| 1 | 2 |
| 2 | 2 |
| 3 | 1 |
| 4 | 1 |

## Explanation

`GROUP BY customer_id` makes one group per customer, and `COUNT(*)` counts each group's orders. Customers 1 and 2 have ordered twice.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT customer_id, 1 AS orders FROM orders;
```
