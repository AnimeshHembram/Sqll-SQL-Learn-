---
id: da-monthly-revenue
title: Monthly revenue report
order: 3
difficulty: intermediate
topic: Dates and revenue
summary: Report revenue per month, without cancelled orders, in calendar order.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Combine a join, a date function and grouping
  - Exclude cancelled orders before totalling
---

## Task

Build the monthly revenue report. Return one row per month, in calendar order, with:

- `month`: for example `2025-01`
- `revenue`: the total of `quantity * unit_price` for that month's orders, rounded to 2 decimal places

Do not count cancelled orders.

## Starter query

```sql
SELECT *
FROM orders;
```

## Hints

1. Revenue is in `order_items`; the date and status are in `orders`. Join them on the order id.
2. Group by `strftime('%Y-%m', o.order_date)` and remove cancelled orders with `WHERE`.
3. `ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue`, `WHERE o.status <> 'cancelled'`, `GROUP BY month ORDER BY month`.

## Solution

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month
ORDER BY month;
```

## Expected result

| month | revenue |
| --- | --- |
| 2025-01 | 48.47 |
| 2025-02 | 29.25 |
| 2025-03 | 55.74 |

## Explanation

Each order line is joined to its order, cancelled orders are removed, and the remaining lines are grouped by month. February is lower than it looks in the raw data because order 4 was cancelled.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id GROUP BY month ORDER BY month;
```
