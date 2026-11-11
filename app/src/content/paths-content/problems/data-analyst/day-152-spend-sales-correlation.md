---
id: da-day-152
title: Does ad spend move with sales?
order: 152
difficulty: advanced
topic: Statistics
summary: Compute the Pearson correlation coefficient from sums, using only complete pairs and guarding against zero variance.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a correlation coefficient from sums
  - Use only complete pairs and handle zero variance
prerequisites:
  - Day 143
  - Day 135
---

## Task

For each region (in the starter query), measure how closely weekly `sales` follow `ad_spend` with the **Pearson correlation coefficient**:

`r = (n·Σxy − Σx·Σy) / sqrt((n·Σx² − (Σx)²) · (n·Σy² − (Σy)²))`

where `x` is ad spend, `y` is sales and `n` is the number of weeks where **both** are known. If either variance is zero, `r` is undefined (`NULL`).

Return `region`, `weeks` (pairs used), `correlation` (rounded to 3 decimal places) and `strength`: `'strong'` when `|r| ≥ 0.7`, `'moderate'` when `|r| ≥ 0.3`, `'weak'` otherwise, and `'undefined'` when `r` is `NULL`. Sort by `region`.

## Starter query

```sql
WITH weekly(region, week, ad_spend, sales) AS (
  VALUES
    ('A', 1, 10, 100), ('A', 2, 20, 180), ('A', 3, 30, 310), ('A', 4, 40, 390), ('A', 5, NULL, 500),
    ('B', 1, 10, 300), ('B', 2, 20, 250), ('B', 3, 30, 260), ('B', 4, 40, 200),
    ('C', 1, 15, 200), ('C', 2, 15, 220), ('C', 3, 15, 180),
    ('D', 1, 5, 50), ('D', 2, 10, 40), ('D', 3, 15, 60), ('D', 4, 20, 45)
)
SELECT region, week, ad_spend, sales
FROM weekly
ORDER BY region, week;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Keep complete pairs only: `WHERE ad_spend IS NOT NULL AND sales IS NOT NULL`. Then per region compute `COUNT(*)`, `SUM(x)`, `SUM(y)`, `SUM(x * y)`, `SUM(x * x)` and `SUM(y * y)`, using `1.0 *` to avoid whole-number arithmetic.
3. In an outer query, compute the denominator first and return `NULL` when it is 0: `CASE WHEN den > 0 THEN num / sqrt(den) END`. Label with `ABS(r)`.

## Solution

```sql
WITH weekly(region, week, ad_spend, sales) AS (
  VALUES
    ('A', 1, 10, 100), ('A', 2, 20, 180), ('A', 3, 30, 310), ('A', 4, 40, 390), ('A', 5, NULL, 500),
    ('B', 1, 10, 300), ('B', 2, 20, 250), ('B', 3, 30, 260), ('B', 4, 40, 200),
    ('C', 1, 15, 200), ('C', 2, 15, 220), ('C', 3, 15, 180),
    ('D', 1, 5, 50), ('D', 2, 10, 40), ('D', 3, 15, 60), ('D', 4, 20, 45)
),
sums AS (
  SELECT region, COUNT(*) AS n,
    SUM(1.0 * ad_spend) AS sx, SUM(1.0 * sales) AS sy,
    SUM(1.0 * ad_spend * sales) AS sxy, SUM(1.0 * ad_spend * ad_spend) AS sxx, SUM(1.0 * sales * sales) AS syy
  FROM weekly
  WHERE ad_spend IS NOT NULL AND sales IS NOT NULL
  GROUP BY region
),
coefficients AS (
  SELECT region, n,
    CASE WHEN (n * sxx - sx * sx) * (n * syy - sy * sy) > 0
      THEN (n * sxy - sx * sy) / sqrt((n * sxx - sx * sx) * (n * syy - sy * sy))
    END AS r
  FROM sums
)
SELECT region, n AS weeks, ROUND(r, 3) AS correlation,
  CASE
    WHEN r IS NULL THEN 'undefined'
    WHEN ABS(r) >= 0.7 THEN 'strong'
    WHEN ABS(r) >= 0.3 THEN 'moderate'
    ELSE 'weak'
  END AS strength
FROM coefficients
ORDER BY region;
```

## Expected result

| region | weeks | correlation | strength |
| --- | --- | --- | --- |
| A | 4 | 0.995 | strong |
| B | 4 | -0.91 | strong |
| C | 3 | NULL | undefined |
| D | 4 | 0.076 | weak |

## Explanation

The correlation coefficient runs from −1 (perfectly opposite) to +1 (perfectly together). Region A is almost a straight line (0.995). Region B is strongly **negative**: more spend, lower sales, which is worth investigating rather than celebrating. Region D's points barely line up.

Region C spent the same 15 every week. With no variation in spend, there is nothing to correlate, and dividing by zero would be meaningless, so the result is `NULL` and labelled `'undefined'`.

Region A's fifth week has sales but no spend figure. A pair needs both values, so that week is dropped from every sum and from `n`.

**Common mistake:** counting all rows for `n` while the sums skip `NULL`s (`SUM` ignores them silently), which mixes four weeks of sums with a count of five. Remember too that correlation is not causation: a seasonal peak can drive both spend and sales.

## Wrong answers

Feedback: incorrect-output

```sql
WITH weekly(region, week, ad_spend, sales) AS ( VALUES ('A', 1, 10, 100), ('A', 2, 20, 180), ('A', 3, 30, 310), ('A', 4, 40, 390), ('A', 5, NULL, 500), ('B', 1, 10, 300), ('B', 2, 20, 250), ('B', 3, 30, 260), ('B', 4, 40, 200), ('C', 1, 15, 200), ('C', 2, 15, 220), ('C', 3, 15, 180), ('D', 1, 5, 50), ('D', 2, 10, 40), ('D', 3, 15, 60), ('D', 4, 20, 45) ), sums AS (SELECT region, COUNT(*) AS n, SUM(1.0 * ad_spend) AS sx, SUM(1.0 * sales) AS sy, SUM(1.0 * ad_spend * sales) AS sxy, SUM(1.0 * ad_spend * ad_spend) AS sxx, SUM(1.0 * sales * sales) AS syy FROM weekly GROUP BY region), coefficients AS (SELECT region, n, CASE WHEN (n * sxx - sx * sx) * (n * syy - sy * sy) > 0 THEN (n * sxy - sx * sy) / sqrt((n * sxx - sx * sx) * (n * syy - sy * sy)) END AS r FROM sums) SELECT region, n AS weeks, ROUND(r, 3) AS correlation, CASE WHEN r IS NULL THEN 'undefined' WHEN ABS(r) >= 0.7 THEN 'strong' WHEN ABS(r) >= 0.3 THEN 'moderate' ELSE 'weak' END AS strength FROM coefficients ORDER BY region;
```
