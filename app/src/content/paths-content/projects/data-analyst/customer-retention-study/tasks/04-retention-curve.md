---
id: crs-04-retention-curve
title: The retention curve
order: 4
difficulty: advanced
topic: Retention
summary: Measure what share of the 2024 cohorts still pay one to six months after their first payment.
module: cohorts
duration: 30
dataset: rasoi-crate
tables:
  - payments
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate months between dates with month numbers
  - Build a retention curve on a fixed group of cohorts
prerequisites:
  - Common table expressions
  - FIRST_VALUE
  - Date text functions
---

## Task

How quickly do customers leave? Take the customers whose first paid month was in **2024** (every one of them can be followed for at least six months before the data ends in June 2025).

For `months_since_first` from 0 to 6, return `active_customers` (how many of them paid in that month after their first) and `retention_pct` (as a percentage of month 0, one decimal). Sort by `months_since_first`.

Tip: to subtract months, turn `'2024-05'` into a month number, `year * 12 + month`: `CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER)`.

## Starter query

```sql
SELECT customer_id, billing_month,
       CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER) AS month_no
FROM payments
WHERE status = 'paid'
LIMIT 20;
```

## Hints

1. Build two CTEs: `paid` (one row per customer and paid month, with its month number) and `firsts` (each customer's smallest month number).
2. Join them and compute `months_since_first = month_no - first_no`. Keep customers whose first month number is at most `2024 * 12 + 12`.
3. Group by `months_since_first`. Month 0 is the whole cohort, so `FIRST_VALUE(COUNT(*)) OVER (ORDER BY months_since_first)` gives the base for the percentage.

## Solution

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
),
activity AS (
  SELECT p.customer_id, p.month_no - f.first_no AS months_since_first
  FROM paid AS p
  JOIN firsts AS f ON f.customer_id = p.customer_id
  WHERE f.first_no <= 2024 * 12 + 12
)
SELECT months_since_first,
       COUNT(*) AS active_customers,
       ROUND(100.0 * COUNT(*) / FIRST_VALUE(COUNT(*)) OVER (ORDER BY months_since_first), 1) AS retention_pct
FROM activity
WHERE months_since_first <= 6
GROUP BY months_since_first
ORDER BY months_since_first;
```

## Expected result

| months_since_first | active_customers | retention_pct |
| --- | --- | --- |
| 0 | 227 | 100 |
| 1 | 136 | 59.9 |
| 2 | 109 | 48 |
| 3 | 98 | 43.2 |
| 4 | 98 | 43.2 |
| 5 | 100 | 44.1 |
| 6 | 96 | 42.3 |

## Explanation

Month numbers turn calendar months into a simple count, so "three months after the first payment" is `first_no + 3` whatever the year. Restricting to 2024 cohorts keeps every month in the curve measured on the same customers.

**What it tells the business:** of 227 customers, only **59.9% paid a second month**, and 43.2% were still paying at month 3. After that the curve is flat: 42.3% at month 6, and it even rises slightly in month 5 as some customers who cancelled come back. Almost all the loss happens in the **first two months**, so onboarding and the first boxes matter far more than anything later.

**Common mistake:** including the 2025 cohorts. They have not had six months yet, so they drag the later months down and make retention look worse than it is.

## Other accepted answers

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
),
activity AS (
  SELECT p.month_no - f.first_no AS months_since_first
  FROM paid AS p JOIN firsts AS f ON f.customer_id = p.customer_id
  WHERE f.first_no <= 2024 * 12 + 12
)
SELECT months_since_first, COUNT(*) AS active_customers,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM firsts WHERE first_no <= 2024 * 12 + 12), 1) AS retention_pct
FROM activity
WHERE months_since_first <= 6
GROUP BY months_since_first
ORDER BY months_since_first;
```

## Wrong answers

Feedback: incorrect-output

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
),
activity AS (
  SELECT p.month_no - f.first_no AS months_since_first FROM paid AS p JOIN firsts AS f ON f.customer_id = p.customer_id
)
SELECT months_since_first, COUNT(*) AS active_customers,
       ROUND(100.0 * COUNT(*) / FIRST_VALUE(COUNT(*)) OVER (ORDER BY months_since_first), 1) AS retention_pct
FROM activity WHERE months_since_first <= 6
GROUP BY months_since_first ORDER BY months_since_first;
```

Feedback: incorrect-output

```sql
WITH firsts AS (SELECT customer_id, MIN(billing_month) AS first_month FROM payments WHERE status = 'paid' GROUP BY customer_id),
activity AS (
  SELECT CAST(substr(p.billing_month, 6, 2) AS INTEGER) - CAST(substr(f.first_month, 6, 2) AS INTEGER) AS months_since_first
  FROM payments AS p JOIN firsts AS f ON f.customer_id = p.customer_id
  WHERE p.status = 'paid' AND f.first_month <= '2024-12'
)
SELECT months_since_first, COUNT(*) AS active_customers,
       ROUND(100.0 * COUNT(*) / FIRST_VALUE(COUNT(*)) OVER (ORDER BY months_since_first), 1) AS retention_pct
FROM activity WHERE months_since_first BETWEEN 0 AND 6
GROUP BY months_since_first ORDER BY months_since_first;
```
