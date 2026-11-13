---
id: da-day-290
title: Which segment results can we trust?
order: 290
difficulty: intermediate
topic: Statistics
summary: Attach a 95% margin of error to each segment's satisfaction rate and flag results too uncertain to report.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a margin of error
  - Decide whether a result is precise enough
prerequisites:
  - Day 191
  - Day 194
---

## Task

Survey satisfaction by segment is in the starter query. For each segment with respondents, compute the satisfaction rate `p` and its **95% margin of error** `1.96 × √(p × (1 − p) / n)`, both as percentages rounded to 1 decimal place. Flag `reportable` = `'yes'` when the margin of error is at most 5 percentage points, otherwise `'no'`. Segments with no respondents are listed with `NULL` rate and margin and `reportable` = `'no'`.

Return `segment`, `respondents`, `satisfied_pct`, `margin_pct` and `reportable`, sorted by `margin_pct` from smallest (no-data segments last).

## Starter query

```sql
WITH segments(segment, respondents, satisfied) AS (
  VALUES ('North', 400, 300), ('South', 90, 72), ('East', 25, 21), ('West', 1600, 1120), ('Central', 0, 0)
)
SELECT segment, respondents, satisfied
FROM segments;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `p = 1.0 * satisfied / NULLIF(respondents, 0)` is `NULL` when there are no respondents, and so is everything computed from it.
3. Margin: `100 * 1.96 * SQRT(p * (1 - p) / respondents)`. Sort with `ORDER BY margin_pct IS NULL, margin_pct`.

## Solution

```sql
WITH segments(segment, respondents, satisfied) AS (
  VALUES ('North', 400, 300), ('South', 90, 72), ('East', 25, 21), ('West', 1600, 1120), ('Central', 0, 0)
),
rates AS (
  SELECT segment, respondents, 1.0 * satisfied / NULLIF(respondents, 0) AS p FROM segments
)
SELECT segment, respondents, ROUND(100 * p, 1) AS satisfied_pct,
  ROUND(100 * 1.96 * SQRT(p * (1 - p) / respondents), 1) AS margin_pct,
  CASE WHEN 100 * 1.96 * SQRT(p * (1 - p) / respondents) <= 5 THEN 'yes' ELSE 'no' END AS reportable
FROM rates
ORDER BY margin_pct IS NULL, margin_pct;
```

## Expected result

| segment | respondents | satisfied_pct | margin_pct | reportable |
| --- | --- | --- | --- | --- |
| West | 1600 | 70 | 2.2 | yes |
| North | 400 | 75 | 4.2 | yes |
| South | 90 | 80 | 8.3 | no |
| East | 25 | 84 | 14.4 | no |
| Central | 0 | NULL | NULL | no |

## Explanation

A survey rate is only as precise as its sample allows. The margin of error, `1.96 × √(p(1 − p) / n)`, shrinks with the square root of the number of respondents: West's 70% from 1,600 people is accurate to about ±2.2 points, while East's 84% from 25 people could easily be anywhere from about 70% to 98%. Ranking segments by their raw rates would put East on top, which the data cannot support.

Central had no respondents, so `NULLIF` makes its rate `NULL` and it is listed as not reportable rather than causing a division by zero. Reporting the margin next to the rate, and holding back uncertain results, keeps a dashboard from celebrating noise.

**Common mistake:** leaving `n` out of the formula. Every segment then gets a margin of about ±72 to ±90 points regardless of its size, and nothing looks reportable.

## Wrong answers

Feedback: incorrect-output

```sql
WITH segments(segment, respondents, satisfied) AS ( VALUES ('North', 400, 300), ('South', 90, 72), ('East', 25, 21), ('West', 1600, 1120), ('Central', 0, 0) ), rates AS (SELECT segment, respondents, 1.0 * satisfied / NULLIF(respondents, 0) AS p FROM segments) SELECT segment, respondents, ROUND(100 * p, 1) AS satisfied_pct, ROUND(100 * 1.96 * SQRT(p * (1 - p)), 1) AS margin_pct, CASE WHEN 100 * 1.96 * SQRT(p * (1 - p)) <= 5 THEN 'yes' ELSE 'no' END AS reportable FROM rates ORDER BY margin_pct IS NULL, margin_pct;
```
