---
id: crs-06-retention-by-channel
title: Retention by acquisition channel
order: 6
difficulty: intermediate
topic: Segmentation
summary: Compare month-1 and month-3 retention across the five channels customers came from.
module: who-stays
duration: 25
dataset: rasoi-crate
tables:
  - payments
  - customers
orderMatters: true
checkColumnNames: true
objectives:
  - Compare retention across segments
  - Average a 0/1 flag to get a rate
prerequisites:
  - EXISTS
  - AVG
  - Joins
---

## Task

Marketing spends on five channels: referrals, Instagram ads, Google search, influencers and partner offers. Do the customers they bring **stay**?

Use every customer whose first paid month is **March 2025 or earlier** (so month 3 is observable). For each `channel`, return `customers`, `m1_pct` and `m3_pct` (the share who paid 1 and 3 months after their first payment, one decimal). Sort by `m3_pct`, highest first.

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
SELECT c.channel, COUNT(*) AS customers
FROM firsts AS f
JOIN customers AS c ON c.customer_id = f.customer_id
GROUP BY c.channel;
```

## Hints

1. Reuse the flags from Task 5: one row per customer with `m1` and `m3` as 0 or 1, for customers with `first_no <= 2025 * 12 + 3`.
2. Join the flags to `customers` to get the channel and group by it.
3. The average of a 0/1 flag is the share of 1s: `ROUND(100.0 * AVG(m3), 1)`.

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
SELECT c.channel,
       COUNT(*) AS customers,
       ROUND(100.0 * AVG(fl.m1), 1) AS m1_pct,
       ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct
FROM flags AS fl
JOIN customers AS c ON c.customer_id = fl.customer_id
GROUP BY c.channel
ORDER BY m3_pct DESC;
```

## Expected result

| channel | customers | m1_pct | m3_pct |
| --- | --- | --- | --- |
| referral | 46 | 82.6 | 73.9 |
| google | 54 | 57.4 | 51.9 |
| instagram | 84 | 67.9 | 42.9 |
| partner | 39 | 53.8 | 41 |
| influencer | 62 | 40.3 | 17.7 |

## Explanation

Averaging 0/1 flags is the simplest way to turn "did they stay?" into a rate per segment. The cut-off at March 2025 makes every customer in the table measurable at month 3.

**What it tells the business:** the gap is huge. **Referred customers keep 73.9% at month 3; influencer customers keep 17.7%.** Google search is second (51.9%), then Instagram (42.9%) and partners (41.0%). A referred customer is four times as likely to still be paying after three months as one from an influencer.

**Common mistake:** including cohorts from April to June 2025. Their month 3 has not happened, so they count as "not retained" and pull every channel down, most of all the ones that grew recently.

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
)
SELECT c.channel, COUNT(*) AS customers, ROUND(100.0 * AVG(fl.m1), 1) AS m1_pct, ROUND(100.0 * AVG(fl.m3), 1) AS m3_pct
FROM flags AS fl JOIN customers AS c ON c.customer_id = fl.customer_id
GROUP BY c.channel ORDER BY m3_pct DESC;
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
SELECT c.channel, COUNT(*) AS customers, ROUND(AVG(fl.m1), 1) AS m1_pct, ROUND(AVG(fl.m3), 1) AS m3_pct
FROM flags AS fl JOIN customers AS c ON c.customer_id = fl.customer_id
GROUP BY c.channel ORDER BY m3_pct DESC;
```
