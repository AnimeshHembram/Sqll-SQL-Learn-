---
id: da-day-192
title: Check the traffic split before trusting a test
order: 192
difficulty: advanced
topic: Experimentation
summary: Detect sample ratio mismatch with a chi-square statistic per day, skipping days with no traffic.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Detect sample ratio mismatch with chi-square
  - Treat empty days as no data
prerequisites:
  - Day 191
  - Day 112
---

## Task

An experiment should split users 50/50 (daily assignments in the starter query). For each day, compute the **chi-square statistic** for a 50/50 split: with `n = control + treatment` and expected `e = n / 2` per group,

`chi2 = (control − e)² / e + (treatment − e)² / e`.

Values above **3.84** mean the split is unlikely to be fair (sample ratio mismatch at the 5% level). Return `day`, `users`, `treatment_share_pct` (rounded to 1 decimal place), `chi2` (rounded to 2 decimal places) and `srm` (`'yes'`/`'no'`). Days with no users have no statistic: `NULL` share and chi2, and `srm` `'no data'`. Sort by `day`.

## Starter query

```sql
WITH assignments(day, control, treatment) AS (
  VALUES
    ('2025-03-01', 500, 510), ('2025-03-02', 480, 470), ('2025-03-03', 520, 600),
    ('2025-03-04', 505, 495), ('2025-03-05', 300, 380), ('2025-03-06', 0, 0)
)
SELECT day, control, treatment, control + treatment AS users
FROM assignments
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Compute `n` and `e = n / 2.0` in a CTE. Only calculate when `n > 0`: `CASE WHEN n > 0 THEN ... END`.
3. `chi2 = (control - e) * (control - e) / e + (treatment - e) * (treatment - e) / e`; then `CASE WHEN n = 0 THEN 'no data' WHEN chi2 > 3.84 THEN 'yes' ELSE 'no' END`.

## Solution

```sql
WITH assignments(day, control, treatment) AS (
  VALUES
    ('2025-03-01', 500, 510), ('2025-03-02', 480, 470), ('2025-03-03', 520, 600),
    ('2025-03-04', 505, 495), ('2025-03-05', 300, 380), ('2025-03-06', 0, 0)
),
counts AS (
  SELECT day, control, treatment, control + treatment AS n, (control + treatment) / 2.0 AS e FROM assignments
),
scored AS (
  SELECT day, n, treatment,
    CASE WHEN n > 0 THEN (control - e) * (control - e) / e + (treatment - e) * (treatment - e) / e END AS chi2
  FROM counts
)
SELECT day, n AS users,
  CASE WHEN n > 0 THEN ROUND(100.0 * treatment / n, 1) END AS treatment_share_pct,
  ROUND(chi2, 2) AS chi2,
  CASE WHEN n = 0 THEN 'no data' WHEN chi2 > 3.84 THEN 'yes' ELSE 'no' END AS srm
FROM scored
ORDER BY day;
```

## Expected result

| day | users | treatment_share_pct | chi2 | srm |
| --- | --- | --- | --- | --- |
| 2025-03-01 | 1010 | 50.5 | 0.1 | no |
| 2025-03-02 | 950 | 49.5 | 0.11 | no |
| 2025-03-03 | 1120 | 53.6 | 5.71 | yes |
| 2025-03-04 | 1000 | 49.5 | 0.1 | no |
| 2025-03-05 | 680 | 55.9 | 9.41 | yes |
| 2025-03-06 | 0 | NULL | NULL | no data |

## Explanation

A sample ratio mismatch (SRM) means the experiment is not assigning users the way it was designed to, usually because of a bug (a redirect that drops some users, a bot filter applied to one group). When the split is broken, the results cannot be trusted however good they look, so SRM checks come **before** reading any metric.

3 March's 53.6% treatment share looks harmless, but with 1,120 users a fair coin almost never lands that far off (chi2 5.71). 5 March is worse. The other days are within normal variation. The quiet day with no traffic has nothing to test, which is different from passing the test.

**Common mistake:** eyeballing the percentages. A 53/47 split is fine on 100 users and alarming on 1,000; the chi-square statistic accounts for the sample size.

## Wrong answers

Feedback: incorrect-output

```sql
WITH assignments(day, control, treatment) AS ( VALUES ('2025-03-01', 500, 510), ('2025-03-02', 480, 470), ('2025-03-03', 520, 600), ('2025-03-04', 505, 495), ('2025-03-05', 300, 380), ('2025-03-06', 0, 0) ) SELECT day, control + treatment AS users, CASE WHEN control + treatment > 0 THEN ROUND(100.0 * treatment / (control + treatment), 1) END AS treatment_share_pct, NULL AS chi2, CASE WHEN control + treatment = 0 THEN 'no data' WHEN ABS(100.0 * treatment / (control + treatment) - 50) > 5 THEN 'yes' ELSE 'no' END AS srm FROM assignments ORDER BY day;
```
