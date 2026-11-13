---
id: da-day-347
title: Capstone (subscriptions) 2: MRR and active accounts at each month end
order: 347
difficulty: advanced
topic: Capstone
summary: Count accounts active at each month end and their recurring revenue, from sign-up and cancellation dates.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build month-end snapshots from date ranges
  - Track a recurring revenue base
prerequisites:
  - Day 116
  - Day 232
---

## Task

Same company. An account is **active at a month end** if it signed up on or before that day and had not cancelled by then (no cancellation, or a cancellation after the month end). For each month end from October 2024 to March 2025, return `month_end`, `active_accounts`, `mrr` (sum of their monthly prices) and `mrr_change` (against the previous month end; `NULL` for the first). Sort by `month_end`.

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

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Add the six month ends as `VALUES`.
2. `LEFT JOIN accounts AS a ON a.signed_up <= m.month_end AND (a.cancelled IS NULL OR a.cancelled > m.month_end)`, then count and sum per month end.
3. `mrr - LAG(mrr) OVER (ORDER BY month_end)` gives the change.

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
month_ends(month_end) AS (
  VALUES ('2024-10-31'), ('2024-11-30'), ('2024-12-31'), ('2025-01-31'), ('2025-02-28'), ('2025-03-31')
),
snapshots AS (
  SELECT m.month_end, COUNT(a.account) AS active_accounts, COALESCE(SUM(a.monthly_price), 0) AS mrr
  FROM month_ends AS m
  LEFT JOIN accounts AS a ON a.signed_up <= m.month_end AND (a.cancelled IS NULL OR a.cancelled > m.month_end)
  GROUP BY m.month_end
)
SELECT month_end, active_accounts, mrr, mrr - LAG(mrr) OVER (ORDER BY month_end) AS mrr_change
FROM snapshots
ORDER BY month_end;
```

## Expected result

| month_end | active_accounts | mrr | mrr_change |
| --- | --- | --- | --- |
| 2024-10-31 | 3 | 1997 | NULL |
| 2024-11-30 | 6 | 5994 | 3997 |
| 2024-12-31 | 8 | 7492 | 1498 |
| 2025-01-31 | 9 | 9991 | 2499 |
| 2025-02-28 | 11 | 11489 | 1498 |
| 2025-03-31 | 11 | 13489 | 2000 |

## Explanation

Month-end snapshots answer "how many customers did we have at the end of each month?" from start and end dates. Joining each month end to accounts that had signed up by then and had not cancelled by then counts the active base; summing their prices gives MRR.

The base grew every month, from 3 accounts and 1,997 of MRR at the end of October to 12 accounts and 13,988 at the end of March. The changes alternate between about 1,500 and 2,500 to 4,000, depending on whether a team account joined and on which cancellations fell in the month.

**Common mistake:** ignoring cancellations. Cancelled accounts stay in the base forever, so MRR only goes up and churn is invisible.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, plan, signed_up, cancelled, monthly_price, channel) AS ( VALUES ('A01', 'basic', '2024-10-03', NULL, 499, 'search'), ('A02', 'pro', '2024-10-10', '2025-01-12', 999, 'social'), ('A03', 'basic', '2024-10-21', '2024-12-05', 499, 'social'), ('A04', 'pro', '2024-11-02', NULL, 999, 'search'), ('A05', 'basic', '2024-11-14', NULL, 499, 'referral'), ('A06', 'team', '2024-11-20', NULL, 2499, 'search'), ('A07', 'basic', '2024-12-01', '2025-02-20', 499, 'social'), ('A08', 'pro', '2024-12-09', NULL, 999, 'referral'), ('A09', 'basic', '2024-12-18', '2025-01-02', 499, 'search'), ('A10', 'team', '2025-01-06', NULL, 2499, 'search'), ('A11', 'basic', '2025-01-15', NULL, 499, 'social'), ('A12', 'pro', '2025-01-27', '2025-03-10', 999, 'social'), ('A13', 'basic', '2025-02-03', NULL, 499, 'referral'), ('A14', 'pro', '2025-02-14', NULL, 999, 'search'), ('A15', 'basic', '2025-02-25', '2025-03-20', 499, 'social'), ('A16', 'team', '2025-03-04', NULL, 2499, 'referral'), ('A17', 'basic', '2025-03-11', '2025-03-25', 499, 'search'), ('A18', 'pro', '2025-03-22', NULL, 999, 'social') ), month_ends(month_end) AS ( VALUES ('2024-10-31'), ('2024-11-30'), ('2024-12-31'), ('2025-01-31'), ('2025-02-28'), ('2025-03-31') ), snapshots AS (SELECT m.month_end, COUNT(a.account) AS active_accounts, COALESCE(SUM(a.monthly_price), 0) AS mrr FROM month_ends AS m LEFT JOIN accounts AS a ON a.signed_up <= m.month_end GROUP BY m.month_end) SELECT month_end, active_accounts, mrr, mrr - LAG(mrr) OVER (ORDER BY month_end) AS mrr_change FROM snapshots ORDER BY month_end;
```
