---
id: da-day-041
title: Days since the previous order
order: 41
difficulty: advanced
topic: Window functions
summary: Compare each row with the one before it using LAG().
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Read the previous row with LAG
prerequisites:
  - Day 38
  - Day 22
---

## Task

To measure how often customers return, list every order with `customer_id`, `order_date` and `days_since_previous`: whole days since that customer's previous order (any status), or `NULL` for their first. Sort by `customer_id`, then `order_date`.

## Starter query

```sql
SELECT customer_id, order_date
FROM orders
ORDER BY customer_id, order_date;
```

## Hints

1. `LAG(column) OVER (PARTITION BY ... ORDER BY ...)` returns the value from the previous row of the partition, or `NULL` if there is none.
2. Get the previous order date with `LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)`.
3. `CAST(julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS INTEGER) AS days_since_previous`

## Solution

```sql
SELECT customer_id, order_date,
  CAST(julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS INTEGER) AS days_since_previous
FROM orders
ORDER BY customer_id, order_date;
```

## Expected result

| customer_id | order_date | days_since_previous |
| --- | --- | --- |
| 1 | 2025-01-10 | NULL |
| 1 | 2025-02-05 | 26 |
| 2 | 2025-01-18 | NULL |
| 2 | 2025-03-09 | 50 |
| 3 | 2025-02-14 | NULL |
| 4 | 2025-03-01 | NULL |

## Explanation

`LAG` looks one row back within the customer's own orders. A first order has no previous row, so the difference is `NULL`, which is honest: there is no gap to measure yet. Aisha Khan came back after 26 days, Rahul Mehta after 50.
