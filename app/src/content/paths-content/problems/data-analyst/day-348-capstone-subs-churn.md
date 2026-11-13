---
id: da-day-348
title: Capstone (subscriptions) 3: monthly churn rate
order: 348
difficulty: advanced
topic: Capstone
summary: Compute logo churn per month as cancellations over accounts active at the start of the month.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute churn on a starting base
  - Exclude accounts that joined during the period
prerequisites:
  - Day 109
  - Day 237
---

## Task

Same company. For each month from **November 2024 to March 2025**, return:

- `start_accounts`: active at the end of the previous month (signed up on or before it, not cancelled by then),
- `cancellations`: accounts that cancelled during the month (only those that were active at its start count; an account that signed up and cancelled within the month is excluded),
- `churn_pct`: cancellations ÷ start accounts × 100, rounded to 1 decimal place.

Return `month` (`'YYYY-MM'`), `start_accounts`, `cancellations` and `churn_pct`, sorted by `month`.

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
SELECT account, signed_up, cancelled
FROM accounts
ORDER BY signed_up;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. List the months with their first day and the previous month end, for example as `VALUES`.
2. Start accounts: `signed_up <= prev_end AND (cancelled IS NULL OR cancelled > prev_end)`. Cancellations among them: the same condition plus `cancelled BETWEEN first_day AND month_end`.
3. Use conditional sums over a `CROSS JOIN` of months and accounts, so every month appears even with no cancellations.

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
months(month, first_day, month_end, prev_end) AS (
  VALUES
    ('2024-11', '2024-11-01', '2024-11-30', '2024-10-31'), ('2024-12', '2024-12-01', '2024-12-31', '2024-11-30'),
    ('2025-01', '2025-01-01', '2025-01-31', '2024-12-31'), ('2025-02', '2025-02-01', '2025-02-28', '2025-01-31'),
    ('2025-03', '2025-03-01', '2025-03-31', '2025-02-28')
),
counts AS (
  SELECT m.month,
    SUM(a.signed_up <= m.prev_end AND (a.cancelled IS NULL OR a.cancelled > m.prev_end)) AS start_accounts,
    SUM(a.signed_up <= m.prev_end AND a.cancelled BETWEEN m.first_day AND m.month_end) AS cancellations
  FROM months AS m
  CROSS JOIN accounts AS a
  GROUP BY m.month
)
SELECT month, start_accounts, cancellations, ROUND(100.0 * cancellations / start_accounts, 1) AS churn_pct
FROM counts
ORDER BY month;
```

## Expected result

| month | start_accounts | cancellations | churn_pct |
| --- | --- | --- | --- |
| 2024-11 | 3 | 0 | 0 |
| 2024-12 | 6 | 1 | 16.7 |
| 2025-01 | 8 | 2 | 25 |
| 2025-02 | 9 | 1 | 11.1 |
| 2025-03 | 11 | 2 | 18.2 |

## Explanation

Churn rate is cancellations divided by the customers you had at the **start** of the period. Accounts that sign up during a month are not part of its starting base, so an account that joins and cancels in the same month does not count as churn either: here A15, which signed up in February and cancelled in March, does count in March because it was active at the end of February.

Churn ranged from 0% in November to 25% in January, when two of eight starting accounts left. With bases this small, one cancellation moves the rate by 10 points or more, which is why SaaS companies also watch the absolute numbers.

**Common mistake:** counting every cancellation in the month, including accounts that joined during it. The numerator includes customers who were never in the denominator, and the rate is overstated whenever a short-lived sign-up appears.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, plan, signed_up, cancelled, monthly_price, channel) AS ( VALUES ('A01', 'basic', '2024-10-03', NULL, 499, 'search'), ('A02', 'pro', '2024-10-10', '2025-01-12', 999, 'social'), ('A03', 'basic', '2024-10-21', '2024-12-05', 499, 'social'), ('A04', 'pro', '2024-11-02', NULL, 999, 'search'), ('A05', 'basic', '2024-11-14', NULL, 499, 'referral'), ('A06', 'team', '2024-11-20', NULL, 2499, 'search'), ('A07', 'basic', '2024-12-01', '2025-02-20', 499, 'social'), ('A08', 'pro', '2024-12-09', NULL, 999, 'referral'), ('A09', 'basic', '2024-12-18', '2025-01-02', 499, 'search'), ('A10', 'team', '2025-01-06', NULL, 2499, 'search'), ('A11', 'basic', '2025-01-15', NULL, 499, 'social'), ('A12', 'pro', '2025-01-27', '2025-03-10', 999, 'social'), ('A13', 'basic', '2025-02-03', NULL, 499, 'referral'), ('A14', 'pro', '2025-02-14', NULL, 999, 'search'), ('A15', 'basic', '2025-02-25', '2025-03-20', 499, 'social'), ('A16', 'team', '2025-03-04', NULL, 2499, 'referral'), ('A17', 'basic', '2025-03-11', '2025-03-25', 499, 'search'), ('A18', 'pro', '2025-03-22', NULL, 999, 'social') ), months(month, first_day, month_end, prev_end) AS (VALUES ('2024-11', '2024-11-01', '2024-11-30', '2024-10-31'), ('2024-12', '2024-12-01', '2024-12-31', '2024-11-30'), ('2025-01', '2025-01-01', '2025-01-31', '2024-12-31'), ('2025-02', '2025-02-01', '2025-02-28', '2025-01-31'), ('2025-03', '2025-03-01', '2025-03-31', '2025-02-28')), counts AS (SELECT m.month, SUM(a.signed_up <= m.prev_end AND (a.cancelled IS NULL OR a.cancelled > m.prev_end)) AS start_accounts, SUM(a.cancelled BETWEEN m.first_day AND m.month_end) AS cancellations FROM months AS m CROSS JOIN accounts AS a GROUP BY m.month) SELECT month, start_accounts, cancellations, ROUND(100.0 * cancellations / start_accounts, 1) AS churn_pct FROM counts ORDER BY month;
```
