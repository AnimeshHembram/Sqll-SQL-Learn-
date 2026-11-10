---
id: da-day-067
title: Cumulative buyers by month
order: 67
difficulty: advanced
topic: Window functions
summary: Count first purchases per month, fill empty months and accumulate.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Accumulate counts over time
  - Keep empty periods in a running total
prerequisites:
  - Day 40
  - Day 37
---

## Task

Growth reports the **total number of customers who have ever bought**, month by month. A customer becomes a buyer in the month of their first non-cancelled order. Return `month` (every month that has any order), `new_buyers` (0 if none) and `total_buyers` (running total). Sort by month.

## Starter query

```sql
SELECT customer_id, MIN(order_date) AS first_order
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id;
```

## Hints

1. Step 1: the starter query gives each buyer's first order. Count them per month in a CTE.
2. Step 2: build the list of months from all orders, `LEFT JOIN` the counts and use `COALESCE(..., 0)`. February has no new buyer.
3. Step 3: `SUM(new_buyers) OVER (ORDER BY month) AS total_buyers`.

## Solution

```sql
WITH firsts AS (
  SELECT customer_id, strftime('%Y-%m', MIN(order_date)) AS month
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
),
months AS (
  SELECT DISTINCT strftime('%Y-%m', order_date) AS month FROM orders
),
counts AS (
  SELECT m.month, COUNT(f.customer_id) AS new_buyers
  FROM months AS m
  LEFT JOIN firsts AS f ON f.month = m.month
  GROUP BY m.month
)
SELECT month, new_buyers, SUM(new_buyers) OVER (ORDER BY month) AS total_buyers
FROM counts
ORDER BY month;
```

## Expected result

| month | new_buyers | total_buyers |
| --- | --- | --- |
| 2025-01 | 2 | 2 |
| 2025-02 | 0 | 2 |
| 2025-03 | 1 | 3 |

## Explanation

Two customers first bought in January, nobody new in February (Sofia Rossi's order was cancelled) and Daniel Kim in March. Keeping February as a 0 row means the running total visibly stays flat instead of the month disappearing from the chart.

## Wrong answers

Feedback: missing-rows

```sql
WITH firsts AS (SELECT customer_id, strftime('%Y-%m', MIN(order_date)) AS month FROM orders WHERE status <> 'cancelled' GROUP BY customer_id) SELECT month, COUNT(*) AS new_buyers, SUM(COUNT(*)) OVER (ORDER BY month) AS total_buyers FROM firsts GROUP BY month ORDER BY month;
```
