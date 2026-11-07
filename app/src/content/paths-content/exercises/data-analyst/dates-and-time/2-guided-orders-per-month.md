---
id: da-orders-per-month
title: Orders per month
order: 2
difficulty: beginner
topic: strftime
summary: Count orders in each month with strftime and GROUP BY.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Truncate a date to its month with strftime
  - Group and order by the month
---

## Task

Return the number of orders in each month, **in calendar order**, with:

- `month`: the year and month, for example `2025-01`
- `orders`: the number of orders placed that month

**Steps**

1. The starter query shows each order's month. Remove `id,` and add `COUNT(*) AS orders`.
2. Group by `month`.
3. Sort by `month`.

## Starter query

```sql
SELECT id, strftime('%Y-%m', order_date) AS month
FROM orders;
```

## Hints

1. One row per month means grouping by the month.
2. `GROUP BY month` groups by the alias, and `ORDER BY month` sorts the months.
3. `SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders FROM orders GROUP BY month ORDER BY month`.

## Solution

```sql
SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders
FROM orders
GROUP BY month
ORDER BY month;
```

## Expected result

| month | orders |
| --- | --- |
| 2025-01 | 2 |
| 2025-02 | 2 |
| 2025-03 | 2 |

## Explanation

`strftime('%Y-%m', ...)` turns each date into its month. Grouping counts the orders in each month, and because the month is ISO text, sorting it gives calendar order.

## Wrong answers

Feedback: wrong-order

```sql
SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders FROM orders GROUP BY month ORDER BY orders DESC, month DESC;
```
