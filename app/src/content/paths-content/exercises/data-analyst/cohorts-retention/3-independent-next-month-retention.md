---
id: da-next-month-retention
title: Next-month retention by cohort
order: 3
difficulty: advanced
topic: Retention
summary: Measure how many of each cohort bought again in the month after their first purchase.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate retention for one period
  - Find the next calendar month
---

## Task

For each first-purchase cohort (non-cancelled orders), return `cohort`, `customers` (cohort size), `returned` (customers with a non-cancelled order in the **calendar month right after** their first) and `retention_pct` (rounded to 1 decimal place). Sort by `cohort`.

## Starter query

```sql
SELECT customer_id, MIN(order_date) AS first_date
FROM orders
WHERE status <> 'cancelled'
GROUP BY customer_id;
```

## Hints

1. Put the starter query in a CTE. For each customer, test whether they have a non-cancelled order in the month after `first_date`.
2. The next month of a date is `strftime('%Y-%m', date(first_date, 'start of month', '+1 month'))`. Compare it with `strftime('%Y-%m', o.order_date)` inside `EXISTS`.
3. Group by `strftime('%Y-%m', first_date)`, count customers, sum the `EXISTS` flags and divide.

## Solution

```sql
WITH firsts AS (
  SELECT customer_id, MIN(order_date) AS first_date
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY customer_id
),
flags AS (
  SELECT strftime('%Y-%m', f.first_date) AS cohort,
    EXISTS (
      SELECT 1 FROM orders AS o
      WHERE o.customer_id = f.customer_id AND o.status <> 'cancelled'
        AND strftime('%Y-%m', o.order_date) = strftime('%Y-%m', date(f.first_date, 'start of month', '+1 month'))
    ) AS returned
  FROM firsts AS f
)
SELECT cohort, COUNT(*) AS customers, SUM(returned) AS returned,
  ROUND(100.0 * SUM(returned) / COUNT(*), 1) AS retention_pct
FROM flags
GROUP BY cohort
ORDER BY cohort;
```

## Expected result

| cohort | customers | returned | retention_pct |
| --- | --- | --- | --- |
| 2025-01 | 2 | 1 | 50 |
| 2025-03 | 1 | 0 | 0 |

## Explanation

In the January cohort, Aisha Khan came back in February but Rahul Mehta waited until March, so retention is 50.0%. Daniel Kim did not order in April, so the March cohort shows 0.0%. Using `'start of month'` before adding a month avoids surprises with dates such as 31 January.

## Wrong answers

Feedback: incorrect-output

```sql
WITH firsts AS (SELECT customer_id, MIN(order_date) AS first_date FROM orders WHERE status <> 'cancelled' GROUP BY customer_id), flags AS (SELECT strftime('%Y-%m', f.first_date) AS cohort, EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = f.customer_id AND o.status <> 'cancelled' AND o.order_date > f.first_date) AS returned FROM firsts AS f) SELECT cohort, COUNT(*) AS customers, SUM(returned) AS returned, ROUND(100.0 * SUM(returned) / COUNT(*), 1) AS retention_pct FROM flags GROUP BY cohort ORDER BY cohort;
```
