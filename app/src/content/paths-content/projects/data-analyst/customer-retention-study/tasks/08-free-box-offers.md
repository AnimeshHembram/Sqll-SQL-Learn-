---
id: crs-08-free-box-offers
title: Do free first boxes pay off?
order: 8
difficulty: advanced
topic: Pricing analysis
summary: Compare retention and early revenue for customers who started with no offer, half off, or a free first box.
module: who-stays
duration: 30
dataset: rasoi-crate
tables:
  - payments
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Combine retention and revenue per customer
  - Evaluate a promotion by the customers it brings
prerequisites:
  - Common table expressions
  - Correlated conditions
  - AVG
---

## Task

Growth marketing loves the free first box: it doubles sign-ups. Finance is less sure. Using the same customers as Task 6, return per `first_offer`:

- `customers`,
- `m1_pct` and `m3_pct` (one decimal),
- `avg_revenue_first_3_months`: the average amount a customer paid in their first three months (months 0, 1 and 2 after their first payment), rounded to a whole rupee.

Sort by `m3_pct`, highest first.

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
),
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
)
SELECT c.first_offer, COUNT(*) AS customers
FROM flags AS fl
JOIN customers AS c ON c.customer_id = fl.customer_id
GROUP BY c.first_offer;
```

## Hints

1. Keep the flags and add one more column per customer: their paid amount in months `first_no` to `first_no + 2`, as a correlated subquery or a separate CTE.
2. Payments need their month number too: compare `CAST(substr(billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(billing_month, 6, 2) AS INTEGER)` with `f.first_no + 2`. Only paid rows count.
3. Group by `first_offer`: `AVG` of that revenue column gives the average per customer.

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
early_revenue AS (
  SELECT f.customer_id, SUM(pay.amount) AS revenue_first_3_months
  FROM firsts AS f
  JOIN payments AS pay ON pay.customer_id = f.customer_id AND pay.status = 'paid'
  WHERE CAST(substr(pay.billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(pay.billing_month, 6, 2) AS INTEGER) <= f.first_no + 2
  GROUP BY f.customer_id
),
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f
  WHERE f.first_no <= 2025 * 12 + 3
)
SELECT c.first_offer,
       COUNT(*) AS customers,
       ROUND(100.0 * AVG(fl.m1), 1) AS m1_pct,
       ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct,
       ROUND(AVG(er.revenue_first_3_months), 0) AS avg_revenue_first_3_months
FROM flags AS fl
JOIN customers AS c ON c.customer_id = fl.customer_id
JOIN early_revenue AS er ON er.customer_id = fl.customer_id
GROUP BY c.first_offer
ORDER BY m3_pct DESC;
```

## Expected result

| first_offer | customers | m1_pct | m3_pct | avg_revenue_first_3_months |
| --- | --- | --- | --- | --- |
| none | 93 | 73.1 | 62.4 | 7628 |
| half_off_first_box | 130 | 63.1 | 43.8 | 5093 |
| free_first_box | 62 | 35.5 | 16.1 | 1966 |

## Explanation

The early-revenue CTE totals each customer's first three months; the flags give retention. Both are one row per customer, so they can be joined and averaged by offer without double counting.

**What it tells the business:** **free first boxes buy the least loyal customers**: only 35.5% pay a second month and 16.1% are left at month 3, against 62.4% for customers who paid full price. In their first three months they paid ₹1,966 on average, against ₹7,628. Half-off sits in between (43.8%). The free box brings people in, but mostly people who were never going to subscribe.

**Common mistake:** comparing average revenue per *payment* instead of per *customer*. Customers who leave early have fewer payments, so a per-payment average hides exactly the loss you are trying to measure.

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
SELECT c.first_offer, COUNT(DISTINCT fl.customer_id) AS customers,
       ROUND(100.0 * AVG(fl.m1), 1) AS m1_pct, ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct,
       ROUND(AVG(pay.amount), 0) AS avg_revenue_first_3_months
FROM flags AS fl JOIN customers AS c ON c.customer_id = fl.customer_id
JOIN payments AS pay ON pay.customer_id = fl.customer_id AND pay.status = 'paid'
GROUP BY c.first_offer ORDER BY m3_pct DESC;
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
early_revenue AS (
  SELECT f.customer_id, SUM(pay.amount) AS revenue_first_3_months
  FROM firsts AS f JOIN payments AS pay ON pay.customer_id = f.customer_id
  WHERE CAST(substr(pay.billing_month, 1, 4) AS INTEGER) * 12 + CAST(substr(pay.billing_month, 6, 2) AS INTEGER) <= f.first_no + 2
  GROUP BY f.customer_id
),
flags AS (
  SELECT f.customer_id,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 1) AS m1,
         EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3) AS m3
  FROM firsts AS f WHERE f.first_no <= 2025 * 12 + 3
)
SELECT c.first_offer, COUNT(*) AS customers, ROUND(100.0 * AVG(fl.m1), 1) AS m1_pct, ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct,
       ROUND(AVG(er.revenue_first_3_months), 0) AS avg_revenue_first_3_months
FROM flags AS fl JOIN customers AS c ON c.customer_id = fl.customer_id JOIN early_revenue AS er ON er.customer_id = fl.customer_id
GROUP BY c.first_offer ORDER BY m3_pct DESC;
```
