---
id: da-day-140
title: Subscriber survival, handling unfinished stories
order: 140
difficulty: advanced
topic: Behavioural analytics
summary: Measure survival at fixed ages while excluding subscribers who have not been observed long enough.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Handle censored observations
  - Measure survival at fixed thresholds
prerequisites:
  - Day 109
  - Day 79
---

## Task

Data runs to **2025-06-30** (in the starter query). For each threshold in `thresholds` (30, 60 and 90 days), measure what share of subscribers stayed at least that long:

- A subscriber **survived** a threshold if they had not cancelled within that many days of starting (cancelling on exactly that day counts as surviving).
- A subscriber is **eligible** if we know the answer: either they cancelled (at any time), or they started at least that many days before 2025-06-30. Active subscribers who started more recently are left out for that threshold.

Return `days`, `eligible`, `survived` and `survival_pct` (rounded to 1 decimal place). Sort by `days`.

## Starter query

```sql
WITH subscribers(id, started, cancelled) AS (
  VALUES
    ('s1', '2025-01-10', '2025-02-01'),
    ('s2', '2025-02-01', NULL),
    ('s3', '2025-03-01', '2025-04-15'),
    ('s4', '2025-04-15', NULL),
    ('s5', '2025-05-20', '2025-06-05'),
    ('s6', '2025-06-10', NULL),
    ('s7', '2025-01-20', '2025-04-25')
),
thresholds(days) AS (
  VALUES (30), (60), (90)
)
SELECT id, started, cancelled
FROM subscribers
ORDER BY started;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Work out each subscriber's observed length: `julianday(COALESCE(cancelled, '2025-06-30')) - julianday(started)`.
3. For each threshold, eligible means `cancelled IS NOT NULL OR length >= days`; survived means `length >= days`. Count both with `SUM(CASE ...)` over `thresholds CROSS JOIN` the subscribers.

## Solution

```sql
WITH subscribers(id, started, cancelled) AS (
  VALUES
    ('s1', '2025-01-10', '2025-02-01'),
    ('s2', '2025-02-01', NULL),
    ('s3', '2025-03-01', '2025-04-15'),
    ('s4', '2025-04-15', NULL),
    ('s5', '2025-05-20', '2025-06-05'),
    ('s6', '2025-06-10', NULL),
    ('s7', '2025-01-20', '2025-04-25')
),
thresholds(days) AS (
  VALUES (30), (60), (90)
),
observed AS (
  SELECT id, cancelled,
    julianday(COALESCE(cancelled, '2025-06-30')) - julianday(started) AS length_days
  FROM subscribers
)
SELECT t.days,
  SUM(CASE WHEN o.cancelled IS NOT NULL OR o.length_days >= t.days THEN 1 ELSE 0 END) AS eligible,
  SUM(CASE WHEN o.length_days >= t.days THEN 1 ELSE 0 END) AS survived,
  ROUND(100.0 * SUM(CASE WHEN o.length_days >= t.days THEN 1 ELSE 0 END)
    / SUM(CASE WHEN o.cancelled IS NOT NULL OR o.length_days >= t.days THEN 1 ELSE 0 END), 1) AS survival_pct
FROM thresholds AS t
CROSS JOIN observed AS o
GROUP BY t.days
ORDER BY t.days;
```

## Expected result

| days | eligible | survived | survival_pct |
| --- | --- | --- | --- |
| 30 | 6 | 4 | 66.7 |
| 60 | 6 | 3 | 50 |
| 90 | 5 | 2 | 40 |

## Explanation

Some stories are not finished yet: s6 started 20 days ago and is still active. We cannot say whether s6 will last 30 days, so counting s6 as a survivor would be optimistic and counting s6 as a loss would be wrong. Leaving such subscribers out of the thresholds they have not reached is called handling **censoring**, the core idea behind survival analysis.

Subscribers who cancelled are always eligible, because their outcome is known. s4 has been active for 76 days: eligible for 30 and 60 days, but not yet for 90. The survival rate falls from 66.7% at 30 days to 40% at 90.

**Common mistake:** treating every active subscriber as a survivor at every threshold, which makes long-term retention look better the more new customers there are.

## Wrong answers

Feedback: incorrect-output

```sql
WITH subscribers(id, started, cancelled) AS ( VALUES ('s1', '2025-01-10', '2025-02-01'), ('s2', '2025-02-01', NULL), ('s3', '2025-03-01', '2025-04-15'), ('s4', '2025-04-15', NULL), ('s5', '2025-05-20', '2025-06-05'), ('s6', '2025-06-10', NULL), ('s7', '2025-01-20', '2025-04-25') ), thresholds(days) AS ( VALUES (30), (60), (90) ), observed AS (SELECT id, cancelled, julianday(COALESCE(cancelled, '2025-06-30')) - julianday(started) AS length_days FROM subscribers) SELECT t.days, COUNT(*) AS eligible, SUM(CASE WHEN o.cancelled IS NULL OR o.length_days >= t.days THEN 1 ELSE 0 END) AS survived, ROUND(100.0 * SUM(CASE WHEN o.cancelled IS NULL OR o.length_days >= t.days THEN 1 ELSE 0 END) / COUNT(*), 1) AS survival_pct FROM thresholds AS t CROSS JOIN observed AS o GROUP BY t.days ORDER BY t.days;
```
