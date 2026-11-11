---
id: da-day-195
title: Is the lift fading? Spotting a novelty effect
order: 195
difficulty: intermediate
topic: Experimentation
summary: Track an experiment's relative lift week by week and flag when it keeps shrinking.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Track lift over time
  - Recognise a novelty effect
prerequisites:
  - Day 194
  - Day 123
---

## Task

A redesign's results by week since launch are in the starter query. For each week, compute the conversion rates of control and treatment and the **relative lift** (treatment rate ÷ control rate − 1, as a percentage). Flag `fading` = `'yes'` when the lift is lower than the previous week's lift, `'no'` otherwise (`NULL` for week 1).

Return `week_since_launch`, `control_pct`, `treatment_pct`, `lift_pct` (all rounded to 1 decimal place) and `fading`. Sort by week.

## Starter query

```sql
WITH weekly(week_since_launch, grp, users, conversions) AS (
  VALUES
    (1, 'control', 1000, 100), (1, 'treatment', 1000, 150),
    (2, 'control', 1000, 102), (2, 'treatment', 1000, 130),
    (3, 'control', 1000, 98), (3, 'treatment', 1000, 112),
    (4, 'control', 1000, 101), (4, 'treatment', 1000, 108)
)
SELECT week_since_launch, grp, users, conversions
FROM weekly
ORDER BY week_since_launch, grp;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pivot the groups per week: `MAX(CASE WHEN grp = 'control' THEN 1.0 * conversions / users END)` and the same for treatment.
3. Compute the lift in a CTE, then compare with `LAG(lift) OVER (ORDER BY week_since_launch)` on the unrounded values.

## Solution

```sql
WITH weekly(week_since_launch, grp, users, conversions) AS (
  VALUES
    (1, 'control', 1000, 100), (1, 'treatment', 1000, 150),
    (2, 'control', 1000, 102), (2, 'treatment', 1000, 130),
    (3, 'control', 1000, 98), (3, 'treatment', 1000, 112),
    (4, 'control', 1000, 101), (4, 'treatment', 1000, 108)
),
rates AS (
  SELECT week_since_launch,
    MAX(CASE WHEN grp = 'control' THEN 1.0 * conversions / users END) AS c_rate,
    MAX(CASE WHEN grp = 'treatment' THEN 1.0 * conversions / users END) AS t_rate
  FROM weekly
  GROUP BY week_since_launch
),
lifts AS (
  SELECT week_since_launch, c_rate, t_rate, 100 * (t_rate / c_rate - 1) AS lift FROM rates
)
SELECT week_since_launch,
  ROUND(100 * c_rate, 1) AS control_pct,
  ROUND(100 * t_rate, 1) AS treatment_pct,
  ROUND(lift, 1) AS lift_pct,
  CASE WHEN LAG(lift) OVER (ORDER BY week_since_launch) IS NULL THEN NULL
       WHEN lift < LAG(lift) OVER (ORDER BY week_since_launch) THEN 'yes' ELSE 'no' END AS fading
FROM lifts
ORDER BY week_since_launch;
```

## Expected result

| week_since_launch | control_pct | treatment_pct | lift_pct | fading |
| --- | --- | --- | --- | --- |
| 1 | 10 | 15 | 50 | NULL |
| 2 | 10.2 | 13 | 27.5 | yes |
| 3 | 9.8 | 11.2 | 14.3 | yes |
| 4 | 10.1 | 10.8 | 6.9 | yes |

## Explanation

A new design often wins at first simply because it is new: users click to explore. Here the lift falls from 50% in week 1 to about 7% by week 4, while the control stays flat around 10%. Reporting the first week's (or the pooled) result would oversell the redesign; the stable later weeks are a better estimate of its lasting effect.

Comparing **relative** lifts makes weeks comparable even if the baseline drifts. The comparison uses unrounded values, so two lifts that round to the same figure are still ordered correctly.

**Common mistake:** pooling all four weeks into one lift (about 25%), which hides the trend and averages a fading novelty bump into the "result".

## Wrong answers

Feedback: incorrect-output

```sql
WITH weekly(week_since_launch, grp, users, conversions) AS ( VALUES (1, 'control', 1000, 100), (1, 'treatment', 1000, 150), (2, 'control', 1000, 102), (2, 'treatment', 1000, 130), (3, 'control', 1000, 98), (3, 'treatment', 1000, 112), (4, 'control', 1000, 101), (4, 'treatment', 1000, 108) ), rates AS (SELECT week_since_launch, MAX(CASE WHEN grp = 'control' THEN 1.0 * conversions / users END) AS c_rate, MAX(CASE WHEN grp = 'treatment' THEN 1.0 * conversions / users END) AS t_rate FROM weekly GROUP BY week_since_launch), lifts AS (SELECT week_since_launch, c_rate, t_rate, 100 * (t_rate - c_rate) AS lift FROM rates) SELECT week_since_launch, ROUND(100 * c_rate, 1) AS control_pct, ROUND(100 * t_rate, 1) AS treatment_pct, ROUND(lift, 1) AS lift_pct, CASE WHEN LAG(lift) OVER (ORDER BY week_since_launch) IS NULL THEN NULL WHEN lift < LAG(lift) OVER (ORDER BY week_since_launch) THEN 'yes' ELSE 'no' END AS fading FROM lifts ORDER BY week_since_launch;
```
