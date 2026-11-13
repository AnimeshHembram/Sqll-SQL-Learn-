---
id: da-day-349
title: Capstone (subscriptions) 4: which channels bring lasting customers?
order: 349
difficulty: advanced
topic: Capstone
summary: Compare sign-ups, early cancellations and current MRR by acquisition channel.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare acquisition channels on lasting value
  - Measure lifetimes that are still open
prerequisites:
  - Day 148
  - Day 301
---

## Task

Same company. On **31 March 2025**, compare acquisition channels: for each channel, return `channel`, `signups`, `cancelled` (accounts cancelled by 31 March), `cancelled_90d` (cancelled within 90 days of signing up), `retention_pct` (still active ÷ sign-ups × 100, rounded to 1 decimal place), `active_mrr` (monthly price of still-active accounts) and `avg_active_days` (average days from sign-up to cancellation, or to 31 March if still active, rounded to 1 decimal place). Sort by `active_mrr` from highest.

## Starter query

```sql
WITH accounts(account, plan, signed_up, cancelled, monthly_price, channel) AS (
  VALUES
    ('A01', 'basic', '2024-10-03', NULL, 499, 'search'), ('A02', 'pro', '2024-10-10', '2025-01-12', 999, 'social'),
    ('A03', 'basic', '2024-10-21', '2024-12-05', 499, 'social'), ('A04', 'pro', '2024-11-02', NULL, 999, 'search'),
    ('A05', 'basic', '2024-11-14', NULL, 499, 'referral'), ('A06', 'team', '2024-11-20', NULL, 2499, 'search'),
    ('A07', 'basic', '2024-12-01', '2025-02-20', 499, 'social'), ('A08', 'pro', '2024-12-09', NULL, 999, 'referral'),
    ('A09', 'basic', '2024-12-18', '2025-01-02', 499, 'search'), ('A10', 'team', '2025-01-06', NULL, 2499, 'search'),
    ('A11', 'basic', '2025-01-15', NULL, 499, 'social'), ('A12', 'pro', '2025-01-27', '2025-03-10', 999, 'social'),
    ('A13', 'basic', '2025-02-03', NULL, 499, 'referral'), ('A14', 'pro', '2025-02-14', NULL, 999, 'search'),
    ('A15', 'basic', '2025-02-25', '2025-03-20', 499, 'social'), ('A16', 'team', '2025-03-04', NULL, 2499, 'referral'),
    ('A17', 'basic', '2025-03-11', '2025-03-25', 499, 'search'), ('A18', 'pro', '2025-03-22', NULL, 999, 'social')
)
SELECT account, channel, plan, signed_up, cancelled, monthly_price
FROM accounts
ORDER BY channel, signed_up;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Days active: `julianday(COALESCE(cancelled, '2025-03-31')) - julianday(signed_up)`; cancelled within 90 days: `cancelled IS NOT NULL AND days <= 90`.
3. Group by channel with conditional sums; `SUM(CASE WHEN cancelled IS NULL THEN monthly_price ELSE 0 END)` is the active MRR.

## Solution

```sql
WITH accounts(account, plan, signed_up, cancelled, monthly_price, channel) AS (
  VALUES
    ('A01', 'basic', '2024-10-03', NULL, 499, 'search'), ('A02', 'pro', '2024-10-10', '2025-01-12', 999, 'social'),
    ('A03', 'basic', '2024-10-21', '2024-12-05', 499, 'social'), ('A04', 'pro', '2024-11-02', NULL, 999, 'search'),
    ('A05', 'basic', '2024-11-14', NULL, 499, 'referral'), ('A06', 'team', '2024-11-20', NULL, 2499, 'search'),
    ('A07', 'basic', '2024-12-01', '2025-02-20', 499, 'social'), ('A08', 'pro', '2024-12-09', NULL, 999, 'referral'),
    ('A09', 'basic', '2024-12-18', '2025-01-02', 499, 'search'), ('A10', 'team', '2025-01-06', NULL, 2499, 'search'),
    ('A11', 'basic', '2025-01-15', NULL, 499, 'social'), ('A12', 'pro', '2025-01-27', '2025-03-10', 999, 'social'),
    ('A13', 'basic', '2025-02-03', NULL, 499, 'referral'), ('A14', 'pro', '2025-02-14', NULL, 999, 'search'),
    ('A15', 'basic', '2025-02-25', '2025-03-20', 499, 'social'), ('A16', 'team', '2025-03-04', NULL, 2499, 'referral'),
    ('A17', 'basic', '2025-03-11', '2025-03-25', 499, 'search'), ('A18', 'pro', '2025-03-22', NULL, 999, 'social')
),
lifetimes AS (
  SELECT channel, monthly_price, cancelled, julianday(COALESCE(cancelled, '2025-03-31')) - julianday(signed_up) AS days FROM accounts
)
SELECT channel, COUNT(*) AS signups, SUM(cancelled IS NOT NULL) AS cancelled,
  SUM(cancelled IS NOT NULL AND days <= 90) AS cancelled_90d,
  ROUND(100.0 * SUM(cancelled IS NULL) / COUNT(*), 1) AS retention_pct,
  SUM(CASE WHEN cancelled IS NULL THEN monthly_price ELSE 0 END) AS active_mrr,
  ROUND(AVG(days), 1) AS avg_active_days
FROM lifetimes
GROUP BY channel
ORDER BY active_mrr DESC;
```

## Expected result

| channel | signups | cancelled | cancelled_90d | retention_pct | active_mrr | avg_active_days |
| --- | --- | --- | --- | --- | --- | --- |
| search | 7 | 2 | 2 | 71.4 | 7495 | 88.1 |
| referral | 4 | 0 | 0 | 100 | 4496 | 83 |
| social | 7 | 5 | 4 | 28.6 | 1498 | 52.7 |

## Explanation

Acquisition channels differ in the customers they bring, not just in how many. Social brought as many sign-ups as search (7 each), but five of the seven social customers have already cancelled, four of them within 90 days; search lost one. Referral customers all stayed. By current MRR, search leads with 7,994 and social trails with 1,498.

Average active days needs care for customers who have not left: using 31 March as their end date measures how long they have been customers **so far**. Without that, active customers would have no duration and drop out of the average, leaving only those who churned.

**Common mistake:** measuring lifetime only from cancellation dates. Active customers get a `NULL` duration and are ignored, so the channels with the most loyal customers look like they keep them for the shortest time.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, plan, signed_up, cancelled, monthly_price, channel) AS ( VALUES ('A01', 'basic', '2024-10-03', NULL, 499, 'search'), ('A02', 'pro', '2024-10-10', '2025-01-12', 999, 'social'), ('A03', 'basic', '2024-10-21', '2024-12-05', 499, 'social'), ('A04', 'pro', '2024-11-02', NULL, 999, 'search'), ('A05', 'basic', '2024-11-14', NULL, 499, 'referral'), ('A06', 'team', '2024-11-20', NULL, 2499, 'search'), ('A07', 'basic', '2024-12-01', '2025-02-20', 499, 'social'), ('A08', 'pro', '2024-12-09', NULL, 999, 'referral'), ('A09', 'basic', '2024-12-18', '2025-01-02', 499, 'search'), ('A10', 'team', '2025-01-06', NULL, 2499, 'search'), ('A11', 'basic', '2025-01-15', NULL, 499, 'social'), ('A12', 'pro', '2025-01-27', '2025-03-10', 999, 'social'), ('A13', 'basic', '2025-02-03', NULL, 499, 'referral'), ('A14', 'pro', '2025-02-14', NULL, 999, 'search'), ('A15', 'basic', '2025-02-25', '2025-03-20', 499, 'social'), ('A16', 'team', '2025-03-04', NULL, 2499, 'referral'), ('A17', 'basic', '2025-03-11', '2025-03-25', 499, 'search'), ('A18', 'pro', '2025-03-22', NULL, 999, 'social') ), lifetimes AS (SELECT channel, monthly_price, cancelled, julianday(cancelled) - julianday(signed_up) AS days FROM accounts) SELECT channel, COUNT(*) AS signups, SUM(cancelled IS NOT NULL) AS cancelled, SUM(cancelled IS NOT NULL AND days <= 90) AS cancelled_90d, ROUND(100.0 * SUM(cancelled IS NULL) / COUNT(*), 1) AS retention_pct, SUM(CASE WHEN cancelled IS NULL THEN monthly_price ELSE 0 END) AS active_mrr, ROUND(AVG(days), 1) AS avg_active_days FROM lifetimes GROUP BY channel ORDER BY active_mrr DESC;
```
