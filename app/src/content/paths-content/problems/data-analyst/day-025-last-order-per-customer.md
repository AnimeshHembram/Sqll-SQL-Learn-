---
id: da-day-025
title: Each customer's most recent order
order: 25
difficulty: intermediate
topic: Grouping
summary: Find the latest date per group to spot customers who have gone quiet.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - customers
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Find the latest value per group
prerequisites:
  - Day 14
  - Day 15
---

## Task

To spot customers who might be drifting away, return each customer who has ordered with `name` and `last_order` (their most recent order date, any status). Row order does not matter.

## Starter query

```sql
SELECT c.name, o.order_date
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id;
```

## Hints

1. One row per customer: group by name.
2. The most recent date is the largest: `MAX`.
3. `GROUP BY c.name` with `MAX(o.order_date) AS last_order`.

## Solution

```sql
SELECT c.name, MAX(o.order_date) AS last_order
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.name;
```

## Expected result

| name | last_order |
| --- | --- |
| Aisha Khan | 2025-02-05 |
| Daniel Kim | 2025-03-01 |
| Rahul Mehta | 2025-03-09 |
| Sofia Rossi | 2025-02-14 |

## Explanation

`MAX` on ISO dates gives the latest one. Sofia Rossi's last order was on 14 February, the earliest "last order" of anyone who has ordered.
