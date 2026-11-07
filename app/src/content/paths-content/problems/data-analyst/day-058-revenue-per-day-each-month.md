---
id: da-day-058
title: Average daily revenue by month
order: 58
difficulty: advanced
topic: Dates
summary: Divide monthly revenue by the number of days in that month.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Find the number of days in a month
  - Normalise a total by period length
prerequisites:
  - Day 57
  - Day 44
---

## Task

Months have different lengths, so finance compares **revenue per calendar day**. Return `month` (`YYYY-MM`), `days_in_month` and `revenue_per_day` (non-cancelled revenue divided by the days in the month, rounded to 2 decimal places). Sort by month.

## Starter query

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
WHERE o.status <> 'cancelled'
GROUP BY month;
```

## Hints

1. The last day of a month is the first day of the next month minus one day.
2. `date(month || '-01', '+1 month', '-1 day')` gives the last day; `strftime('%d', ...)` gives its day number as text.
3. `CAST(strftime('%d', date(month || '-01', '+1 month', '-1 day')) AS INTEGER) AS days_in_month`, in the outer query of a CTE.

## Solution

```sql
WITH monthly AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY month
)
SELECT month,
  CAST(strftime('%d', date(month || '-01', '+1 month', '-1 day')) AS INTEGER) AS days_in_month,
  ROUND(revenue / CAST(strftime('%d', date(month || '-01', '+1 month', '-1 day')) AS INTEGER), 2) AS revenue_per_day
FROM monthly
ORDER BY month;
```

## Expected result

| month | days_in_month | revenue_per_day |
| --- | --- | --- |
| 2025-01 | 31 | 1.56 |
| 2025-02 | 28 | 1.04 |
| 2025-03 | 31 | 1.8 |

## Explanation

Chaining modifiers (`'+1 month'`, then `'-1 day'`) finds a month's last day, including 28 days for February 2025. Normalising by days makes a short month comparable with a long one.
