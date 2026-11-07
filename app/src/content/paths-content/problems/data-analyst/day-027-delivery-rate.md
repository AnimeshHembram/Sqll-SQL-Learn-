---
id: da-day-027
title: Share of orders delivered
order: 27
difficulty: intermediate
topic: CASE
summary: Calculate a rate as a percentage with conditional counting.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Turn a conditional count into a percentage
prerequisites:
  - Day 12
  - Data Analyst chapter: Conditional logic with CASE
---

## Task

Operations' headline metric is the **delivery rate**. Return one row with `delivered_pct`: the percentage of all orders whose status is `'delivered'`, rounded to 1 decimal place.

## Starter query

```sql
SELECT status
FROM orders;
```

## Hints

1. Count delivered orders with `SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)`.
2. Divide by `COUNT(*)` and multiply by `100.0` to get a percentage without integer division.
3. `ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*), 1) AS delivered_pct`

## Solution

```sql
SELECT ROUND(100.0 * SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*), 1) AS delivered_pct
FROM orders;
```

## Expected result

| delivered_pct |
| --- |
| 50 |

## Explanation

Three of six orders are delivered, so the rate is 50.0%. Writing `100.0` keeps the division in decimals.

## Other accepted answers

```sql
SELECT ROUND(100.0 * COUNT(CASE WHEN status = 'delivered' THEN 1 END) / COUNT(*), 1) AS delivered_pct FROM orders;
```

## Wrong answers

Feedback: incorrect-output

```sql
SELECT 100 * SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*) / 100 AS delivered_pct FROM orders;
```
