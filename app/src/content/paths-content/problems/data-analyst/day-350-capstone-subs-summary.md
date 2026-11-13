---
id: da-day-350
title: Capstone (subscriptions) 5: the board summary
order: 350
difficulty: advanced
topic: Capstone
summary: Combine the week's analysis into one row of headline numbers for the board.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Combine metrics into one summary row
  - Reuse a base calculation
prerequisites:
  - Day 89
  - Day 150
---

## Task

Same company, last day of the capstone. Produce **one row** for the board, as of **31 March 2025**:

- `total_signups`, `active_accounts` and `mrr` (active accounts' monthly prices),
- `arr` (MRR × 12) and `arpa` (MRR ÷ active accounts, rounded to 2 decimal places),
- `q1_new_mrr` (monthly prices of accounts signed up in January to March 2025) and `q1_churned_mrr` (monthly prices of accounts cancelled in January to March 2025),
- `team_share_pct`: the share of MRR from team plans (rounded to 1 decimal place).

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
SELECT account, plan, signed_up, cancelled, monthly_price
FROM accounts
ORDER BY signed_up;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Everything comes from one `SELECT` over `accounts` with conditional sums: active means `cancelled IS NULL OR cancelled > '2025-03-31'`.
3. Q1 windows use `BETWEEN '2025-01-01' AND '2025-03-31'` on `signed_up` and on `cancelled`. Compute MRR once in a CTE to reuse it for ARR, ARPA and the team share.

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
base AS (
  SELECT COUNT(*) AS total_signups,
    SUM(cancelled IS NULL OR cancelled > '2025-03-31') AS active_accounts,
    SUM(CASE WHEN cancelled IS NULL OR cancelled > '2025-03-31' THEN monthly_price ELSE 0 END) AS mrr,
    SUM(CASE WHEN signed_up BETWEEN '2025-01-01' AND '2025-03-31' THEN monthly_price ELSE 0 END) AS q1_new_mrr,
    SUM(CASE WHEN cancelled BETWEEN '2025-01-01' AND '2025-03-31' THEN monthly_price ELSE 0 END) AS q1_churned_mrr,
    SUM(CASE WHEN (cancelled IS NULL OR cancelled > '2025-03-31') AND plan = 'team' THEN monthly_price ELSE 0 END) AS team_mrr
  FROM accounts
)
SELECT total_signups, active_accounts, mrr, mrr * 12 AS arr, ROUND(1.0 * mrr / active_accounts, 2) AS arpa,
  q1_new_mrr, q1_churned_mrr, ROUND(100.0 * team_mrr / mrr, 1) AS team_share_pct
FROM base;
```

## Expected result

| total_signups | active_accounts | mrr | arr | arpa | q1_new_mrr | q1_churned_mrr | team_share_pct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 18 | 11 | 13489 | 161868 | 1226.27 | 9991 | 3994 | 55.6 |

## Explanation

The board summary combines the week's work into one row: 18 sign-ups, 12 active accounts, 13,988 of monthly recurring revenue (167,856 a year), and an average of 1,165.67 per account. In the first quarter, 9,991 of new MRR came in and 3,495 churned out.

The most important number may be the last: the three team accounts provide more than half of all MRR (53.6%). Losing one would cost more than all of the first quarter's basic-plan churn, so account management for team customers is a board-level topic. Computing everything from one CTE keeps the figures consistent with each other.

**Common mistake:** counting every account as active. Cancelled accounts inflate MRR to 17,982 and ARPA falls, because all 18 sign-ups are counted, a summary that contradicts the churn reported a day earlier.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, plan, signed_up, cancelled, monthly_price, channel) AS ( VALUES ('A01', 'basic', '2024-10-03', NULL, 499, 'search'), ('A02', 'pro', '2024-10-10', '2025-01-12', 999, 'social'), ('A03', 'basic', '2024-10-21', '2024-12-05', 499, 'social'), ('A04', 'pro', '2024-11-02', NULL, 999, 'search'), ('A05', 'basic', '2024-11-14', NULL, 499, 'referral'), ('A06', 'team', '2024-11-20', NULL, 2499, 'search'), ('A07', 'basic', '2024-12-01', '2025-02-20', 499, 'social'), ('A08', 'pro', '2024-12-09', NULL, 999, 'referral'), ('A09', 'basic', '2024-12-18', '2025-01-02', 499, 'search'), ('A10', 'team', '2025-01-06', NULL, 2499, 'search'), ('A11', 'basic', '2025-01-15', NULL, 499, 'social'), ('A12', 'pro', '2025-01-27', '2025-03-10', 999, 'social'), ('A13', 'basic', '2025-02-03', NULL, 499, 'referral'), ('A14', 'pro', '2025-02-14', NULL, 999, 'search'), ('A15', 'basic', '2025-02-25', '2025-03-20', 499, 'social'), ('A16', 'team', '2025-03-04', NULL, 2499, 'referral'), ('A17', 'basic', '2025-03-11', '2025-03-25', 499, 'search'), ('A18', 'pro', '2025-03-22', NULL, 999, 'social') ), base AS (SELECT COUNT(*) AS total_signups, COUNT(*) AS active_accounts, SUM(monthly_price) AS mrr, SUM(CASE WHEN signed_up BETWEEN '2025-01-01' AND '2025-03-31' THEN monthly_price ELSE 0 END) AS q1_new_mrr, SUM(CASE WHEN cancelled BETWEEN '2025-01-01' AND '2025-03-31' THEN monthly_price ELSE 0 END) AS q1_churned_mrr, SUM(CASE WHEN plan = 'team' THEN monthly_price ELSE 0 END) AS team_mrr FROM accounts) SELECT total_signups, active_accounts, mrr, mrr * 12 AS arr, ROUND(1.0 * mrr / active_accounts, 2) AS arpa, q1_new_mrr, q1_churned_mrr, ROUND(100.0 * team_mrr / mrr, 1) AS team_share_pct FROM base;
```
