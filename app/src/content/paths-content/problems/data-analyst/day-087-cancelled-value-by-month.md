---
id: da-day-087
title: Revenue lost to cancellations each month
order: 87
difficulty: intermediate
topic: Reporting
summary: Report a conditional total for every month, including months with none.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Move a filter into the aggregate to keep every group
prerequisites:
  - Day 27
  - Day 37
---

## Task

Return every month that has orders with `month` (`YYYY-MM`) and `cancelled_value`: the value of cancelled orders that month, rounded to 2 decimal places, `0` if there were none. Sort by month.

## Starter query

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS cancelled_value
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status = 'cancelled'
GROUP BY month;
```

## Hints

1. The starter query filters with `WHERE`, so months without cancellations disappear.
2. Keep every order and move the condition inside the sum instead.
3. `ROUND(SUM(CASE WHEN o.status = 'cancelled' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS cancelled_value`

## Solution

```sql
SELECT strftime('%Y-%m', o.order_date) AS month,
  ROUND(SUM(CASE WHEN o.status = 'cancelled' THEN oi.quantity * oi.unit_price ELSE 0 END), 2) AS cancelled_value
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
GROUP BY month
ORDER BY month;
```

## Expected result

| month | cancelled_value |
| --- | --- |
| 2025-01 | 0 |
| 2025-02 | 12.99 |
| 2025-03 | 0 |

## Explanation

Only February lost revenue (12.99). Putting the condition inside `SUM(CASE ...)` instead of in `WHERE` keeps months with nothing to report, so a reader sees 0 rather than wondering whether the month is missing.

## Wrong answers

Feedback: missing-rows

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS cancelled_value FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id WHERE o.status = 'cancelled' GROUP BY month ORDER BY month;
```
