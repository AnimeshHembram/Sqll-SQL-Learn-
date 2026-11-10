---
id: da-day-090
title: Quarterly business review
order: 90
difficulty: advanced
topic: Reporting
summary: The final report of the first quarter: a month-by-month table built from three months of skills.
module: data-analyst
duration: 18
dataset: bookstore
tables:
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Build a layered monthly report
  - Combine aggregates with LAG and running totals
prerequisites:
  - Day 60
  - Day 44
  - Day 51
---

## Task

Build the Q1 review table, one row per month (non-cancelled orders only), sorted by month:

- `month` (`YYYY-MM`)
- `revenue`, rounded to 2 decimal places
- `orders`
- `active_customers`: different customers who ordered that month
- `new_customers`: customers whose first non-cancelled order was that month
- `change_pct`: revenue change from the previous month in percent, rounded to 1 decimal place (`NULL` for the first month)
- `revenue_to_date`: running total of revenue, rounded to 2 decimal places

## Starter query

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
)
SELECT strftime('%Y-%m', order_date) AS month, SUM(order_value) AS revenue
FROM order_values
GROUP BY month;
```

## Hints

1. Mark each order as a customer's first with `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date)` in a CTE.
2. Group by month: `SUM(order_value)`, `COUNT(*)`, `COUNT(DISTINCT customer_id)` and `SUM(CASE WHEN order_number = 1 THEN 1 ELSE 0 END)`.
3. In the last step, use `LAG(revenue) OVER (ORDER BY month)` for the change and `SUM(revenue) OVER (ORDER BY month)` for the running total.

## Solution

```sql
WITH order_values AS (
  SELECT o.id, o.customer_id, o.order_date, SUM(oi.quantity * oi.unit_price) AS order_value
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  WHERE o.status <> 'cancelled'
  GROUP BY o.id, o.customer_id, o.order_date
),
numbered AS (
  SELECT customer_id, order_date, order_value,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number
  FROM order_values
),
monthly AS (
  SELECT strftime('%Y-%m', order_date) AS month,
    SUM(order_value) AS revenue,
    COUNT(*) AS orders,
    COUNT(DISTINCT customer_id) AS active_customers,
    SUM(CASE WHEN order_number = 1 THEN 1 ELSE 0 END) AS new_customers
  FROM numbered
  GROUP BY month
)
SELECT month, ROUND(revenue, 2) AS revenue, orders, active_customers, new_customers,
  ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month), 1) AS change_pct,
  ROUND(SUM(revenue) OVER (ORDER BY month), 2) AS revenue_to_date
FROM monthly
ORDER BY month;
```

## Expected result

| month | revenue | orders | active_customers | new_customers | change_pct | revenue_to_date |
| --- | --- | --- | --- | --- | --- | --- |
| 2025-01 | 48.47 | 2 | 2 | 2 | NULL | 48.47 |
| 2025-02 | 29.25 | 1 | 1 | 0 | -39.7 | 77.72 |
| 2025-03 | 55.74 | 2 | 2 | 1 | 90.6 | 133.46 |

## Explanation

February fell by 39.7% with no new customers; March recovered by 90.6% with one new customer, ending the quarter at 133.46. The query is built in layers (order values, then order numbers, then months, then comparisons), the habit that keeps a long report readable and checkable.
