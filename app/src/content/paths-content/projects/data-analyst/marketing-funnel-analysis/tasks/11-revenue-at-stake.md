---
id: mfa-11-revenue-at-stake
title: What the old mobile checkout cost
order: 11
difficulty: advanced
topic: Business impact
summary: Estimate the extra purchases and revenue the new checkout page would have brought on mobile before the test started.
module: experiment
duration: 30
dataset: vidya-loop
tables:
  - sessions
  - events
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Size the business impact of an experiment
  - Combine single-row results into one calculation
prerequisites:
  - Common table expressions
  - Cross join of single-row results
---

## Task

Leadership wants the result in rupees. Before the test (sessions with `variant` NULL), many mobile visitors reached checkout on the old page. Estimate what the new page would have earned from them. Return one row:

- `mobile_checkouts_before`: mobile sessions that reached checkout before the test,
- `purchases_before`: how many of them bought,
- `variant_b_mobile_pct`: mobile checkout conversion with variant B during the test, one decimal,
- `expected_purchases`: `mobile_checkouts_before` times variant B's mobile conversion, one decimal,
- `extra_purchases`: expected minus actual purchases, one decimal,
- `avg_mobile_order`: the average revenue (`price - discount`) of all mobile orders, rounded to a whole rupee,
- `revenue_at_stake`: extra purchases times the average mobile order, rounded to a whole rupee.

## Starter query

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
)
SELECT device, variant, COUNT(*) AS checkout_sessions, SUM(purchased) AS purchases
FROM checkouts
GROUP BY device, variant
ORDER BY device, variant;
```

## Hints

1. Make three small CTEs that each return a single row: the pre-test mobile checkouts and purchases, variant B's mobile conversion rate, and the average mobile order value.
2. Single-row CTEs can be combined with a plain `FROM before, b_rate, order_value`: with one row each, the result is one row.
3. Keep the rate as a fraction for the calculation and round only the output columns.

## Solution

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
before AS (
  SELECT COUNT(*) AS checkouts, SUM(purchased) AS purchases
  FROM checkouts
  WHERE device = 'mobile' AND variant IS NULL
),
b_rate AS (
  SELECT 1.0 * SUM(purchased) / COUNT(*) AS rate
  FROM checkouts
  WHERE device = 'mobile' AND variant = 'B'
),
order_value AS (
  SELECT AVG(o.price - o.discount) AS avg_order
  FROM orders AS o
  JOIN sessions AS s ON s.session_id = o.session_id
  WHERE s.device = 'mobile'
)
SELECT before.checkouts AS mobile_checkouts_before,
       before.purchases AS purchases_before,
       ROUND(100 * b_rate.rate, 1) AS variant_b_mobile_pct,
       ROUND(before.checkouts * b_rate.rate, 1) AS expected_purchases,
       ROUND(before.checkouts * b_rate.rate - before.purchases, 1) AS extra_purchases,
       ROUND(order_value.avg_order, 0) AS avg_mobile_order,
       ROUND((before.checkouts * b_rate.rate - before.purchases) * order_value.avg_order, 0) AS revenue_at_stake
FROM before, b_rate, order_value;
```

## Expected result

| mobile_checkouts_before | purchases_before | variant_b_mobile_pct | expected_purchases | extra_purchases | avg_mobile_order | revenue_at_stake |
| --- | --- | --- | --- | --- | --- | --- |
| 83 | 26 | 62.5 | 51.9 | 25.9 | 4429 | 114605 |

## Explanation

Each CTE answers one input to the estimate, and combining single-row CTEs is a clean way to build a small calculation in SQL. It is an estimate: it assumes the pre-test visitors would have behaved like the test's mobile visitors.

**What it tells the business:** before the test, 83 mobile visitors reached checkout and only 26 bought. At variant B's mobile rate (62.5%), about **52 would have bought: roughly 26 extra courses, worth about ₹1.15 lakh in six weeks**, around a fifth of the whole quarter's revenue (₹5.82 lakh). That is the cost of every week the old page stays live on mobile.

**Common mistake:** applying B's rate to *all* pre-test sessions, or to desktop checkouts too. Desktop conversion was already high and the test showed no clear gain there, so counting it would overstate the prize.

## Wrong answers

Feedback: incorrect-output

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
before AS (SELECT COUNT(*) AS checkouts, SUM(purchased) AS purchases FROM checkouts WHERE variant IS NULL),
b_rate AS (SELECT 1.0 * SUM(purchased) / COUNT(*) AS rate FROM checkouts WHERE device = 'mobile' AND variant = 'B'),
order_value AS (SELECT AVG(o.price - o.discount) AS avg_order FROM orders AS o JOIN sessions AS s ON s.session_id = o.session_id WHERE s.device = 'mobile')
SELECT before.checkouts AS mobile_checkouts_before, before.purchases AS purchases_before, ROUND(100 * b_rate.rate, 1) AS variant_b_mobile_pct,
       ROUND(before.checkouts * b_rate.rate, 1) AS expected_purchases, ROUND(before.checkouts * b_rate.rate - before.purchases, 1) AS extra_purchases,
       ROUND(order_value.avg_order, 0) AS avg_mobile_order,
       ROUND((before.checkouts * b_rate.rate - before.purchases) * order_value.avg_order, 0) AS revenue_at_stake
FROM before, b_rate, order_value;
```

Feedback: incorrect-output

```sql
WITH checkouts AS (
  SELECT s.session_id, s.device, s.variant, MAX(e.step = 'purchase') AS purchased
  FROM sessions AS s
  JOIN events AS e ON e.session_id = s.session_id
  GROUP BY s.session_id
  HAVING MAX(e.step IN ('checkout', 'purchase')) = 1
),
before AS (SELECT COUNT(*) AS checkouts, SUM(purchased) AS purchases FROM checkouts WHERE device = 'mobile' AND variant IS NULL),
b_rate AS (SELECT 1.0 * SUM(purchased) / COUNT(*) AS rate FROM checkouts WHERE variant = 'B'),
order_value AS (SELECT AVG(o.price - o.discount) AS avg_order FROM orders AS o JOIN sessions AS s ON s.session_id = o.session_id WHERE s.device = 'mobile')
SELECT before.checkouts AS mobile_checkouts_before, before.purchases AS purchases_before, ROUND(100 * b_rate.rate, 1) AS variant_b_mobile_pct,
       ROUND(before.checkouts * b_rate.rate, 1) AS expected_purchases, ROUND(before.checkouts * b_rate.rate - before.purchases, 1) AS extra_purchases,
       ROUND(order_value.avg_order, 0) AS avg_mobile_order,
       ROUND((before.checkouts * b_rate.rate - before.purchases) * order_value.avg_order, 0) AS revenue_at_stake
FROM before, b_rate, order_value;
```
