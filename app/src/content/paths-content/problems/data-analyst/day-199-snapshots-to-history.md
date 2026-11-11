---
id: da-day-199
title: Turn daily snapshots into a status history
order: 199
difficulty: advanced
topic: Data engineering
summary: Compress repeated daily snapshots into one row per status period with validity dates.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compress snapshots into validity periods
  - Build half-open history ranges with LEAD
prerequisites:
  - Day 160
  - Day 157
---

## Task

A nightly job copies every account's status (in the starter query), producing one row per account per day. Compress it into a **history table**: one row per account per uninterrupted stretch of the same status, with `valid_from` (first day), `valid_to` (the day **after** the last day in that status, `NULL` if it is still the latest status) and `days` (days in that period so far, counting the last snapshot day).

Return `account`, `status`, `valid_from`, `valid_to` and `days`. Sort by `account`, then `valid_from`.

## Starter query

```sql
WITH daily_status(account, day, status) AS (
  VALUES
    ('A1', '2025-03-01', 'trial'), ('A1', '2025-03-02', 'trial'), ('A1', '2025-03-03', 'active'), ('A1', '2025-03-04', 'active'),
    ('A1', '2025-03-05', 'paused'), ('A1', '2025-03-06', 'active'),
    ('A2', '2025-03-01', 'active'), ('A2', '2025-03-02', 'active'), ('A2', '2025-03-03', 'active'), ('A2', '2025-03-04', 'active'),
    ('A2', '2025-03-05', 'active'), ('A2', '2025-03-06', 'active'),
    ('A3', '2025-03-04', 'trial'), ('A3', '2025-03-05', 'trial'), ('A3', '2025-03-06', 'cancelled')
)
SELECT account, day, status
FROM daily_status
ORDER BY account, day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. A new period starts when the status differs from the previous day's: `status IS NOT LAG(status) OVER (PARTITION BY account ORDER BY day)`. A running `SUM` of those starts numbers the periods.
3. Group by account and period: `MIN(day)` is `valid_from`. `valid_to` is the next period's `valid_from`, found with `LEAD(MIN(day)) OVER (PARTITION BY account ORDER BY MIN(day))`, which is `NULL` for the latest period.

## Solution

```sql
WITH daily_status(account, day, status) AS (
  VALUES
    ('A1', '2025-03-01', 'trial'), ('A1', '2025-03-02', 'trial'), ('A1', '2025-03-03', 'active'), ('A1', '2025-03-04', 'active'),
    ('A1', '2025-03-05', 'paused'), ('A1', '2025-03-06', 'active'),
    ('A2', '2025-03-01', 'active'), ('A2', '2025-03-02', 'active'), ('A2', '2025-03-03', 'active'), ('A2', '2025-03-04', 'active'),
    ('A2', '2025-03-05', 'active'), ('A2', '2025-03-06', 'active'),
    ('A3', '2025-03-04', 'trial'), ('A3', '2025-03-05', 'trial'), ('A3', '2025-03-06', 'cancelled')
),
marked AS (
  SELECT account, day, status,
    CASE WHEN status IS NOT LAG(status) OVER (PARTITION BY account ORDER BY day) THEN 1 ELSE 0 END AS starts
  FROM daily_status
),
numbered AS (
  SELECT account, day, status, SUM(starts) OVER (PARTITION BY account ORDER BY day) AS period FROM marked
)
SELECT account, status, MIN(day) AS valid_from,
  LEAD(MIN(day)) OVER (PARTITION BY account ORDER BY MIN(day)) AS valid_to,
  COUNT(*) AS days
FROM numbered
GROUP BY account, period, status
ORDER BY account, valid_from;
```

## Expected result

| account | status | valid_from | valid_to | days |
| --- | --- | --- | --- | --- |
| A1 | trial | 2025-03-01 | 2025-03-03 | 2 |
| A1 | active | 2025-03-03 | 2025-03-05 | 2 |
| A1 | paused | 2025-03-05 | 2025-03-06 | 1 |
| A1 | active | 2025-03-06 | NULL | 1 |
| A2 | active | 2025-03-01 | NULL | 6 |
| A3 | trial | 2025-03-04 | 2025-03-06 | 2 |
| A3 | cancelled | 2025-03-06 | NULL | 1 |

## Explanation

Snapshots are easy to produce and wasteful to keep; a history table stores the same information in a fraction of the rows and answers "what was the status on date X?" with one range lookup (`valid_from <= X AND (valid_to IS NULL OR X < valid_to)`, the half-open ranges of Day 160).

A1 went trial, active, paused and back to active: the second active period is separate from the first, which grouping by status alone would merge into one wrong period running from 3 to 6 March. A2 never changed, so six snapshot rows become a single open-ended row. `IS NOT` makes each account's first day start a period, because its previous status is `NULL`.

**Common mistake:** `GROUP BY account, status` with `MIN(day)` and `MAX(day)`, which merges A1's two active periods across the pause.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_status(account, day, status) AS ( VALUES ('A1', '2025-03-01', 'trial'), ('A1', '2025-03-02', 'trial'), ('A1', '2025-03-03', 'active'), ('A1', '2025-03-04', 'active'), ('A1', '2025-03-05', 'paused'), ('A1', '2025-03-06', 'active'), ('A2', '2025-03-01', 'active'), ('A2', '2025-03-02', 'active'), ('A2', '2025-03-03', 'active'), ('A2', '2025-03-04', 'active'), ('A2', '2025-03-05', 'active'), ('A2', '2025-03-06', 'active'), ('A3', '2025-03-04', 'trial'), ('A3', '2025-03-05', 'trial'), ('A3', '2025-03-06', 'cancelled') ) SELECT account, status, MIN(day) AS valid_from, LEAD(MIN(day)) OVER (PARTITION BY account ORDER BY MIN(day)) AS valid_to, COUNT(*) AS days FROM daily_status GROUP BY account, status ORDER BY account, valid_from;
```
