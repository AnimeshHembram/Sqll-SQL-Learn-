---
id: da-day-077
title: Cohort retention table
order: 77
difficulty: advanced
topic: Segmentation
summary: Count active customers by first-purchase month and months since.
module: data-analyst
duration: 15
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Build a cohort retention table
  - Count calendar months between dates
prerequisites:
  - Day 49
  - Day 67
---

## Task

Group buyers into cohorts by the month of their first non-cancelled order. For each cohort, count how many of its customers bought (non-cancelled) in each later month. Return `cohort` (`YYYY-MM`), `months_since` (0 for the first month, 1 for the next, ...) and `customers`. Only rows with at least one customer. Sort by `cohort`, then `months_since`.

## Starter query

```sql
SELECT customer_id, strftime('%Y-%m', MIN(order_date)) AS cohort
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id;
```

## Hints

1. Put the starter query in a CTE called `cohorts`, and join it back to the non-cancelled orders.
2. Months between two dates: `(year × 12 + month)` of the order minus the same for the cohort. Use `CAST(strftime('%Y', d) AS INTEGER) * 12 + CAST(strftime('%m', d) AS INTEGER)`; for the cohort, use `cohort || '-01'` as the date.
3. `GROUP BY cohort, months_since` with `COUNT(DISTINCT o.customer_id) AS customers`.

## Solution

```sql
WITH cohorts AS (
  SELECT customer_id, strftime('%Y-%m', MIN(order_date)) AS cohort
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
)
SELECT c.cohort,
  (CAST(strftime('%Y', o.order_date) AS INTEGER) * 12 + CAST(strftime('%m', o.order_date) AS INTEGER))
  - (CAST(strftime('%Y', c.cohort || '-01') AS INTEGER) * 12 + CAST(strftime('%m', c.cohort || '-01') AS INTEGER)) AS months_since,
  COUNT(DISTINCT o.customer_id) AS customers
FROM cohorts AS c
JOIN orders AS o ON o.customer_id = c.customer_id AND o.status <> 'cancelled'
GROUP BY c.cohort, months_since
ORDER BY c.cohort, months_since;
```

## Expected result

| cohort | months_since | customers |
| --- | --- | --- |
| 2025-01 | 0 | 2 |
| 2025-01 | 1 | 1 |
| 2025-01 | 2 | 1 |
| 2025-03 | 0 | 1 |

## Explanation

The January cohort has two customers: one came back in month 1 (Aisha Khan) and one in month 2 (Rahul Mehta). Counting months as year × 12 + month works across year boundaries, where subtracting month numbers alone would fail.
