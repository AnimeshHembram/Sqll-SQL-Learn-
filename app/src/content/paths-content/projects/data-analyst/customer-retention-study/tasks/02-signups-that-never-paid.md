---
id: crs-02-signups-that-never-paid
title: Signups that never became customers
order: 2
difficulty: intermediate
topic: Data quality
summary: Find, per acquisition channel, how many signups never completed a single paid payment.
module: know-the-data
duration: 20
dataset: rasoi-crate
tables:
  - customers
  - payments
orderMatters: true
checkColumnNames: true
objectives:
  - Find rows with no match using NOT EXISTS or an anti-join
  - Separate signups from paying customers
prerequisites:
  - Subqueries
  - LEFT JOIN
  - GROUP BY
---

## Task

A signup is not a customer until money arrives. Some people signed up, saw their first payment fail and never came back, so they appear in `customers` but have no paid payment at all.

For each `channel`, return `signups` (rows in `customers`), `never_paid` (signups with no `'paid'` payment) and `never_paid_pct` (as a percentage of signups, one decimal). Sort by `never_paid_pct`, highest first.

## Starter query

```sql
SELECT channel, COUNT(*) AS signups
FROM customers
GROUP BY channel;
```

## Hints

1. You need customers **without** a matching row. A `LEFT JOIN` to the paid payments, keeping rows where the payment side is NULL, or `NOT EXISTS (...)` both work.
2. With `NOT EXISTS (SELECT 1 FROM payments AS p WHERE p.customer_id = c.customer_id AND p.status = 'paid')`, the condition is 1 or 0 per customer, so `SUM(...)` counts the never-paid signups.
3. Keep the percentage in decimals: `ROUND(100.0 * SUM(...) / COUNT(*), 1)`.

## Solution

```sql
SELECT c.channel,
       COUNT(*) AS signups,
       SUM(NOT EXISTS (SELECT 1 FROM payments AS p WHERE p.customer_id = c.customer_id AND p.status = 'paid')) AS never_paid,
       ROUND(100.0 * SUM(NOT EXISTS (SELECT 1 FROM payments AS p WHERE p.customer_id = c.customer_id AND p.status = 'paid'))
             / COUNT(*), 1) AS never_paid_pct
FROM customers AS c
GROUP BY c.channel
ORDER BY never_paid_pct DESC;
```

## Expected result

| channel | signups | never_paid | never_paid_pct |
| --- | --- | --- | --- |
| influencer | 84 | 11 | 13.1 |
| referral | 58 | 7 | 12.1 |
| google | 70 | 5 | 7.1 |
| instagram | 121 | 7 | 5.8 |
| partner | 50 | 1 | 2 |

## Explanation

`NOT EXISTS` checks each customer for a paid payment without multiplying rows, which a plain join would do for customers with many payments.

**What it tells the business:** 31 of 383 signups (8.1%) never paid. The **influencer channel leaks most (13.1%)**, followed by referrals (12.1%), while partner offers almost never fail (2.0%). From now on the analysis counts **customers from their first paid month**, because a signup who never paid was never really a customer.

**Common mistake:** joining `customers` to `payments` and counting rows with `status = 'failed'`. Many paying customers also have a failed attempt that was retried, so that counts the wrong people.

## Other accepted answers

```sql
SELECT c.channel, COUNT(*) AS signups, SUM(p.customer_id IS NULL) AS never_paid,
       ROUND(100.0 * SUM(p.customer_id IS NULL) / COUNT(*), 1) AS never_paid_pct
FROM customers AS c
LEFT JOIN (SELECT DISTINCT customer_id FROM payments WHERE status = 'paid') AS p ON p.customer_id = c.customer_id
GROUP BY c.channel
ORDER BY never_paid_pct DESC;
```

## Wrong answers

Feedback: incorrect-output

```sql
SELECT c.channel, COUNT(DISTINCT c.customer_id) AS signups, COUNT(DISTINCT p.customer_id) AS never_paid,
       ROUND(100.0 * COUNT(DISTINCT p.customer_id) / COUNT(DISTINCT c.customer_id), 1) AS never_paid_pct
FROM customers AS c
LEFT JOIN payments AS p ON p.customer_id = c.customer_id AND p.status = 'failed'
GROUP BY c.channel
ORDER BY never_paid_pct DESC;
```

Feedback: incorrect-output

```sql
SELECT c.channel, COUNT(*) AS signups, SUM(p.customer_id IS NULL) AS never_paid,
       ROUND(100 * SUM(p.customer_id IS NULL) / COUNT(*), 1) AS never_paid_pct
FROM customers AS c
LEFT JOIN (SELECT DISTINCT customer_id FROM payments WHERE status = 'paid') AS p ON p.customer_id = c.customer_id
GROUP BY c.channel
ORDER BY never_paid_pct DESC;
```
