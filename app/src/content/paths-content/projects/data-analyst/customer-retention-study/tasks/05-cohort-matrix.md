---
id: crs-05-cohort-matrix
title: The cohort retention matrix
order: 5
difficulty: advanced
topic: Retention
summary: Build the classic cohort table: each cohort's size and its retention after one, three and six months, blank where it is too early to tell.
module: cohorts
duration: 35
dataset: rasoi-crate
tables:
  - payments
orderMatters: true
checkColumnNames: true
objectives:
  - Pivot retention offsets into columns
  - Mark unobservable periods with NULL
prerequisites:
  - EXISTS
  - CASE without ELSE
  - Common table expressions
---

## Task

Now compare cohorts with each other. For every `cohort_month`, return:

- `customers`: the cohort's size,
- `m1_pct`, `m3_pct` and `m6_pct`: the percentage of the cohort that paid exactly 1, 3 and 6 months after their first payment (one decimal),
- **NULL** for any of them that cannot be measured yet, because that month is after June 2025 (month number `2025 * 12 + 6`).

Sort by `cohort_month`.

## Starter query

```sql
WITH paid AS (
  SELECT DISTINCT customer_id, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
  FROM payments
  WHERE status = 'paid'
),
firsts AS (
  SELECT customer_id, MIN(month_no) AS first_no
  FROM paid
  GROUP BY customer_id
)
SELECT first_no, COUNT(*) AS customers
FROM firsts
GROUP BY first_no
ORDER BY first_no;
```

## Hints

1. Keep the cohort month as text too: add `MIN(billing_month) AS cohort_month` next to `MIN(month_no)` in the CTE of first payments.
2. For each customer, `EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3)` is 1 if they paid three months later. Make one flag per offset in a CTE.
3. Wrap each percentage in `CASE WHEN first_no + 3 <= 2025 * 12 + 6 THEN ... END`: without an `ELSE`, the result is NULL when the month is not observable.

## Solution

```sql
WITH paid AS (
  SELECT DISTINCT customer_id, billing_month, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
  FROM payments
  WHERE status = 'paid'
),
firsts AS (
  SELECT customer_id, MIN(billing_month) AS cohort_month, MIN(month_no) AS first_no
  FROM paid
  GROUP BY customer_id
),
flags AS (
  SELECT f.cohort_month, f.first_no,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 6) AS m6
  FROM firsts AS f
)
SELECT cohort_month,
       COUNT(*) AS customers,
       CASE WHEN first_no + 1 <= 2025 * 12 + 6 THEN ROUND(100.0 * SUM(m1) / COUNT(*), 1) END AS m1_pct,
       CASE WHEN first_no + 3 <= 2025 * 12 + 6 THEN ROUND(100.0 * SUM(m3) / COUNT(*), 1) END AS m3_pct,
       CASE WHEN first_no + 6 <= 2025 * 12 + 6 THEN ROUND(100.0 * SUM(m6) / COUNT(*), 1) END AS m6_pct
FROM flags
GROUP BY cohort_month
ORDER BY cohort_month;
```

## Expected result

| cohort_month | customers | m1_pct | m3_pct | m6_pct |
| --- | --- | --- | --- | --- |
| 2024-01 | 12 | 41.7 | 41.7 | 33.3 |
| 2024-02 | 10 | 80 | 60 | 50 |
| 2024-03 | 19 | 73.7 | 52.6 | 47.4 |
| 2024-04 | 11 | 81.8 | 45.5 | 45.5 |
| 2024-05 | 19 | 57.9 | 42.1 | 47.4 |
| 2024-06 | 12 | 75 | 50 | 41.7 |
| 2024-07 | 18 | 72.2 | 61.1 | 55.6 |
| 2024-08 | 22 | 63.6 | 50 | 54.5 |
| 2024-09 | 9 | 55.6 | 44.4 | 55.6 |
| 2024-10 | 27 | 44.4 | 44.4 | 44.4 |
| 2024-11 | 46 | 47.8 | 26.1 | 30.4 |
| 2024-12 | 22 | 63.6 | 36.4 | 27.3 |
| 2025-01 | 20 | 55 | 55 | NULL |
| 2025-02 | 18 | 66.7 | 44.4 | NULL |
| 2025-03 | 20 | 65 | 40 | NULL |
| 2025-04 | 22 | 63.6 | NULL | NULL |
| 2025-05 | 18 | 27.8 | NULL | NULL |
| 2025-06 | 27 | NULL | NULL | NULL |

## Explanation

Each customer gets three yes/no flags, and the cohort's percentages are averages of those flags. The `CASE` without `ELSE` is what turns "not observable yet" into NULL instead of a misleading 0%.

**What it tells the business:** most 2024 cohorts keep 42 to 61% at month 3. **November 2024 is the outlier: 26.1% at month 3, the worst cohort on record**, and 30.4% at month 6. The campaign doubled sign-ups but bought customers who left. Some cohorts have a higher month-6 than month-3 figure (September 2024: 44.4% then 55.6%): those are customers who cancelled and later came back, which Task 12 looks at. Cohorts of 10 to 27 customers are small, so read the pattern, not single values.

**Common mistake:** showing 0% for months that have not happened yet. A June 2025 cohort with "0% at month 3" looks like a disaster, when it simply has not had three months.

## Wrong answers

Feedback: incorrect-output

```sql
WITH paid AS (SELECT DISTINCT customer_id, billing_month, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no FROM payments WHERE status = 'paid'),
firsts AS (SELECT customer_id, MIN(billing_month) AS cohort_month, MIN(month_no) AS first_no FROM paid GROUP BY customer_id),
flags AS (
  SELECT f.cohort_month, f.first_no,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 6) AS m6
  FROM firsts AS f
)
SELECT cohort_month, COUNT(*) AS customers,
       ROUND(100.0 * SUM(m1) / COUNT(*), 1) AS m1_pct,
       ROUND(100.0 * SUM(m3) / COUNT(*), 1) AS m3_pct,
       ROUND(100.0 * SUM(m6) / COUNT(*), 1) AS m6_pct
FROM flags GROUP BY cohort_month ORDER BY cohort_month;
```

Feedback: incorrect-output

```sql
WITH paid AS (SELECT DISTINCT customer_id, billing_month, CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no FROM payments WHERE status = 'paid'),
firsts AS (SELECT customer_id, MIN(billing_month) AS cohort_month, MIN(month_no) AS first_no FROM paid GROUP BY customer_id),
flags AS (
  SELECT f.cohort_month, f.first_no,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no BETWEEN f.first_no + 1 AND f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no >= f.first_no + 3) AS m3,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no >= f.first_no + 6) AS m6
  FROM firsts AS f
)
SELECT cohort_month, COUNT(*) AS customers,
       CASE WHEN first_no + 1 <= 2025 * 12 + 6 THEN ROUND(100.0 * SUM(m1) / COUNT(*), 1) END AS m1_pct,
       CASE WHEN first_no + 3 <= 2025 * 12 + 6 THEN ROUND(100.0 * SUM(m3) / COUNT(*), 1) END AS m3_pct,
       CASE WHEN first_no + 6 <= 2025 * 12 + 6 THEN ROUND(100.0 * SUM(m6) / COUNT(*), 1) END AS m6_pct
FROM flags GROUP BY cohort_month ORDER BY cohort_month;
```
