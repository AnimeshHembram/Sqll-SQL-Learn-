---
id: crs-13-channel-scorecard
title: The acquisition channel scorecard
order: 13
difficulty: advanced
topic: Executive reporting
summary: Bring retention, acquisition cost and revenue together in one row per channel, with a recommendation for next year's budget.
module: final-challenge
duration: 45
dataset: rasoi-crate
tables:
  - customers
  - payments
  - marketing_spend
orderMatters: true
checkColumnNames: true
objectives:
  - Combine retention and unit economics into one decision table
  - Turn metrics into a recommendation with CASE
prerequisites:
  - Every earlier task in this project
---

## Task

The founders are setting next year's marketing budget. Build a scorecard with **one row per channel**, using all the data (signups up to June 2025 and all marketing spend):

- `channel`, `signups` and `paying_customers`,
- `m3_retention_pct`: month-3 retention of the channel's customers whose first paid month is March 2025 or earlier, one decimal,
- `cac`: all spend divided by paying customers, rounded to a whole rupee,
- `revenue_per_customer`: all paid revenue divided by paying customers, rounded to a whole rupee,
- `revenue_to_spend`: all paid revenue divided by all spend, two decimals,
- `verdict`: `'Scale up'` when month-3 retention is at least 50% and revenue is at least three times spend; otherwise `'Keep and improve'` when month-3 retention is at least 35%; otherwise `'Rethink'`.

Sort by `revenue_to_spend`, highest first.

## Starter query

```sql
-- One possible plan, one CTE per measure, each with one row per channel:
--   paid / firsts   paid months with month numbers, and each customer's first month
--   retention       month-3 retention per channel (first month March 2025 or earlier)
--   money           signups, paying customers and paid revenue per channel
--   spend           marketing spend per channel
SELECT channel, SUM(spend) AS spend
FROM marketing_spend
GROUP BY channel;
```

## Hints

1. Build and check one CTE at a time; each must end with one row per channel. The plan in the starter query is one good order.
2. For `money`, `LEFT JOIN` paid payments to `customers` so signups who never paid still count as signups; `COUNT(DISTINCT p.customer_id)` counts only payers and `COALESCE(SUM(p.amount), 0)` the revenue.
3. Join the finished CTEs on `channel`. In the verdict, test the conditions in order: the first `WHEN` that is true wins.

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
retention AS (
  SELECT c.channel,
         ROUND(100.0 * AVG(EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3)), 1) AS m3_retention_pct
  FROM firsts AS f
  JOIN customers AS c ON c.customer_id = f.customer_id
  WHERE f.first_no <= 2025 * 12 + 3
  GROUP BY c.channel
),
money AS (
  SELECT c.channel,
         COUNT(DISTINCT c.customer_id) AS signups,
         COUNT(DISTINCT p.customer_id) AS paying_customers,
         COALESCE(SUM(p.amount), 0) AS revenue
  FROM customers AS c
  LEFT JOIN payments AS p ON p.customer_id = c.customer_id AND p.status = 'paid'
  GROUP BY c.channel
),
spend AS (
  SELECT channel, SUM(spend) AS spend
  FROM marketing_spend
  GROUP BY channel
)
SELECT m.channel,
       m.signups,
       m.paying_customers,
       r.m3_retention_pct,
       ROUND(1.0 * s.spend / m.paying_customers, 0) AS cac,
       ROUND(1.0 * m.revenue / m.paying_customers, 0) AS revenue_per_customer,
       ROUND(1.0 * m.revenue / s.spend, 2) AS revenue_to_spend,
       CASE
         WHEN r.m3_retention_pct >= 50 AND m.revenue >= 3 * s.spend THEN 'Scale up'
         WHEN r.m3_retention_pct >= 35 THEN 'Keep and improve'
         ELSE 'Rethink'
       END AS verdict
FROM money AS m
JOIN retention AS r ON r.channel = m.channel
JOIN spend AS s ON s.channel = m.channel
ORDER BY revenue_to_spend DESC;
```

## Expected result

| channel | signups | paying_customers | m3_retention_pct | cac | revenue_per_customer | revenue_to_spend | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| referral | 58 | 51 | 73.9 | 667 | 25041 | 37.56 | Scale up |
| partner | 50 | 49 | 41 | 1510 | 12465 | 8.25 | Keep and improve |
| instagram | 121 | 114 | 42.9 | 1996 | 10638 | 5.33 | Keep and improve |
| google | 70 | 65 | 51.9 | 2492 | 13052 | 5.24 | Scale up |
| influencer | 84 | 73 | 17.7 | 4767 | 6187 | 1.3 | Rethink |

## Explanation

Every measure is computed at its own grain and reduced to one row per channel before the final join, so no number is multiplied by another table's rows. The verdict turns three numbers into a decision the founders can act on.

**What it tells the business:**

- **Referral** is the best channel by far: 73.9% month-3 retention, ₹667 to acquire a paying customer and 37.56 times its cost back so far. **Scale up.**
- **Google search** retains 51.9% and returns 5.24 times its spend. **Scale up.**
- **Partner offers** (8.25×) and **Instagram** (5.33×) pay back well but keep only 41.0% and 42.9% at month 3. **Keep and improve** their onboarding.
- **Influencers** keep 17.7%, cost ₹4,767 per paying customer and return only 1.3 times their spend. **Rethink**: that barely pays for itself before the food is bought.

**Common mistake:** a single query joining `customers`, `payments` and `marketing_spend` together. Each spend row repeats for every payment and each payment for every spend month, so spend and revenue are both inflated many times over.

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
retention AS (
  SELECT c.channel,
         ROUND(100.0 * AVG(EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3)), 1) AS m3_retention_pct
  FROM firsts AS f JOIN customers AS c ON c.customer_id = f.customer_id
  GROUP BY c.channel
),
money AS (
  SELECT c.channel, COUNT(DISTINCT c.customer_id) AS signups, COUNT(DISTINCT p.customer_id) AS paying_customers, COALESCE(SUM(p.amount), 0) AS revenue
  FROM customers AS c LEFT JOIN payments AS p ON p.customer_id = c.customer_id AND p.status = 'paid'
  GROUP BY c.channel
),
spend AS (SELECT channel, SUM(spend) AS spend FROM marketing_spend GROUP BY channel)
SELECT m.channel, m.signups, m.paying_customers, r.m3_retention_pct,
       ROUND(1.0 * s.spend / m.paying_customers, 0) AS cac, ROUND(1.0 * m.revenue / m.paying_customers, 0) AS revenue_per_customer,
       ROUND(1.0 * m.revenue / s.spend, 2) AS revenue_to_spend,
       CASE WHEN r.m3_retention_pct >= 50 AND m.revenue >= 3 * s.spend THEN 'Scale up' WHEN r.m3_retention_pct >= 35 THEN 'Keep and improve' ELSE 'Rethink' END AS verdict
FROM money AS m JOIN retention AS r ON r.channel = m.channel JOIN spend AS s ON s.channel = m.channel
ORDER BY revenue_to_spend DESC;
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
retention AS (
  SELECT c.channel,
         ROUND(100.0 * AVG(EXISTS (SELECT 1 FROM paid AS p WHERE p.customer_id = f.customer_id AND p.month_no = f.first_no + 3)), 1) AS m3_retention_pct
  FROM firsts AS f JOIN customers AS c ON c.customer_id = f.customer_id
  WHERE f.first_no <= 2025 * 12 + 3 GROUP BY c.channel
),
money AS (
  SELECT c.channel, COUNT(DISTINCT c.customer_id) AS signups, COUNT(DISTINCT p.customer_id) AS paying_customers,
         COALESCE(SUM(p.amount), 0) AS revenue, SUM(m.spend) AS spend
  FROM customers AS c
  LEFT JOIN payments AS p ON p.customer_id = c.customer_id AND p.status = 'paid'
  JOIN marketing_spend AS m ON m.channel = c.channel
  GROUP BY c.channel
)
SELECT m.channel, m.signups, m.paying_customers, r.m3_retention_pct,
       ROUND(1.0 * m.spend / m.paying_customers, 0) AS cac, ROUND(1.0 * m.revenue / m.paying_customers, 0) AS revenue_per_customer,
       ROUND(1.0 * m.revenue / m.spend, 2) AS revenue_to_spend,
       CASE WHEN r.m3_retention_pct >= 50 AND m.revenue >= 3 * m.spend THEN 'Scale up' WHEN r.m3_retention_pct >= 35 THEN 'Keep and improve' ELSE 'Rethink' END AS verdict
FROM money AS m JOIN retention AS r ON r.channel = m.channel
ORDER BY revenue_to_spend DESC;
```
