---
id: da-day-079
title: Average time to the second order
order: 79
difficulty: advanced
topic: Segmentation
summary: Measure how long repeat customers take to come back after their first purchase.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
orderMatters: false
checkColumnNames: true
objectives:
  - Compare the 1st and 2nd event per customer
prerequisites:
  - Day 51
  - Day 48
---

## Task

Among customers with at least two non-cancelled orders, what is the **average number of days between their first and second** non-cancelled order? Return one row with `avg_days_to_second`, rounded to 1 decimal place.

## Starter query

```sql
SELECT customer_id, order_date,
  ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number
FROM orders
WHERE status <> 'cancelled';
```

## Hints

1. Put the starter query in a CTE. You need order 1 and order 2 of each customer side by side.
2. Join the CTE to itself: `first.order_number = 1`, `second.order_number = 2`, same `customer_id`. Customers without a second order drop out of the inner join.
3. `ROUND(AVG(julianday(s.order_date) - julianday(f.order_date)), 1) AS avg_days_to_second`

## Solution

```sql
WITH numbered AS (
  SELECT customer_id, order_date,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number
  FROM orders
  WHERE status <> 'cancelled'
)
SELECT ROUND(AVG(julianday(s.order_date) - julianday(f.order_date)), 1) AS avg_days_to_second
FROM numbered AS f
JOIN numbered AS s ON s.customer_id = f.customer_id AND f.order_number = 1 AND s.order_number = 2;
```

## Expected result

| avg_days_to_second |
| --- |
| 38 |

## Explanation

Aisha Khan took 26 days and Rahul Mehta 50, so the average is 38.0 days. A good time to send a "come back" offer is shortly before this point.

## Other accepted answers

```sql
WITH gaps AS (SELECT julianday(LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) - julianday(order_date) AS gap, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number FROM orders WHERE status <> 'cancelled') SELECT ROUND(AVG(gap), 1) AS avg_days_to_second FROM gaps WHERE order_number = 1 AND gap IS NOT NULL;
```
