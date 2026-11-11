---
id: da-day-154
title: When the winner flips: Simpson's paradox
order: 154
difficulty: advanced
topic: Statistics
summary: Compare rates per segment and overall, and see why pooled rates can reverse the conclusion.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Recognise Simpson's paradox
  - Pool rates correctly from totals
prerequisites:
  - Day 112
  - Day 51
---

## Task

An A/B test (in the starter query) recorded visits and conversions per variant and device. Product says variant A won. For each device and for all devices together, return `segment` (the device, or `'All devices'`), `a_rate_pct` and `b_rate_pct` (conversions ÷ visits as percentages, rounded to 1 decimal place) and `better` (`'A'`, `'B'` or `'tie'`, compared on the unrounded rates).

The overall rate must be **total conversions ÷ total visits**. Sort the devices alphabetically, with `'All devices'` last.

## Starter query

```sql
WITH test_results(variant, device, visits, conversions) AS (
  VALUES
    ('A', 'desktop', 800, 160), ('A', 'mobile', 200, 10), ('A', 'tablet', 100, 10),
    ('B', 'desktop', 200, 44), ('B', 'mobile', 800, 48), ('B', 'tablet', 50, 5)
)
SELECT variant, device, visits, conversions
FROM test_results
ORDER BY device, variant;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Build the rows to compare as one list: the device rows (`device AS segment`) plus a total per variant (`'All devices' AS segment` with `SUM(visits)` and `SUM(conversions)`), combined with `UNION ALL` in a CTE.
3. Pivot the variants with `SUM(CASE WHEN variant = 'A' THEN conversions END) * 1.0 / SUM(CASE WHEN variant = 'A' THEN visits END)`. Sort with `ORDER BY segment = 'All devices', segment`.

## Solution

```sql
WITH test_results(variant, device, visits, conversions) AS (
  VALUES
    ('A', 'desktop', 800, 160), ('A', 'mobile', 200, 10), ('A', 'tablet', 100, 10),
    ('B', 'desktop', 200, 44), ('B', 'mobile', 800, 48), ('B', 'tablet', 50, 5)
),
cells AS (
  SELECT device AS segment, variant, visits, conversions FROM test_results
  UNION ALL
  SELECT 'All devices', variant, SUM(visits), SUM(conversions) FROM test_results GROUP BY variant
),
rates AS (
  SELECT segment,
    1.0 * SUM(CASE WHEN variant = 'A' THEN conversions END) / SUM(CASE WHEN variant = 'A' THEN visits END) AS a_rate,
    1.0 * SUM(CASE WHEN variant = 'B' THEN conversions END) / SUM(CASE WHEN variant = 'B' THEN visits END) AS b_rate
  FROM cells
  GROUP BY segment
)
SELECT segment,
  ROUND(100 * a_rate, 1) AS a_rate_pct,
  ROUND(100 * b_rate, 1) AS b_rate_pct,
  CASE WHEN a_rate > b_rate THEN 'A' WHEN b_rate > a_rate THEN 'B' ELSE 'tie' END AS better
FROM rates
ORDER BY segment = 'All devices', segment;
```

## Expected result

| segment | a_rate_pct | b_rate_pct | better |
| --- | --- | --- | --- |
| desktop | 20 | 22 | B |
| mobile | 5 | 6 | B |
| tablet | 10 | 10 | tie |
| All devices | 16.4 | 9.2 | A |

## Explanation

B converts better on desktop and on mobile, and ties on tablet, yet A wins overall. This is **Simpson's paradox**: A's traffic was mostly desktop, which converts well whatever the variant, while B's traffic was mostly mobile. The pooled rate mixes the variant's effect with the traffic mix.

The lesson for analysts is to check whether the groups being compared have the same make-up. Here the test was not randomised properly, and the honest conclusion is "B is better on every device; fix the traffic split and rerun", not "A won".

**Common mistake:** computing the overall rate as the average of the device rates. That treats 100 tablet visits as equal to 800 desktop visits and gives yet another, unweighted answer.

## Wrong answers

Feedback: incorrect-output

```sql
WITH test_results(variant, device, visits, conversions) AS ( VALUES ('A', 'desktop', 800, 160), ('A', 'mobile', 200, 10), ('A', 'tablet', 100, 10), ('B', 'desktop', 200, 44), ('B', 'mobile', 800, 48), ('B', 'tablet', 50, 5) ), device_rates AS (SELECT device AS segment, 1.0 * SUM(CASE WHEN variant = 'A' THEN conversions END) / SUM(CASE WHEN variant = 'A' THEN visits END) AS a_rate, 1.0 * SUM(CASE WHEN variant = 'B' THEN conversions END) / SUM(CASE WHEN variant = 'B' THEN visits END) AS b_rate FROM test_results GROUP BY device), rates AS (SELECT segment, a_rate, b_rate FROM device_rates UNION ALL SELECT 'All devices', AVG(a_rate), AVG(b_rate) FROM device_rates) SELECT segment, ROUND(100 * a_rate, 1) AS a_rate_pct, ROUND(100 * b_rate, 1) AS b_rate_pct, CASE WHEN a_rate > b_rate THEN 'A' WHEN b_rate > a_rate THEN 'B' ELSE 'tie' END AS better FROM rates ORDER BY segment = 'All devices', segment;
```
