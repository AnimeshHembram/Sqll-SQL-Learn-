---
id: da-day-191
title: Confidence intervals for conversion rates
order: 191
difficulty: advanced
topic: Experimentation
summary: Put a 95% confidence interval around each conversion rate and judge whether variants differ.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a confidence interval for a proportion
  - Judge differences with uncertainty
prerequisites:
  - Day 112
  - Day 154
---

## Task

For each variant (in the starter query), compute the conversion rate `p` and a **95% confidence interval** `p ± 1.96 × sqrt(p × (1 − p) / n)`, where `n` is visitors. Then say whether the variant's interval lies **entirely above** the control's interval.

Return `variant`, `rate_pct`, `ci_low_pct` and `ci_high_pct` (percentages rounded to 2 decimal places) and `beats_control`: `'yes'` if the variant's lower bound is above the control's upper bound, `'no'` otherwise, and `NULL` for the control itself. Sort by `variant`.

## Starter query

```sql
WITH ab_results(variant, visitors, conversions) AS (
  VALUES ('control', 2000, 200), ('treatment', 2000, 240), ('treatment_b', 400, 44)
)
SELECT variant, visitors, conversions, 1.0 * conversions / visitors AS rate
FROM ab_results;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per variant: `p = 1.0 * conversions / visitors` and `margin = 1.96 * sqrt(p * (1 - p) / visitors)`. Compute both in a CTE.
3. Get the control's upper bound with a subquery or a join on `variant = 'control'`, and compare it with each variant's lower bound.

## Solution

```sql
WITH ab_results(variant, visitors, conversions) AS (
  VALUES ('control', 2000, 200), ('treatment', 2000, 240), ('treatment_b', 400, 44)
),
rates AS (
  SELECT variant, 1.0 * conversions / visitors AS p, visitors FROM ab_results
),
intervals AS (
  SELECT variant, p, p - 1.96 * sqrt(p * (1 - p) / visitors) AS low, p + 1.96 * sqrt(p * (1 - p) / visitors) AS high FROM rates
)
SELECT i.variant,
  ROUND(100 * i.p, 2) AS rate_pct,
  ROUND(100 * i.low, 2) AS ci_low_pct,
  ROUND(100 * i.high, 2) AS ci_high_pct,
  CASE WHEN i.variant = 'control' THEN NULL WHEN i.low > c.high THEN 'yes' ELSE 'no' END AS beats_control
FROM intervals AS i
CROSS JOIN intervals AS c
WHERE c.variant = 'control'
ORDER BY i.variant;
```

## Expected result

| variant | rate_pct | ci_low_pct | ci_high_pct | beats_control |
| --- | --- | --- | --- | --- |
| control | 10 | 8.69 | 11.31 | NULL |
| treatment | 12 | 10.58 | 13.42 | no |
| treatment_b | 11 | 7.93 | 14.07 | no |

## Explanation

A conversion rate measured on a sample is uncertain; the confidence interval shows how uncertain. Treatment_b converts at 11%, between control and treatment, but its interval is wide (about ±3 points) because it saw only 400 visitors. Treatment's 12% from 2,000 visitors has a much tighter interval.

Non-overlapping intervals are a conservative test: when they do not overlap, the difference is clearly real; when they overlap a little, a proper two-proportion test may still find a difference. Here treatment's interval (10.58–13.42) only just overlaps control's (8.69–11.31), so the honest answer is "promising, not yet conclusive".

**Common mistake:** comparing the rates alone and declaring every higher rate a winner, which rewards small, noisy samples.

## Wrong answers

Feedback: incorrect-output

```sql
WITH ab_results(variant, visitors, conversions) AS ( VALUES ('control', 2000, 200), ('treatment', 2000, 240), ('treatment_b', 400, 44) ), rates AS (SELECT variant, 1.0 * conversions / visitors AS p, visitors FROM ab_results), intervals AS (SELECT variant, p, p - 1.96 * sqrt(p * (1 - p) / visitors) AS low, p + 1.96 * sqrt(p * (1 - p) / visitors) AS high FROM rates) SELECT i.variant, ROUND(100 * i.p, 2) AS rate_pct, ROUND(100 * i.low, 2) AS ci_low_pct, ROUND(100 * i.high, 2) AS ci_high_pct, CASE WHEN i.variant = 'control' THEN NULL WHEN i.p > c.p THEN 'yes' ELSE 'no' END AS beats_control FROM intervals AS i CROSS JOIN intervals AS c WHERE c.variant = 'control' ORDER BY i.variant;
```
