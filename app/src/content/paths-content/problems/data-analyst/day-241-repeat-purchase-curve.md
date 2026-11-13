---
id: da-day-241
title: How quickly do new customers come back?
order: 241
difficulty: advanced
topic: Customer analytics
summary: Measure the share of each first-order month that bought again within 30, 60 and 90 days.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure time to the second order
  - Build a cumulative return curve
prerequisites:
  - Day 79
  - Day 77
---

## Task

For customers who placed their **first order** in January or February 2025 (orders in the starter query), find the share that placed **another order** within 30, 60 and 90 days of the first one. A second order on the same day as the first does not count as coming back.

Return `cohort` (the first-order month, `'YYYY-MM'`), `customers`, `back_30_pct`, `back_60_pct` and `back_90_pct` (rounded to 1 decimal place). Sort by `cohort`.

## Starter query

```sql
WITH orders(customer, ordered_on) AS (
  VALUES
    ('c1', '2025-01-03'), ('c1', '2025-01-20'), ('c1', '2025-03-01'),
    ('c2', '2025-01-10'), ('c2', '2025-04-15'),
    ('c3', '2025-01-15'), ('c3', '2025-02-10'),
    ('c4', '2025-01-28'),
    ('c5', '2025-02-02'), ('c5', '2025-02-05'),
    ('c6', '2025-02-11'), ('c6', '2025-04-20'),
    ('c7', '2025-02-20'), ('c7', '2025-02-20'), ('c7', '2025-03-30'),
    ('c8', '2025-02-25')
)
SELECT customer, ordered_on
FROM orders
ORDER BY customer, ordered_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Find each customer's first order date with `MIN(ordered_on)`, then their first **later** order: `MIN(o.ordered_on)` over orders with `o.ordered_on > first_order`, using a `LEFT JOIN` so customers who never returned keep a `NULL`.
3. The gap is `julianday(next_order) - julianday(first_order)`. `SUM(gap <= 30)` counts returners within 30 days (a `NULL` gap adds nothing). Divide by `COUNT(*)` per cohort.

## Solution

```sql
WITH orders(customer, ordered_on) AS (
  VALUES
    ('c1', '2025-01-03'), ('c1', '2025-01-20'), ('c1', '2025-03-01'),
    ('c2', '2025-01-10'), ('c2', '2025-04-15'),
    ('c3', '2025-01-15'), ('c3', '2025-02-10'),
    ('c4', '2025-01-28'),
    ('c5', '2025-02-02'), ('c5', '2025-02-05'),
    ('c6', '2025-02-11'), ('c6', '2025-04-20'),
    ('c7', '2025-02-20'), ('c7', '2025-02-20'), ('c7', '2025-03-30'),
    ('c8', '2025-02-25')
),
firsts AS (
  SELECT customer, MIN(ordered_on) AS first_order FROM orders GROUP BY customer
),
returns AS (
  SELECT f.customer, f.first_order, MIN(o.ordered_on) AS next_order
  FROM firsts AS f
  LEFT JOIN orders AS o ON o.customer = f.customer AND o.ordered_on > f.first_order
  GROUP BY f.customer, f.first_order
),
gaps AS (
  SELECT strftime('%Y-%m', first_order) AS cohort, julianday(next_order) - julianday(first_order) AS gap
  FROM returns
  WHERE first_order < '2025-03-01'
)
SELECT cohort, COUNT(*) AS customers,
  ROUND(100.0 * SUM(gap <= 30) / COUNT(*), 1) AS back_30_pct,
  ROUND(100.0 * SUM(gap <= 60) / COUNT(*), 1) AS back_60_pct,
  ROUND(100.0 * SUM(gap <= 90) / COUNT(*), 1) AS back_90_pct
FROM gaps
GROUP BY cohort
ORDER BY cohort;
```

## Expected result

| cohort | customers | back_30_pct | back_60_pct | back_90_pct |
| --- | --- | --- | --- | --- |
| 2025-01 | 4 | 50 | 50 | 50 |
| 2025-02 | 4 | 25 | 50 | 75 |

## Explanation

A return curve answers "how soon do new customers come back?" by cohort. Each customer's first order fixes their cohort, and their first **later** order fixes the gap; a `LEFT JOIN` keeps customers who never returned, whose `NULL` gap adds nothing to any `SUM(gap <= n)`.

January's cohort is fast or not at all: two of four came back within a month, and nobody else did within 90 days (c2 returned after 95). February's cohort builds up more slowly, 25% by 30 days, 50% by 60 and 75% by 90. Customer c7's second order on the same day as the first is part of the first visit, not a return; the strict `>` in the join leaves it out, so c7's real return is 38 days later.

**Common mistake:** joining on `o.ordered_on >= first_order`. Every customer then "returns" on the day of their first order, with a gap of 0, and every cohort shows 100%.

## Wrong answers

Feedback: incorrect-output

```sql
WITH orders(customer, ordered_on) AS ( VALUES ('c1', '2025-01-03'), ('c1', '2025-01-20'), ('c1', '2025-03-01'), ('c2', '2025-01-10'), ('c2', '2025-04-15'), ('c3', '2025-01-15'), ('c3', '2025-02-10'), ('c4', '2025-01-28'), ('c5', '2025-02-02'), ('c5', '2025-02-05'), ('c6', '2025-02-11'), ('c6', '2025-04-20'), ('c7', '2025-02-20'), ('c7', '2025-02-20'), ('c7', '2025-03-30'), ('c8', '2025-02-25') ), firsts AS (SELECT customer, MIN(ordered_on) AS first_order FROM orders GROUP BY customer), returns AS (SELECT f.customer, f.first_order, MIN(o.ordered_on) AS next_order FROM firsts AS f LEFT JOIN orders AS o ON o.customer = f.customer AND o.ordered_on >= f.first_order GROUP BY f.customer, f.first_order), gaps AS (SELECT strftime('%Y-%m', first_order) AS cohort, julianday(next_order) - julianday(first_order) AS gap FROM returns WHERE first_order < '2025-03-01') SELECT cohort, COUNT(*) AS customers, ROUND(100.0 * SUM(gap <= 30) / COUNT(*), 1) AS back_30_pct, ROUND(100.0 * SUM(gap <= 60) / COUNT(*), 1) AS back_60_pct, ROUND(100.0 * SUM(gap <= 90) / COUNT(*), 1) AS back_90_pct FROM gaps GROUP BY cohort ORDER BY cohort;
```
