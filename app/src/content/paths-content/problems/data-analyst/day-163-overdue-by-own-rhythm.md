---
id: da-day-163
title: Overdue by the customer's own rhythm
order: 163
difficulty: intermediate
topic: Behavioural analytics
summary: Compare each customer's silence with their own typical gap between orders.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a personal baseline from gaps between events
  - Deduplicate events to the right grain first
prerequisites:
  - Day 41
  - Day 79
---

## Task

A fixed "no order in 60 days" rule treats weekly and quarterly buyers the same. Instead, as of **2025-06-30**, compare each customer's days since their last order with **their own average gap** between ordering days (several orders on one day count as one ordering day).

Return `customer`, `order_days`, `avg_gap_days` (rounded to 1 decimal place, `NULL` with fewer than 3 ordering days), `days_since_last` and `status`: `'not enough history'` with fewer than 3 ordering days, `'at risk'` when the days since the last order are **more than twice** the average gap, otherwise `'on rhythm'`. Sort by `customer`.

## Starter query

```sql
WITH orders(customer, ordered_on) AS (
  VALUES
    ('k1', '2025-01-01'), ('k1', '2025-02-01'), ('k1', '2025-03-01'), ('k1', '2025-04-01'),
    ('k2', '2025-05-01'), ('k2', '2025-05-15'), ('k2', '2025-06-01'), ('k2', '2025-06-20'),
    ('k3', '2025-01-10'), ('k3', '2025-06-10'),
    ('k4', '2025-03-01'), ('k4', '2025-03-01'), ('k4', '2025-03-11'), ('k4', '2025-03-21'),
    ('k5', '2025-02-01'), ('k5', '2025-04-01'), ('k5', '2025-06-01'),
    ('k6', '2025-05-21'), ('k6', '2025-05-31'), ('k6', '2025-06-10')
)
SELECT customer, ordered_on
FROM orders
ORDER BY customer, ordered_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Start from `SELECT DISTINCT customer, ordered_on FROM orders`, then the gap to the previous day with `julianday(ordered_on) - julianday(LAG(ordered_on) OVER (PARTITION BY customer ORDER BY ordered_on))`.
3. Group by customer: `COUNT(*)`, `AVG(gap)` (the first day's `NULL` gap is ignored) and `MAX(ordered_on)`. Days since last = `julianday('2025-06-30') - julianday(last_order)`.

## Solution

```sql
WITH orders(customer, ordered_on) AS (
  VALUES
    ('k1', '2025-01-01'), ('k1', '2025-02-01'), ('k1', '2025-03-01'), ('k1', '2025-04-01'),
    ('k2', '2025-05-01'), ('k2', '2025-05-15'), ('k2', '2025-06-01'), ('k2', '2025-06-20'),
    ('k3', '2025-01-10'), ('k3', '2025-06-10'),
    ('k4', '2025-03-01'), ('k4', '2025-03-01'), ('k4', '2025-03-11'), ('k4', '2025-03-21'),
    ('k5', '2025-02-01'), ('k5', '2025-04-01'), ('k5', '2025-06-01'),
    ('k6', '2025-05-21'), ('k6', '2025-05-31'), ('k6', '2025-06-10')
),
order_days AS (
  SELECT DISTINCT customer, ordered_on FROM orders
),
gaps AS (
  SELECT customer, ordered_on,
    julianday(ordered_on) - julianday(LAG(ordered_on) OVER (PARTITION BY customer ORDER BY ordered_on)) AS gap
  FROM order_days
),
per_customer AS (
  SELECT customer, COUNT(*) AS order_days, AVG(gap) AS avg_gap,
    CAST(julianday('2025-06-30') - julianday(MAX(ordered_on)) AS INTEGER) AS days_since_last
  FROM gaps
  GROUP BY customer
)
SELECT customer, order_days,
  CASE WHEN order_days >= 3 THEN ROUND(avg_gap, 1) END AS avg_gap_days,
  days_since_last,
  CASE
    WHEN order_days < 3 THEN 'not enough history'
    WHEN days_since_last > 2 * avg_gap THEN 'at risk'
    ELSE 'on rhythm'
  END AS status
FROM per_customer
ORDER BY customer;
```

## Expected result

| customer | order_days | avg_gap_days | days_since_last | status |
| --- | --- | --- | --- | --- |
| k1 | 4 | 30 | 90 | at risk |
| k2 | 4 | 16.7 | 10 | on rhythm |
| k3 | 2 | NULL | 20 | not enough history |
| k4 | 3 | 10 | 101 | at risk |
| k5 | 3 | 60 | 29 | on rhythm |
| k6 | 3 | 10 | 20 | on rhythm |

## Explanation

Personal baselines catch churn that fixed thresholds miss. k1 orders monthly and has been silent for 90 days: at risk. k5 orders every two months and last ordered 29 days ago: perfectly normal, although a 60-day rule would soon flag them, and would never notice k4, who ordered every 10 days and then stopped.

Three edge cases are decided by the wording. k4's two orders on 1 March count as one ordering day, so the average gap is 10, not 6.7. k6 has been quiet for exactly twice the average gap, 20 days; only "more than twice" is at risk. k3 has only two ordering days, and one gap is too little to call a rhythm.

**Common mistake:** computing gaps on raw order rows, so same-day orders add zero-day gaps and shrink the average.

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders(customer, ordered_on) AS ( VALUES ('k1', '2025-01-01'), ('k1', '2025-02-01'), ('k1', '2025-03-01'), ('k1', '2025-04-01'), ('k2', '2025-05-01'), ('k2', '2025-05-15'), ('k2', '2025-06-01'), ('k2', '2025-06-20'), ('k3', '2025-01-10'), ('k3', '2025-06-10'), ('k4', '2025-03-01'), ('k4', '2025-03-01'), ('k4', '2025-03-11'), ('k4', '2025-03-21'), ('k5', '2025-02-01'), ('k5', '2025-04-01'), ('k5', '2025-06-01'), ('k6', '2025-05-21'), ('k6', '2025-05-31'), ('k6', '2025-06-10') ), gaps AS (SELECT customer, ordered_on, julianday(ordered_on) - julianday(LAG(ordered_on) OVER (PARTITION BY customer ORDER BY ordered_on)) AS gap FROM orders), per_customer AS (SELECT customer, COUNT(*) AS order_days, AVG(gap) AS avg_gap, CAST(julianday('2025-06-30') - julianday(MAX(ordered_on)) AS INTEGER) AS days_since_last FROM gaps GROUP BY customer) SELECT customer, order_days, CASE WHEN order_days >= 3 THEN ROUND(avg_gap, 1) END AS avg_gap_days, days_since_last, CASE WHEN order_days < 3 THEN 'not enough history' WHEN days_since_last > 2 * avg_gap THEN 'at risk' ELSE 'on rhythm' END AS status FROM per_customer ORDER BY customer;
```
