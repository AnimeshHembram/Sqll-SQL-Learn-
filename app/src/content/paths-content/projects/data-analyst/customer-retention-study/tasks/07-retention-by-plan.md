---
id: crs-07-retention-by-plan
title: Which plans keep customers
order: 7
difficulty: intermediate
topic: Segmentation
summary: Compare month-3 retention across the four subscription plans, with the price per plate of each.
module: who-stays
duration: 20
dataset: rasoi-crate
tables:
  - payments
  - customers
  - plans
orderMatters: true
checkColumnNames: true
objectives:
  - Join through a bridge table to a dimension
  - Normalise prices so plans can be compared
prerequisites:
  - Joins across three tables
  - Aggregate arithmetic
---

## Task

Rasoi Crate sells four plans, from a one-person *Solo Starter* to a four-person *Family Feast*. Using the same customers as Task 6 (first paid month March 2025 or earlier), return per plan:

- `plan` (the plan name) and `monthly_price`,
- `price_per_plate`: the monthly price divided by the plates delivered in a month (`people * meals_per_week * 4`), rounded to a whole rupee,
- `customers` and `m3_pct` (month-3 retention, one decimal).

Sort by `m3_pct`, highest first.

## Starter query

```sql
SELECT plan_id, name, meals_per_week, people, monthly_price
FROM plans;
```

## Hints

1. Start from the flags of Task 6, join `customers` (for `plan_id`) and `plans`, and group by the plan.
2. Plates per month are `people * meals_per_week * 4`. Divide with `1.0 *` in front so the result is not rounded down to a whole number too early.
3. The plan columns are the same for every row of a plan, so they can be selected next to the aggregates when you group by `p.plan_id, p.name, p.monthly_price`.

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
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
)
SELECT p.name AS plan,
       p.monthly_price,
       ROUND(1.0 * p.monthly_price / (p.people * p.meals_per_week * 4), 0) AS price_per_plate,
       COUNT(*) AS customers,
       ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct
FROM flags AS fl
JOIN customers AS c ON c.customer_id = fl.customer_id
JOIN plans AS p ON p.plan_id = c.plan_id
GROUP BY p.plan_id, p.name, p.monthly_price
ORDER BY m3_pct DESC;
```

## Expected result

| plan | monthly_price | price_per_plate | customers | m3_pct |
| --- | --- | --- | --- | --- |
| Family Feast | 4999 | 78 | 42 | 50 |
| Couple Plus | 3999 | 100 | 73 | 46.6 |
| Couple Classic | 2699 | 112 | 107 | 45.8 |
| Solo Starter | 1499 | 125 | 63 | 33.3 |

## Explanation

Joining through `customers` to `plans` brings the plan's attributes next to each customer's retention flags. `price_per_plate` normalises the plans so they can be compared on value, not just on price.

**What it tells the business:** retention rises with household size. **Family Feast keeps 50.0% at month 3; Solo Starter keeps only 33.3%**, even though it is the cheapest plan per month. Per plate it is the most expensive (₹125 against ₹78 for Family Feast), so single customers pay the most for each meal and leave fastest. A better-value solo plan, or a nudge to Couple Classic, could lift retention.

**Common mistake:** concluding that cheap plans are the problem because they are cheap. The monthly price is the lowest, but the value per plate is the worst: compare like with like.

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
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
)
SELECT p.name AS plan, p.monthly_price,
       ROUND(p.monthly_price / (p.people * p.meals_per_week * 4), 0) AS price_per_plate,
       COUNT(*) AS customers, ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct
FROM flags AS fl JOIN customers AS c ON c.customer_id = fl.customer_id JOIN plans AS p ON p.plan_id = c.plan_id
GROUP BY p.plan_id, p.name, p.monthly_price ORDER BY m3_pct DESC;
```

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
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
)
SELECT p.name AS plan, p.monthly_price,
       ROUND(1.0 * p.monthly_price / (p.people * p.meals_per_week * 4), 0) AS price_per_plate,
       COUNT(*) AS customers, ROUND(100.0 * AVG(fl.m1), 1) AS m3_pct
FROM flags AS fl JOIN customers AS c ON c.customer_id = fl.customer_id JOIN plans AS p ON p.plan_id = c.plan_id
GROUP BY p.plan_id, p.name, p.monthly_price ORDER BY m3_pct DESC;
```
