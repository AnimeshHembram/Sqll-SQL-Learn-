---
id: da-day-337
title: Subscriptions cancelled in the first week
order: 337
difficulty: intermediate
topic: Interview practice
summary: Measure the share of new subscriptions cancelled within seven days, by plan.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure early churn
  - Count conditions that may be NULL
prerequisites:
  - Day 109
  - Day 140
---

## Task

For subscriptions started in **January 2025** (starter query), what share were cancelled within **7 days** of starting (cancellation date no later than 7 days after the start date)? Return `plan`, `started`, `cancelled_7d`, `cancelled_7d_pct` (rounded to 1 decimal place) and `still_active` (no cancellation date). Sort by `plan`.

## Starter query

```sql
WITH subscriptions(sub_id, plan, started, cancelled) AS (
  VALUES
    (1, 'monthly', '2025-01-03', '2025-01-06'), (2, 'monthly', '2025-01-05', NULL), (3, 'monthly', '2025-01-10', '2025-02-15'),
    (4, 'monthly', '2025-01-12', '2025-01-19'), (5, 'monthly', '2025-01-20', '2025-01-20'), (6, 'annual', '2025-01-04', NULL),
    (7, 'annual', '2025-01-08', '2025-01-10'), (8, 'annual', '2025-01-15', NULL), (9, 'annual', '2025-01-25', '2025-03-01'),
    (10, 'monthly', '2025-01-28', NULL)
)
SELECT sub_id, plan, started, cancelled
FROM subscriptions
ORDER BY sub_id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Days to cancel: `julianday(cancelled) - julianday(started)`; it is `NULL` for active subscriptions, which `SUM(days <= 7)` does not count.
3. Group by plan: `COUNT(*)`, `SUM(... <= 7)` and `SUM(cancelled IS NULL)`.

## Solution

```sql
WITH subscriptions(sub_id, plan, started, cancelled) AS (
  VALUES
    (1, 'monthly', '2025-01-03', '2025-01-06'), (2, 'monthly', '2025-01-05', NULL), (3, 'monthly', '2025-01-10', '2025-02-15'),
    (4, 'monthly', '2025-01-12', '2025-01-19'), (5, 'monthly', '2025-01-20', '2025-01-20'), (6, 'annual', '2025-01-04', NULL),
    (7, 'annual', '2025-01-08', '2025-01-10'), (8, 'annual', '2025-01-15', NULL), (9, 'annual', '2025-01-25', '2025-03-01'),
    (10, 'monthly', '2025-01-28', NULL)
)
SELECT plan, COUNT(*) AS started,
  SUM(julianday(cancelled) - julianday(started) <= 7) AS cancelled_7d,
  ROUND(100.0 * SUM(julianday(cancelled) - julianday(started) <= 7) / COUNT(*), 1) AS cancelled_7d_pct,
  SUM(cancelled IS NULL) AS still_active
FROM subscriptions
WHERE started BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY plan
ORDER BY plan;
```

## Expected result

| plan | started | cancelled_7d | cancelled_7d_pct | still_active |
| --- | --- | --- | --- | --- |
| annual | 4 | 1 | 25 | 2 |
| monthly | 6 | 3 | 50 | 2 |

## Explanation

Early cancellation is a strong signal that onboarding failed. Half of January's monthly subscriptions were cancelled within a week, including subscription 5, cancelled on the day it started; only one of the four annual plans was.

The 7-day test is `cancelled − started <= 7`: subscription 4 cancelled after exactly 7 days, which counts. Active subscriptions have no cancellation date, so the difference is `NULL` and they add nothing to the count without any special handling. Subscription 3 cancelled after 36 days and is not an early cancellation.

**Common mistake:** `< 7`. Subscription 4, cancelled exactly a week in, is missed, and the monthly plan's early cancellation rate drops from 50% to 33.3%.

## Wrong answers

Feedback: incorrect-output

```sql
WITH subscriptions(sub_id, plan, started, cancelled) AS ( VALUES (1, 'monthly', '2025-01-03', '2025-01-06'), (2, 'monthly', '2025-01-05', NULL), (3, 'monthly', '2025-01-10', '2025-02-15'), (4, 'monthly', '2025-01-12', '2025-01-19'), (5, 'monthly', '2025-01-20', '2025-01-20'), (6, 'annual', '2025-01-04', NULL), (7, 'annual', '2025-01-08', '2025-01-10'), (8, 'annual', '2025-01-15', NULL), (9, 'annual', '2025-01-25', '2025-03-01'), (10, 'monthly', '2025-01-28', NULL) ) SELECT plan, COUNT(*) AS started, SUM(julianday(cancelled) - julianday(started) < 7) AS cancelled_7d, ROUND(100.0 * SUM(julianday(cancelled) - julianday(started) < 7) / COUNT(*), 1) AS cancelled_7d_pct, SUM(cancelled IS NULL) AS still_active FROM subscriptions WHERE started BETWEEN '2025-01-01' AND '2025-01-31' GROUP BY plan ORDER BY plan;
```
