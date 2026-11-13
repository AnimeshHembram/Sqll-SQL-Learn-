---
id: da-day-268
title: Case study: net revenue retention for a SaaS cohort
order: 268
difficulty: advanced
topic: Case studies
summary: Follow a cohort of accounts for a year and split the revenue change into expansion, contraction and churn.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Bridge revenue from start to end
  - Separate expansion, contraction and churn
prerequisites:
  - Day 116
  - Day 237
---

## Task

A SaaS company tracks the accounts that were customers on **1 April 2024** (starter query: starting seats and monthly recurring revenue, then every seat change since). For the 12 months to **31 March 2025**, using changes dated within that period only:

- `ending_mrr` per account (start plus changes), where an account at 0 seats has **churned**,
- `expansion` (positive MRR changes), `contraction` (negative changes of accounts that did not churn) and `churn` (the starting MRR plus changes of accounts that ended at 0 seats, as a negative number).

Return one row: `accounts`, `start_mrr`, `expansion`, `contraction`, `churn`, `end_mrr`, `nrr_pct` (end ÷ start × 100) and `grr_pct` (gross revenue retention: (start + contraction + churn) ÷ start × 100), with percentages rounded to 1 decimal place. Check that start + expansion + contraction + churn = end.

## Starter query

```sql
WITH accounts(account, start_seats, start_mrr) AS (
  VALUES ('Acme', 50, 25000), ('Bolt', 20, 10000), ('Crest', 10, 6000), ('Delta', 30, 15000), ('Echo', 15, 7500)
),
seat_changes(account, changed_on, seat_delta, mrr_delta) AS (
  VALUES
    ('Acme', '2024-06-01', 20, 10000), ('Acme', '2024-11-01', -5, -2500),
    ('Bolt', '2024-08-15', -20, -10000),
    ('Crest', '2024-05-01', 5, 3000), ('Crest', '2025-02-01', 10, 6000),
    ('Delta', '2024-09-01', -10, -5000),
    ('Echo', '2024-07-01', 0, 1500), ('Acme', '2025-04-10', 10, 5000)
)
SELECT a.account, a.start_seats, a.start_mrr, c.changed_on, c.seat_delta, c.mrr_delta
FROM accounts AS a
LEFT JOIN seat_changes AS c ON c.account = a.account
ORDER BY a.account, c.changed_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per account: ending seats and MRR are the start plus the sums of changes dated `BETWEEN '2024-04-01' AND '2025-03-31'` (a `LEFT JOIN` with the dates in the join condition keeps accounts without changes). Positive and negative changes: `SUM(CASE WHEN mrr_delta > 0 ...)`.
3. An account with ending seats of 0 churned: put all of its lost revenue into churn (`-start_mrr`) and none into expansion or contraction, even if it grew first. Then sum over accounts.

## Solution

```sql
WITH accounts(account, start_seats, start_mrr) AS (
  VALUES ('Acme', 50, 25000), ('Bolt', 20, 10000), ('Crest', 10, 6000), ('Delta', 30, 15000), ('Echo', 15, 7500)
),
seat_changes(account, changed_on, seat_delta, mrr_delta) AS (
  VALUES
    ('Acme', '2024-06-01', 20, 10000), ('Acme', '2024-11-01', -5, -2500),
    ('Bolt', '2024-08-15', -20, -10000),
    ('Crest', '2024-05-01', 5, 3000), ('Crest', '2025-02-01', 10, 6000),
    ('Delta', '2024-09-01', -10, -5000),
    ('Echo', '2024-07-01', 0, 1500), ('Acme', '2025-04-10', 10, 5000)
),
per_account AS (
  SELECT a.account, a.start_mrr,
    a.start_seats + COALESCE(SUM(c.seat_delta), 0) AS end_seats,
    a.start_mrr + COALESCE(SUM(c.mrr_delta), 0) AS end_mrr,
    COALESCE(SUM(CASE WHEN c.mrr_delta > 0 THEN c.mrr_delta END), 0) AS ups,
    COALESCE(SUM(CASE WHEN c.mrr_delta < 0 THEN c.mrr_delta END), 0) AS downs
  FROM accounts AS a
  LEFT JOIN seat_changes AS c ON c.account = a.account AND c.changed_on BETWEEN '2024-04-01' AND '2025-03-31'
  GROUP BY a.account, a.start_mrr, a.start_seats
),
split AS (
  SELECT start_mrr, end_mrr,
    CASE WHEN end_seats = 0 THEN 0 ELSE ups END AS expansion,
    CASE WHEN end_seats = 0 THEN 0 ELSE downs END AS contraction,
    CASE WHEN end_seats = 0 THEN -start_mrr ELSE 0 END AS churn
  FROM per_account
)
SELECT COUNT(*) AS accounts, SUM(start_mrr) AS start_mrr, SUM(expansion) AS expansion, SUM(contraction) AS contraction, SUM(churn) AS churn,
  SUM(end_mrr) AS end_mrr,
  ROUND(100.0 * SUM(end_mrr) / SUM(start_mrr), 1) AS nrr_pct,
  ROUND(100.0 * (SUM(start_mrr) + SUM(contraction) + SUM(churn)) / SUM(start_mrr), 1) AS grr_pct
FROM split;
```

## Expected result

| accounts | start_mrr | expansion | contraction | churn | end_mrr | nrr_pct | grr_pct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | 63500 | 20500 | -7500 | -10000 | 66500 | 104.7 | 72.4 |

## Explanation

Net revenue retention (NRR) asks: of the money the cohort was paying a year ago, how much is it paying now, counting upgrades? Gross revenue retention (GRR) asks the same without the upgrades. This cohort started at 63,500 a month and ended at 66,500: NRR 104.7%. Upgrades (20,500) more than made up for downgrades (7,500) and the one churned account (Bolt, 10,000). Without the upgrades, only 72.4% of the starting revenue was kept.

Two rules make the bridge add up. Only changes inside the year count: Acme's 10 extra seats in April 2025 belong to next year's report. And a churned account's whole starting revenue counts as churn, even if it had grown or shrunk on the way. Check: 63,500 + 20,500 − 7,500 − 10,000 = 66,500.

**Common mistake:** counting changes outside the period. Acme's April 2025 upgrade adds 5,000 of expansion that had not happened by 31 March, and NRR is overstated at 112.6%.

## Wrong answers

Feedback: incorrect-output

```sql
WITH accounts(account, start_seats, start_mrr) AS ( VALUES ('Acme', 50, 25000), ('Bolt', 20, 10000), ('Crest', 10, 6000), ('Delta', 30, 15000), ('Echo', 15, 7500) ), seat_changes(account, changed_on, seat_delta, mrr_delta) AS ( VALUES ('Acme', '2024-06-01', 20, 10000), ('Acme', '2024-11-01', -5, -2500), ('Bolt', '2024-08-15', -20, -10000), ('Crest', '2024-05-01', 5, 3000), ('Crest', '2025-02-01', 10, 6000), ('Delta', '2024-09-01', -10, -5000), ('Echo', '2024-07-01', 0, 1500), ('Acme', '2025-04-10', 10, 5000) ), per_account AS (SELECT a.account, a.start_mrr, a.start_seats + COALESCE(SUM(c.seat_delta), 0) AS end_seats, a.start_mrr + COALESCE(SUM(c.mrr_delta), 0) AS end_mrr, COALESCE(SUM(CASE WHEN c.mrr_delta > 0 THEN c.mrr_delta END), 0) AS ups, COALESCE(SUM(CASE WHEN c.mrr_delta < 0 THEN c.mrr_delta END), 0) AS downs FROM accounts AS a LEFT JOIN seat_changes AS c ON c.account = a.account GROUP BY a.account, a.start_mrr, a.start_seats), split AS (SELECT start_mrr, end_mrr, CASE WHEN end_seats = 0 THEN 0 ELSE ups END AS expansion, CASE WHEN end_seats = 0 THEN 0 ELSE downs END AS contraction, CASE WHEN end_seats = 0 THEN -start_mrr ELSE 0 END AS churn FROM per_account) SELECT COUNT(*) AS accounts, SUM(start_mrr) AS start_mrr, SUM(expansion) AS expansion, SUM(contraction) AS contraction, SUM(churn) AS churn, SUM(end_mrr) AS end_mrr, ROUND(100.0 * SUM(end_mrr) / SUM(start_mrr), 1) AS nrr_pct, ROUND(100.0 * (SUM(start_mrr) + SUM(contraction) + SUM(churn)) / SUM(start_mrr), 1) AS grr_pct FROM split;
```
