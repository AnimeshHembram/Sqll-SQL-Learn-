---
id: da-day-051
title: New and returning orders each month
order: 51
difficulty: advanced
topic: Metrics
summary: Classify orders by whether they are the customer's first, then count per month.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Classify rows with a window result
  - Count categories per period
prerequisites:
  - Day 38
  - Day 29
---

## Task

Considering only non-cancelled orders, call an order **new** if it is the customer's first non-cancelled order and **returning** otherwise. Return `month` (`YYYY-MM`), `new_orders` and `returning_orders`. Sort by month.

## Starter query

```sql
SELECT id, customer_id, order_date
FROM orders
WHERE status <> 'cancelled';
```

## Hints

1. Number each customer's non-cancelled orders by date with `ROW_NUMBER()`, in a CTE.
2. Number 1 is a new order; anything higher is returning.
3. `SUM(CASE WHEN order_number = 1 THEN 1 ELSE 0 END) AS new_orders` and the opposite for returning, grouped by month.

## Solution

```sql
WITH numbered AS (
  SELECT strftime('%Y-%m', order_date) AS month,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS order_number
  FROM orders
  WHERE status <> 'cancelled'
)
SELECT month,
  SUM(CASE WHEN order_number = 1 THEN 1 ELSE 0 END) AS new_orders,
  SUM(CASE WHEN order_number > 1 THEN 1 ELSE 0 END) AS returning_orders
FROM numbered
GROUP BY month
ORDER BY month;
```

## Expected result

| month | new_orders | returning_orders |
| --- | --- | --- |
| 2025-01 | 2 | 0 |
| 2025-02 | 0 | 1 |
| 2025-03 | 1 | 1 |

## Explanation

January's two orders were both first orders; February's only non-cancelled order was Aisha Khan coming back; March had one of each. Filtering cancelled orders *before* numbering matters: otherwise a cancelled first order would make the next real one look like a return.
