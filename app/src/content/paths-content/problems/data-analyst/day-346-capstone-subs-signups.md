---
id: da-day-346
title: Capstone (subscriptions) 1: sign-ups and mix by month
order: 346
difficulty: intermediate
topic: Capstone
summary: Start the subscription capstone with monthly sign-ups, plan mix and the share of team plans.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Summarise sign-ups by period
  - Pivot a category into columns
prerequisites:
  - Day 59
  - Day 116
---

## Task

The next five days follow one subscription software company (the same data each day, starter query). Start with **sign-ups**: for each sign-up month, return `month`, `signups`, `basic`, `pro` and `team` (sign-ups per plan) and `new_mrr` (the monthly price of all accounts signed up that month). Sort by `month`.

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
SELECT account, plan, signed_up, cancelled, monthly_price, channel
FROM accounts
ORDER BY signed_up;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Group by `strftime('%Y-%m', signed_up)`.
3. Count plans with conditional sums (`SUM(plan = 'basic')`) and add the prices with `SUM(monthly_price)`.

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
)
SELECT strftime('%Y-%m', signed_up) AS month, COUNT(*) AS signups,
  SUM(plan = 'basic') AS basic, SUM(plan = 'pro') AS pro, SUM(plan = 'team') AS team, SUM(monthly_price) AS new_mrr
FROM accounts
GROUP BY strftime('%Y-%m', signed_up)
ORDER BY month;
```

## Expected result

| month | signups | basic | pro | team | new_mrr |
| --- | --- | --- | --- | --- | --- |
| 2024-10 | 3 | 2 | 1 | 0 | 1997 |
| 2024-11 | 3 | 1 | 1 | 1 | 3997 |
| 2024-12 | 3 | 2 | 1 | 0 | 1997 |
| 2025-01 | 3 | 1 | 1 | 1 | 3997 |
| 2025-02 | 3 | 2 | 1 | 0 | 1997 |
| 2025-03 | 3 | 1 | 1 | 1 | 3997 |

## Explanation

The capstones apply the year's techniques to one business over five days. Day one is the shape of acquisition: three sign-ups a month, with the plan mix alternating. Months with a team sign-up add 3,997 of new monthly recurring revenue, twice the months without one, which already hints that the few team accounts matter a lot.

Conditional sums pivot the plans into columns in the same pass as the totals. `new_mrr` sums each account's actual price rather than multiplying sign-ups by a typical price, which would hide the plan mix.

**Common mistake:** estimating new MRR as sign-ups × the basic price. Every month then looks the same (1,497), and the impact of team plans disappears.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, plan, signed_up, cancelled, monthly_price, channel) AS ( VALUES ('A01', 'basic', '2024-10-03', NULL, 499, 'search'), ('A02', 'pro', '2024-10-10', '2025-01-12', 999, 'social'), ('A03', 'basic', '2024-10-21', '2024-12-05', 499, 'social'), ('A04', 'pro', '2024-11-02', NULL, 999, 'search'), ('A05', 'basic', '2024-11-14', NULL, 499, 'referral'), ('A06', 'team', '2024-11-20', NULL, 2499, 'search'), ('A07', 'basic', '2024-12-01', '2025-02-20', 499, 'social'), ('A08', 'pro', '2024-12-09', NULL, 999, 'referral'), ('A09', 'basic', '2024-12-18', '2025-01-02', 499, 'search'), ('A10', 'team', '2025-01-06', NULL, 2499, 'search'), ('A11', 'basic', '2025-01-15', NULL, 499, 'social'), ('A12', 'pro', '2025-01-27', '2025-03-10', 999, 'social'), ('A13', 'basic', '2025-02-03', NULL, 499, 'referral'), ('A14', 'pro', '2025-02-14', NULL, 999, 'search'), ('A15', 'basic', '2025-02-25', '2025-03-20', 499, 'social'), ('A16', 'team', '2025-03-04', NULL, 2499, 'referral'), ('A17', 'basic', '2025-03-11', '2025-03-25', 499, 'search'), ('A18', 'pro', '2025-03-22', NULL, 999, 'social') ) SELECT strftime('%Y-%m', signed_up) AS month, COUNT(*) AS signups, SUM(plan = 'basic') AS basic, SUM(plan = 'pro') AS pro, SUM(plan = 'team') AS team, COUNT(*) * 499 AS new_mrr FROM accounts GROUP BY 1 ORDER BY 1;
```
