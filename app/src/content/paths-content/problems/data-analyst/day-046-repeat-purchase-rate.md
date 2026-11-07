---
id: da-day-046
title: Repeat purchase rate
order: 46
difficulty: advanced
topic: Metrics
summary: Calculate the share of buyers who bought more than once.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Calculate a rate from per-customer counts
prerequisites:
  - Day 27
  - Day 12
---

## Task

Of the customers with at least one non-cancelled order, what percentage have **two or more** non-cancelled orders? Return one row with `repeat_pct`, rounded to 1 decimal place.

## Starter query

```sql
SELECT customer_id, COUNT(*) AS orders
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id;
```

## Hints

1. The starter query gives one row per buyer with their order count. Put it in a CTE or subquery.
2. Count the buyers with `orders >= 2` and divide by all buyers.
3. `SELECT ROUND(100.0 * SUM(CASE WHEN orders >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS repeat_pct FROM (starter query)`

## Solution

```sql
WITH buyers AS (
  SELECT customer_id, COUNT(*) AS orders
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
)
SELECT ROUND(100.0 * SUM(CASE WHEN orders >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1) AS repeat_pct
FROM buyers;
```

## Expected result

| repeat_pct |
| --- |
| 66.7 |

## Explanation

Three customers bought something and two of them bought again, so the repeat rate is 66.7%. The denominator is buyers, not all customers: Meera Pillai has not ordered and Sofia Rossi's only order was cancelled.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT ROUND(100.0 * 2 / 5, 1) AS repeat_pct;
```
