---
id: da-day-220
title: Prorate March charges for part-month subscriptions
order: 220
difficulty: intermediate
topic: Dates
summary: Clip each subscription to the billing month and charge for the days it was active.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Clip date ranges to a period
  - Prorate an amount by days
prerequisites:
  - Day 157
  - Day 132
---

## Task

Billing for **March 2025** (31 days) charges each subscription (starter query) for the days it was active in March: `plan_price × active_days / 31`. A subscription is active from `started` to `ended` inclusive; `ended` is `NULL` while it continues. Subscriptions not active on any March day are left out.

Return `sub`, `active_days` and `charge` (rounded to 2 decimal places). Sort by `sub`.

## Starter query

```sql
WITH subscriptions(sub, plan_price, started, ended) AS (
  VALUES
    ('S1', 310, '2025-01-10', NULL), ('S2', 310, '2025-03-10', NULL), ('S3', 620, '2025-02-01', '2025-03-15'),
    ('S4', 620, '2025-03-05', '2025-03-05'), ('S5', 310, '2025-01-01', '2025-02-28'), ('S6', 155, '2025-04-01', NULL)
)
SELECT sub, plan_price, started, ended
FROM subscriptions
ORDER BY sub;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Clip the period to the month: it starts at `MAX(started, '2025-03-01')` and ends at `MIN(COALESCE(ended, '2025-03-31'), '2025-03-31')`. ISO dates compare correctly as text.
3. Active days = `julianday(clip_end) - julianday(clip_start) + 1`, and only rows where `clip_start <= clip_end` were active in March.

## Solution

```sql
WITH subscriptions(sub, plan_price, started, ended) AS (
  VALUES
    ('S1', 310, '2025-01-10', NULL), ('S2', 310, '2025-03-10', NULL), ('S3', 620, '2025-02-01', '2025-03-15'),
    ('S4', 620, '2025-03-05', '2025-03-05'), ('S5', 310, '2025-01-01', '2025-02-28'), ('S6', 155, '2025-04-01', NULL)
),
clipped AS (
  SELECT sub, plan_price,
    MAX(started, '2025-03-01') AS clip_start,
    MIN(COALESCE(ended, '2025-03-31'), '2025-03-31') AS clip_end
  FROM subscriptions
)
SELECT sub, CAST(julianday(clip_end) - julianday(clip_start) + 1 AS INTEGER) AS active_days,
  ROUND(plan_price * (julianday(clip_end) - julianday(clip_start) + 1) / 31, 2) AS charge
FROM clipped
WHERE clip_start <= clip_end
ORDER BY sub;
```

## Expected result

| sub | active_days | charge |
| --- | --- | --- |
| S1 | 31 | 310 |
| S2 | 22 | 220 |
| S3 | 15 | 300 |
| S4 | 1 | 20 |

## Explanation

Prorating is clipping, then counting. Each subscription's period is cut to the billing month (the later of its start and 1 March, the earlier of its end and 31 March), and the days between the clipped ends, **inclusive**, are what the customer pays for.

S2 started on 10 March, so it was active for 22 days and pays 22/31 of 310, exactly 220. S3 ended on 15 March, so 15 days of a 620 plan cost 300. S4 started and ended on 5 March: one day, 20. S5 ended in February and S6 starts in April; after clipping their start is later than their end, which is how `WHERE clip_start <= clip_end` recognises that they were not active in March and leaves them out.

**Common mistake:** forgetting the `+ 1`. The difference between two dates counts the nights between them, so S4 would be charged for 0 days and every partial month is a day short.

## Wrong answers

Feedback: incorrect-output

```sql
WITH subscriptions(sub, plan_price, started, ended) AS ( VALUES ('S1', 310, '2025-01-10', NULL), ('S2', 310, '2025-03-10', NULL), ('S3', 620, '2025-02-01', '2025-03-15'), ('S4', 620, '2025-03-05', '2025-03-05'), ('S5', 310, '2025-01-01', '2025-02-28'), ('S6', 155, '2025-04-01', NULL) ), clipped AS (SELECT sub, plan_price, MAX(started, '2025-03-01') AS clip_start, MIN(COALESCE(ended, '2025-03-31'), '2025-03-31') AS clip_end FROM subscriptions) SELECT sub, CAST(julianday(clip_end) - julianday(clip_start) AS INTEGER) AS active_days, ROUND(plan_price * (julianday(clip_end) - julianday(clip_start)) / 31, 2) AS charge FROM clipped WHERE clip_start <= clip_end ORDER BY sub;
```

Feedback: extra-rows

```sql
WITH subscriptions(sub, plan_price, started, ended) AS ( VALUES ('S1', 310, '2025-01-10', NULL), ('S2', 310, '2025-03-10', NULL), ('S3', 620, '2025-02-01', '2025-03-15'), ('S4', 620, '2025-03-05', '2025-03-05'), ('S5', 310, '2025-01-01', '2025-02-28'), ('S6', 155, '2025-04-01', NULL) ), clipped AS (SELECT sub, plan_price, MAX(started, '2025-03-01') AS clip_start, MIN(COALESCE(ended, '2025-03-31'), '2025-03-31') AS clip_end FROM subscriptions) SELECT sub, CAST(julianday(clip_end) - julianday(clip_start) + 1 AS INTEGER) AS active_days, ROUND(plan_price * (julianday(clip_end) - julianday(clip_start) + 1) / 31, 2) AS charge FROM clipped ORDER BY sub;
```
