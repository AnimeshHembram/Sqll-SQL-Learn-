---
id: da-day-131
title: Cohort lifetime value curve
order: 131
difficulty: advanced
topic: Financial analysis
summary: Average cumulative revenue per customer by months since their first order, for each cohort.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a cumulative per-customer metric by cohort age
  - Limit a cohort table to observable periods
prerequisites:
  - Day 77
  - Day 106
---

## Task

A cohort is the month of a customer's **first order** (data in the starter query, to the end of March 2025). For each cohort and each month since the first order that can already be observed (month 0 = the first month, up to March 2025), return `cohort`, `month_index`, `customers` (the cohort's size) and `cumulative_ltv`: the cohort's total revenue from month 0 up to that month, divided by **all** customers in the cohort, rounded to 2 decimal places. Sort by `cohort`, then `month_index`.

## Starter query

```sql
WITH sales(customer, order_month, amount) AS (
  VALUES
    ('c1', '2025-01', 50), ('c1', '2025-01', 10), ('c1', '2025-02', 30), ('c1', '2025-03', 20),
    ('c2', '2025-01', 40), ('c2', '2025-03', 60),
    ('c3', '2025-02', 70), ('c3', '2025-03', 10),
    ('c4', '2025-02', 25),
    ('c5', '2025-03', 45)
)
SELECT customer, order_month, amount
FROM sales
ORDER BY customer, order_month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Find each customer's cohort (`MIN(order_month)`), then the month index of every order: the difference between the two months counted as `year * 12 + month`.
3. Build every cohort × month_index cell up to March 2025 (indices 0, 1, 2), `LEFT JOIN` the revenue per cell so empty months count as 0, and keep a running total: `SUM(revenue) OVER (PARTITION BY cohort ORDER BY month_index)`, divided by the cohort size.

## Solution

```sql
WITH sales(customer, order_month, amount) AS (
  VALUES
    ('c1', '2025-01', 50), ('c1', '2025-01', 10), ('c1', '2025-02', 30), ('c1', '2025-03', 20),
    ('c2', '2025-01', 40), ('c2', '2025-03', 60),
    ('c3', '2025-02', 70), ('c3', '2025-03', 10),
    ('c4', '2025-02', 25),
    ('c5', '2025-03', 45)
),
firsts AS (
  SELECT customer, MIN(order_month) AS cohort FROM sales GROUP BY customer
),
cohort_sizes AS (
  SELECT cohort, COUNT(*) AS customers FROM firsts GROUP BY cohort
),
indexed AS (
  SELECT f.cohort, s.amount,
    (CAST(substr(s.order_month, 1, 4) AS INTEGER) * 12 + CAST(substr(s.order_month, 6, 2) AS INTEGER)) - (CAST(substr(f.cohort, 1, 4) AS INTEGER) * 12 + CAST(substr(f.cohort, 6, 2) AS INTEGER)) AS month_index
  FROM sales AS s
  JOIN firsts AS f ON f.customer = s.customer
),
cells AS (
  SELECT c.cohort, c.customers, i.month_index
  FROM cohort_sizes AS c
  CROSS JOIN (SELECT 0 AS month_index UNION ALL SELECT 1 UNION ALL SELECT 2) AS i
  WHERE (CAST(substr(c.cohort, 1, 4) AS INTEGER) * 12 + CAST(substr(c.cohort, 6, 2) AS INTEGER)) + i.month_index <= (CAST(substr('2025-03', 1, 4) AS INTEGER) * 12 + CAST(substr('2025-03', 6, 2) AS INTEGER))
),
filled AS (
  SELECT c.cohort, c.customers, c.month_index,
    COALESCE((SELECT SUM(x.amount) FROM indexed AS x WHERE x.cohort = c.cohort AND x.month_index = c.month_index), 0) AS revenue
  FROM cells AS c
)
SELECT cohort, month_index, customers,
  ROUND(SUM(revenue) OVER (PARTITION BY cohort ORDER BY month_index) * 1.0 / customers, 2) AS cumulative_ltv
FROM filled
ORDER BY cohort, month_index;
```

## Expected result

| cohort | month_index | customers | cumulative_ltv |
| --- | --- | --- | --- |
| 2025-01 | 0 | 2 | 50 |
| 2025-01 | 1 | 2 | 65 |
| 2025-01 | 2 | 2 | 105 |
| 2025-02 | 0 | 2 | 47.5 |
| 2025-02 | 1 | 2 | 52.5 |
| 2025-03 | 0 | 1 | 45 |

## Explanation

An LTV curve shows how much, on average, a customer from each cohort has spent by a given age. Two choices make it meaningful:

- **Divide by the whole cohort**, not by the customers who happened to buy that month. In February, only one January customer bought anything, but the curve is about the average January customer.
- **Only show observable cells.** The March cohort is one month old, so it has a month 0 and nothing else; showing a 0 for its month 2 would look like a collapse.

The January cohort has spent 105 per customer after three months, while February's has 52.50 after two.

**Common mistake:** averaging over the customers active in each month, which inflates later months because only the keenest customers are still buying.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sales(customer, order_month, amount) AS ( VALUES ('c1', '2025-01', 50), ('c1', '2025-01', 10), ('c1', '2025-02', 30), ('c1', '2025-03', 20), ('c2', '2025-01', 40), ('c2', '2025-03', 60), ('c3', '2025-02', 70), ('c3', '2025-03', 10), ('c4', '2025-02', 25), ('c5', '2025-03', 45) ), firsts AS (SELECT customer, MIN(order_month) AS cohort FROM sales GROUP BY customer), indexed AS (SELECT f.cohort, s.customer, s.amount, (CAST(substr(s.order_month, 1, 4) AS INTEGER) * 12 + CAST(substr(s.order_month, 6, 2) AS INTEGER)) - (CAST(substr(f.cohort, 1, 4) AS INTEGER) * 12 + CAST(substr(f.cohort, 6, 2) AS INTEGER)) AS month_index FROM sales AS s JOIN firsts AS f ON f.customer = s.customer), per_cell AS (SELECT cohort, month_index, COUNT(DISTINCT customer) AS customers, SUM(amount) AS revenue FROM indexed GROUP BY cohort, month_index) SELECT cohort, month_index, customers, ROUND(SUM(revenue) OVER (PARTITION BY cohort ORDER BY month_index) * 1.0 / customers, 2) AS cumulative_ltv FROM per_cell ORDER BY cohort, month_index;
```
