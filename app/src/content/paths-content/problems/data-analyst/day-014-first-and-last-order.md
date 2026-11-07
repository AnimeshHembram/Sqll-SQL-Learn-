---
id: da-day-014
title: First and last order date
order: 14
difficulty: beginner
topic: Aggregates
summary: Use MIN and MAX on dates to describe a reporting period.
module: data-analyst
duration: 4
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Find the earliest and latest date
prerequisites:
  - Day 5
  - Day 10
---

## Task

Every report states the period it covers. Return one row with `first_order` and `last_order`: the earliest and latest order dates.

## Starter query

```sql
SELECT order_date
FROM orders;
```

## Hints

1. `MIN` and `MAX` work on dates stored as ISO text.
2. You can put both in one `SELECT`.
3. `SELECT MIN(order_date) AS first_order, MAX(order_date) AS last_order FROM orders`

## Solution

```sql
SELECT MIN(order_date) AS first_order, MAX(order_date) AS last_order
FROM orders;
```

## Expected result

| first_order | last_order |
| --- | --- |
| 2025-01-10 | 2025-03-09 |

## Explanation

Because ISO dates sort correctly, `MIN` and `MAX` give the first and last order dates: 10 January to 9 March 2025.
