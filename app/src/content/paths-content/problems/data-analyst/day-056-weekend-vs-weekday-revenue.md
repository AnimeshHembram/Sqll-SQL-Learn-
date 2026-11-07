---
id: da-day-056
title: Weekend versus weekday revenue
order: 56
difficulty: intermediate
topic: Dates
summary: Group by a label derived from the date.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: false
checkColumnNames: true
objectives:
  - Group by a derived category
prerequisites:
  - Day 21
  - Day 20
---

## Task

Marketing wants to know whether weekend promotions matter. Return `day_type` (`'Weekend'` for Saturday and Sunday, otherwise `'Weekday'`) and `revenue` (non-cancelled orders, rounded to 2 decimal places). Row order does not matter.

## Starter query

```sql
SELECT o.order_date, strftime('%w', o.order_date) AS weekday_number
FROM orders AS o;
```

## Hints

1. `strftime('%w', ...)` is `'0'` for Sunday and `'6'` for Saturday.
2. Build the label with `CASE WHEN strftime('%w', o.order_date) IN ('0', '6') THEN 'Weekend' ELSE 'Weekday' END`.
3. Join the order lines, filter out cancelled orders and `GROUP BY day_type`.

## Solution

```sql
SELECT CASE WHEN strftime('%w', o.order_date) IN ('0', '6') THEN 'Weekend' ELSE 'Weekday' END AS day_type,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY day_type;
```

## Expected result

| day_type | revenue |
| --- | --- |
| Weekday | 62.22 |
| Weekend | 71.24 |

## Explanation

Grouping by a calculated label turns many dates into two buckets. Three weekend orders brought in 71.24 against 62.22 from two weekday orders.
