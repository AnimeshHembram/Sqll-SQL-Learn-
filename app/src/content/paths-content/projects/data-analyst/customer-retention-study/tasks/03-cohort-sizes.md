---
id: crs-03-cohort-sizes
title: Monthly cohorts
order: 3
difficulty: intermediate
topic: Cohorts
summary: Group paying customers into cohorts by the month of their first paid payment, with each cohort's share of free first boxes.
module: cohorts
duration: 20
dataset: rasoi-crate
tables:
  - payments
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Assign customers to cohorts by their first purchase
  - Profile cohorts before comparing them
prerequisites:
  - MIN with GROUP BY
  - Common table expressions
---

## Task

A **cohort** is a group of customers who started in the same month. At Rasoi Crate a customer starts in the month of their **first paid payment**.

For each `cohort_month`, return `customers` (the cohort's size), `free_first_box` (how many of them got their first box free, `first_offer = 'free_first_box'`) and `free_first_box_pct` (one decimal). Sort by `cohort_month`.

## Starter query

```sql
SELECT customer_id, billing_month
FROM payments
WHERE status = 'paid'
ORDER BY customer_id, billing_month
LIMIT 20;
```

## Hints

1. Each customer's cohort is `MIN(billing_month)` over their paid payments. Put that in a CTE with one row per customer.
2. Join the CTE to `customers` to read `first_offer`, then group by the cohort month.
3. `SUM(first_offer = 'free_first_box')` counts the free boxes, because a true comparison is 1.

## Solution

```sql
WITH firsts AS (
  SELECT customer_id, MIN(billing_month) AS cohort_month
  FROM payments
  WHERE status = 'paid'
  GROUP BY customer_id
)
SELECT f.cohort_month,
       COUNT(*) AS customers,
       SUM(c.first_offer = 'free_first_box') AS free_first_box,
       ROUND(100.0 * SUM(c.first_offer = 'free_first_box') / COUNT(*), 1) AS free_first_box_pct
FROM firsts AS f
JOIN customers AS c ON c.customer_id = f.customer_id
GROUP BY f.cohort_month
ORDER BY f.cohort_month;
```

## Expected result

| cohort_month | customers | free_first_box | free_first_box_pct |
| --- | --- | --- | --- |
| 2024-01 | 12 | 4 | 33.3 |
| 2024-02 | 10 | 1 | 10 |
| 2024-03 | 19 | 4 | 21.1 |
| 2024-04 | 11 | 3 | 27.3 |
| 2024-05 | 19 | 0 | 0 |
| 2024-06 | 12 | 2 | 16.7 |
| 2024-07 | 18 | 2 | 11.1 |
| 2024-08 | 22 | 2 | 9.1 |
| 2024-09 | 9 | 1 | 11.1 |
| 2024-10 | 27 | 7 | 25.9 |
| 2024-11 | 46 | 22 | 47.8 |
| 2024-12 | 22 | 5 | 22.7 |
| 2025-01 | 20 | 3 | 15 |
| 2025-02 | 18 | 4 | 22.2 |
| 2025-03 | 20 | 2 | 10 |
| 2025-04 | 22 | 4 | 18.2 |
| 2025-05 | 18 | 5 | 27.8 |
| 2025-06 | 27 | 3 | 11.1 |

## Explanation

The CTE reduces the payments to one row per customer: their start month. Every cohort analysis starts with this step.

**What it tells the business:** most cohorts have 10 to 27 customers, but **November 2024 has 46**, and almost half of them (47.8%) got their first box free. That cohort will matter: it is the biggest single group of customers the company ever acquired.

**Common mistake:** using `signup_date` as the cohort. Signing up is not starting: some signups paid weeks later and some never paid at all (Task 2).

## Wrong answers

Feedback: incorrect-output

```sql
SELECT substr(c.signup_date, 1, 7) AS cohort_month, COUNT(*) AS customers,
       SUM(c.first_offer = 'free_first_box') AS free_first_box,
       ROUND(100.0 * SUM(c.first_offer = 'free_first_box') / COUNT(*), 1) AS free_first_box_pct
FROM customers AS c
GROUP BY cohort_month
ORDER BY cohort_month;
```

Feedback: incorrect-output

```sql
SELECT p.billing_month AS cohort_month, COUNT(*) AS customers,
       SUM(c.first_offer = 'free_first_box') AS free_first_box,
       ROUND(100.0 * SUM(c.first_offer = 'free_first_box') / COUNT(*), 1) AS free_first_box_pct
FROM payments AS p JOIN customers AS c ON c.customer_id = p.customer_id
WHERE p.status = 'paid'
GROUP BY p.billing_month
ORDER BY cohort_month;
```
