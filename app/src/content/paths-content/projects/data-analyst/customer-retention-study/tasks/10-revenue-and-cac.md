---
id: crs-10-revenue-and-cac
title: What a customer is worth, by channel
order: 10
difficulty: advanced
topic: Unit economics
summary: For 2024 signups, compare each channel's acquisition cost per paying customer with the revenue those customers have paid so far.
module: revenue-and-churn
duration: 30
dataset: rasoi-crate
tables:
  - customers
  - payments
  - marketing_spend
orderMatters: true
checkColumnNames: true
objectives:
  - Calculate customer acquisition cost
  - Compare revenue with acquisition spend per channel
prerequisites:
  - Common table expressions
  - Joins on aggregated results
  - COUNT(DISTINCT)
---

## Task

Retention is only half the story: some channels are also much more expensive. For customers who **signed up in 2024** (so everyone has had at least six months to pay), return per `channel`:

- `signups` and `paying_customers` (signups with at least one paid payment),
- `spend`: the channel's 2024 marketing spend,
- `cac`: customer acquisition cost, spend divided by paying customers, rounded to a whole rupee,
- `revenue_per_customer`: everything those paying customers have paid up to June 2025, divided by paying customers, rounded to a whole rupee,
- `revenue_to_spend`: total revenue from them divided by spend, rounded to two decimals.

Sort by `revenue_to_spend`, highest first.

## Starter query

```sql
SELECT channel, SUM(spend) AS spend
FROM marketing_spend
WHERE month < '2025-01'
GROUP BY channel;
```

## Hints

1. Build three CTEs, each with one row per channel: signups (from `customers`), paying customers and their revenue (from `customers` joined to paid `payments`), and spend (from `marketing_spend`).
2. Count paying customers with `COUNT(DISTINCT p.customer_id)` in the revenue CTE: a customer has one row per paid month.
3. Join the three CTEs on `channel` and do the divisions with `1.0 *` in front. Aggregating each source separately first keeps the join from multiplying rows.

## Solution

```sql
WITH signups AS (
  SELECT channel, COUNT(*) AS signups
  FROM customers
  WHERE signup_date < '2025-01-01'
  GROUP BY channel
),
revenue AS (
  SELECT c.channel, COUNT(DISTINCT p.customer_id) AS paying_customers, SUM(p.amount) AS revenue
  FROM customers AS c
  JOIN payments AS p ON p.customer_id = c.customer_id AND p.status = 'paid'
  WHERE c.signup_date < '2025-01-01'
  GROUP BY c.channel
),
spend AS (
  SELECT channel, SUM(spend) AS spend
  FROM marketing_spend
  WHERE month < '2025-01'
  GROUP BY channel
)
SELECT s.channel,
       s.signups,
       r.paying_customers,
       sp.spend,
       ROUND(1.0 * sp.spend / r.paying_customers, 0) AS cac,
       ROUND(1.0 * r.revenue / r.paying_customers, 0) AS revenue_per_customer,
       ROUND(1.0 * r.revenue / sp.spend, 2) AS revenue_to_spend
FROM signups AS s
JOIN revenue AS r ON r.channel = s.channel
JOIN spend AS sp ON sp.channel = s.channel
ORDER BY revenue_to_spend DESC;
```

## Expected result

| channel | signups | paying_customers | spend | cac | revenue_per_customer | revenue_to_spend |
| --- | --- | --- | --- | --- | --- | --- |
| referral | 40 | 36 | 23500 | 653 | 31068 | 47.59 |
| partner | 29 | 29 | 44000 | 1517 | 16375 | 10.79 |
| instagram | 69 | 65 | 133000 | 2046 | 14645 | 7.16 |
| google | 49 | 46 | 112500 | 2446 | 16029 | 6.55 |
| influencer | 60 | 53 | 266500 | 5028 | 7634 | 1.52 |

## Explanation

Each source is aggregated to one row per channel before joining, the same rule as the final challenge in Project 1. `revenue_per_customer` is revenue *to date*, not a forecast lifetime value, so it is a conservative measure.

**What it tells the business:** **a referred customer costs ₹653 and has paid ₹31,068 so far**, almost 48 times its cost. An **influencer customer costs ₹5,028 and has paid ₹7,634**: only 1.52 times what it cost to acquire, before paying for the food. Partners (10.79×), Instagram (7.16×) and Google search (6.55×) are all healthy. Moving budget from influencers to referrals and search is the clearest win in the data.

**Common mistake:** dividing spend by **signups** instead of paying customers. Signups who never paid (Task 2) make every channel look cheaper than it is, most of all the leakiest ones.

## Wrong answers

Feedback: incorrect-output

```sql
WITH signups AS (SELECT channel, COUNT(*) AS signups FROM customers WHERE signup_date < '2025-01-01' GROUP BY channel),
revenue AS (
  SELECT c.channel, COUNT(DISTINCT p.customer_id) AS paying_customers, SUM(p.amount) AS revenue
  FROM customers AS c JOIN payments AS p ON p.customer_id = c.customer_id AND p.status = 'paid'
  WHERE c.signup_date < '2025-01-01' GROUP BY c.channel
),
spend AS (SELECT channel, SUM(spend) AS spend FROM marketing_spend WHERE month < '2025-01' GROUP BY channel)
SELECT s.channel, s.signups, r.paying_customers, sp.spend,
       ROUND(1.0 * sp.spend / s.signups, 0) AS cac,
       ROUND(1.0 * r.revenue / r.paying_customers, 0) AS revenue_per_customer,
       ROUND(1.0 * r.revenue / sp.spend, 2) AS revenue_to_spend
FROM signups AS s JOIN revenue AS r ON r.channel = s.channel JOIN spend AS sp ON sp.channel = s.channel
ORDER BY revenue_to_spend DESC;
```

Feedback: incorrect-output

```sql
SELECT c.channel, COUNT(DISTINCT c.customer_id) AS signups, COUNT(DISTINCT p.customer_id) AS paying_customers, SUM(m.spend) AS spend,
       ROUND(1.0 * SUM(m.spend) / COUNT(DISTINCT p.customer_id), 0) AS cac,
       ROUND(1.0 * SUM(p.amount) / COUNT(DISTINCT p.customer_id), 0) AS revenue_per_customer,
       ROUND(1.0 * SUM(p.amount) / SUM(m.spend), 2) AS revenue_to_spend
FROM customers AS c
JOIN payments AS p ON p.customer_id = c.customer_id AND p.status = 'paid'
JOIN marketing_spend AS m ON m.channel = c.channel AND m.month < '2025-01'
WHERE c.signup_date < '2025-01-01'
GROUP BY c.channel ORDER BY revenue_to_spend DESC;
```
