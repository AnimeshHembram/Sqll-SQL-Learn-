---
id: da-day-209
title: Case study: loan delinquency roll rates
order: 209
difficulty: advanced
topic: Case studies
summary: Build a month-to-month transition matrix of delinquency buckets and the rates at which loans roll forward.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a transition matrix between two snapshots
  - Compute roll-forward rates with a severity order
prerequisites:
  - Day 161
  - Day 137
---

## Task

A lender tracks each loan's delinquency bucket at month end (in the starter query): `'current'`, `'1-30'`, `'31-60'` or `'61+'` days past due, or `'paid off'`. For loans in each January bucket, show where they were in February.

Return `from_bucket`, `loans`, then the share (as percentages rounded to 1 decimal place) that moved to each February state: `to_current`, `to_1_30`, `to_31_60`, `to_61_plus`, `to_paid_off`, and `roll_forward_pct`: the share that moved to a **worse** bucket. Sort from the best bucket to the worst: current, 1-30, 31-60.

## Starter query

```sql
WITH loan_status(loan, month, bucket) AS (
  VALUES
    ('L1', '2025-01', 'current'), ('L1', '2025-02', 'current'),
    ('L2', '2025-01', 'current'), ('L2', '2025-02', '1-30'),
    ('L3', '2025-01', '1-30'), ('L3', '2025-02', '31-60'),
    ('L4', '2025-01', '1-30'), ('L4', '2025-02', 'current'),
    ('L5', '2025-01', '31-60'), ('L5', '2025-02', '61+'),
    ('L6', '2025-01', 'current'), ('L6', '2025-02', 'current'),
    ('L7', '2025-01', 'current'), ('L7', '2025-02', 'paid off'),
    ('L8', '2025-01', '1-30'), ('L8', '2025-02', '1-30')
)
SELECT loan, month, bucket
FROM loan_status
ORDER BY loan, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pair each loan's January and February rows: `MAX(CASE WHEN month = '2025-01' THEN bucket END)` and the same for February, grouped by loan.
3. Give the buckets a severity order (current 0, 1-30 1, 31-60 2, 61+ 3) with a `CASE`. Per January bucket, `100.0 * AVG(CASE WHEN feb = 'current' THEN 1 ELSE 0 END)` gives each share; worse means a higher severity in February (paid off is not worse).

## Solution

```sql
WITH loan_status(loan, month, bucket) AS (
  VALUES
    ('L1', '2025-01', 'current'), ('L1', '2025-02', 'current'),
    ('L2', '2025-01', 'current'), ('L2', '2025-02', '1-30'),
    ('L3', '2025-01', '1-30'), ('L3', '2025-02', '31-60'),
    ('L4', '2025-01', '1-30'), ('L4', '2025-02', 'current'),
    ('L5', '2025-01', '31-60'), ('L5', '2025-02', '61+'),
    ('L6', '2025-01', 'current'), ('L6', '2025-02', 'current'),
    ('L7', '2025-01', 'current'), ('L7', '2025-02', 'paid off'),
    ('L8', '2025-01', '1-30'), ('L8', '2025-02', '1-30')
),
pairs AS (
  SELECT loan,
    MAX(CASE WHEN month = '2025-01' THEN bucket END) AS jan,
    MAX(CASE WHEN month = '2025-02' THEN bucket END) AS feb
  FROM loan_status
  GROUP BY loan
),
scored AS (
  SELECT jan, feb,
    CASE jan WHEN 'current' THEN 0 WHEN '1-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61+' THEN 3 END AS jan_level,
    CASE feb WHEN 'current' THEN 0 WHEN '1-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61+' THEN 3 END AS feb_level
  FROM pairs
)
SELECT jan AS from_bucket, COUNT(*) AS loans,
  ROUND(100.0 * AVG(CASE WHEN feb = 'current' THEN 1 ELSE 0 END), 1) AS to_current,
  ROUND(100.0 * AVG(CASE WHEN feb = '1-30' THEN 1 ELSE 0 END), 1) AS to_1_30,
  ROUND(100.0 * AVG(CASE WHEN feb = '31-60' THEN 1 ELSE 0 END), 1) AS to_31_60,
  ROUND(100.0 * AVG(CASE WHEN feb = '61+' THEN 1 ELSE 0 END), 1) AS to_61_plus,
  ROUND(100.0 * AVG(CASE WHEN feb = 'paid off' THEN 1 ELSE 0 END), 1) AS to_paid_off,
  ROUND(100.0 * AVG(CASE WHEN feb_level > jan_level THEN 1 ELSE 0 END), 1) AS roll_forward_pct
FROM scored
GROUP BY jan, jan_level
ORDER BY jan_level;
```

## Expected result

| from_bucket | loans | to_current | to_1_30 | to_31_60 | to_61_plus | to_paid_off | roll_forward_pct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| current | 4 | 50 | 25 | 0 | 0 | 25 | 25 |
| 1-30 | 3 | 33.3 | 33.3 | 33.3 | 0 | 0 | 33.3 |
| 31-60 | 1 | 0 | 0 | 0 | 100 | 0 | 100 |

## Explanation

Roll rates are the core of credit risk reporting: the share of loans in each bucket that "roll" into the next, worse bucket each month. Multiplying them along the chain estimates how many of today's current loans will eventually default, which drives provisions.

Each row of the matrix adds up to 100%: every January loan is somewhere in February. Of the four current loans, one rolled to 1-30 and one paid off. Of the three 1-30 loans, one cured back to current, one stayed and one rolled to 31-60. The single 31-60 loan rolled to 61+.

"Paid off" is a better outcome than any bucket, so it must not count as rolling forward even though it is not "current"; the severity mapping gives it no level, and `NULL > level` is not true.

**Common mistake:** computing shares of all loans instead of shares of each January bucket, which makes the rows impossible to compare and the roll rates meaningless.

## Wrong answers

Feedback: incorrect-output

```sql
WITH loan_status(loan, month, bucket) AS ( VALUES ('L1', '2025-01', 'current'), ('L1', '2025-02', 'current'), ('L2', '2025-01', 'current'), ('L2', '2025-02', '1-30'), ('L3', '2025-01', '1-30'), ('L3', '2025-02', '31-60'), ('L4', '2025-01', '1-30'), ('L4', '2025-02', 'current'), ('L5', '2025-01', '31-60'), ('L5', '2025-02', '61+'), ('L6', '2025-01', 'current'), ('L6', '2025-02', 'current'), ('L7', '2025-01', 'current'), ('L7', '2025-02', 'paid off'), ('L8', '2025-01', '1-30'), ('L8', '2025-02', '1-30') ), pairs AS (SELECT loan, MAX(CASE WHEN month = '2025-01' THEN bucket END) AS jan, MAX(CASE WHEN month = '2025-02' THEN bucket END) AS feb FROM loan_status GROUP BY loan), scored AS (SELECT jan, feb, CASE jan WHEN 'current' THEN 0 WHEN '1-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61+' THEN 3 END AS jan_level, CASE feb WHEN 'current' THEN 0 WHEN '1-30' THEN 1 WHEN '31-60' THEN 2 WHEN '61+' THEN 3 ELSE 9 END AS feb_level FROM pairs) SELECT jan AS from_bucket, COUNT(*) AS loans, ROUND(100.0 * AVG(CASE WHEN feb = 'current' THEN 1 ELSE 0 END), 1) AS to_current, ROUND(100.0 * AVG(CASE WHEN feb = '1-30' THEN 1 ELSE 0 END), 1) AS to_1_30, ROUND(100.0 * AVG(CASE WHEN feb = '31-60' THEN 1 ELSE 0 END), 1) AS to_31_60, ROUND(100.0 * AVG(CASE WHEN feb = '61+' THEN 1 ELSE 0 END), 1) AS to_61_plus, ROUND(100.0 * AVG(CASE WHEN feb = 'paid off' THEN 1 ELSE 0 END), 1) AS to_paid_off, ROUND(100.0 * AVG(CASE WHEN feb_level > jan_level THEN 1 ELSE 0 END), 1) AS roll_forward_pct FROM scored GROUP BY jan, jan_level ORDER BY jan_level;
```
