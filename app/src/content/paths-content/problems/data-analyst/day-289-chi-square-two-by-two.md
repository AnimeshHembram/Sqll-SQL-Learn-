---
id: da-day-289
title: Is renewal related to device? A chi-square test
order: 289
difficulty: advanced
topic: Statistics
summary: Build a 2×2 table of observed counts, compute expected counts and the chi-square statistic.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute expected counts from margins
  - Run a chi-square test in SQL
prerequisites:
  - Day 154
  - Day 287
---

## Task

A survey (starter query) records each respondent's device and whether they renewed. Test whether renewal depends on device:

1. Count the **observed** respondents in each of the four combinations of device and renewed.
2. The **expected** count for a cell, if the two were unrelated, is `row_total × column_total / grand_total`.
3. Each cell contributes `(observed − expected)² / expected`; the **chi-square** statistic is their sum. With one degree of freedom, a value above 3.84 is significant at the 5% level.

Return one row per cell (`device`, `renewed`, `observed`, `expected`, `contribution`) and a final row `device` = `'chi-square'` with the statistic in `contribution` and `renewed` = `'significant'` or `'not significant'` (other columns `NULL`). Round expected and contributions to 2 decimal places. Sort cells by `device`, then `renewed`, with the statistic last.

## Starter query

```sql
WITH survey(respondent, device, renewed) AS (
  VALUES
    (1, 'mobile', 'yes'), (2, 'mobile', 'no'), (3, 'mobile', 'no'), (4, 'mobile', 'yes'), (5, 'mobile', 'no'),
    (6, 'mobile', 'no'), (7, 'mobile', 'no'), (8, 'mobile', 'yes'), (9, 'mobile', 'no'), (10, 'mobile', 'no'),
    (11, 'desktop', 'yes'), (12, 'desktop', 'yes'), (13, 'desktop', 'no'), (14, 'desktop', 'yes'), (15, 'desktop', 'yes'),
    (16, 'desktop', 'yes'), (17, 'desktop', 'no'), (18, 'desktop', 'yes'), (19, 'desktop', 'yes'), (20, 'desktop', 'yes')
)
SELECT device, renewed, COUNT(*) AS respondents
FROM survey
GROUP BY device, renewed;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Observed counts: `GROUP BY device, renewed`. Row totals are `SUM(COUNT(*)) OVER (PARTITION BY device)`, column totals `SUM(COUNT(*)) OVER (PARTITION BY renewed)` and the grand total `SUM(COUNT(*)) OVER ()`.
3. Compute expected and contributions in a CTE, then add the statistic with `UNION ALL`, labelling it with `CASE WHEN SUM(contribution) > 3.84 ...`.

## Solution

```sql
WITH survey(respondent, device, renewed) AS (
  VALUES
    (1, 'mobile', 'yes'), (2, 'mobile', 'no'), (3, 'mobile', 'no'), (4, 'mobile', 'yes'), (5, 'mobile', 'no'),
    (6, 'mobile', 'no'), (7, 'mobile', 'no'), (8, 'mobile', 'yes'), (9, 'mobile', 'no'), (10, 'mobile', 'no'),
    (11, 'desktop', 'yes'), (12, 'desktop', 'yes'), (13, 'desktop', 'no'), (14, 'desktop', 'yes'), (15, 'desktop', 'yes'),
    (16, 'desktop', 'yes'), (17, 'desktop', 'no'), (18, 'desktop', 'yes'), (19, 'desktop', 'yes'), (20, 'desktop', 'yes')
),
observed AS (
  SELECT device, renewed, COUNT(*) AS observed,
    1.0 * SUM(COUNT(*)) OVER (PARTITION BY device) * SUM(COUNT(*)) OVER (PARTITION BY renewed) / SUM(COUNT(*)) OVER () AS expected
  FROM survey
  GROUP BY device, renewed
),
cells AS (
  SELECT device, renewed, observed, expected, (observed - expected) * (observed - expected) / expected AS contribution FROM observed
)
SELECT device, renewed, observed, expected, contribution FROM (
  SELECT 0 AS sort_key, device, renewed, observed, ROUND(expected, 2) AS expected, ROUND(contribution, 2) AS contribution FROM cells
  UNION ALL
  SELECT 1, 'chi-square', CASE WHEN SUM(contribution) > 3.84 THEN 'significant' ELSE 'not significant' END, NULL, NULL, ROUND(SUM(contribution), 2) FROM cells
)
ORDER BY sort_key, device, renewed;
```

## Expected result

| device | renewed | observed | expected | contribution |
| --- | --- | --- | --- | --- |
| desktop | no | 2 | 4.5 | 1.39 |
| desktop | yes | 8 | 5.5 | 1.14 |
| mobile | no | 7 | 4.5 | 1.39 |
| mobile | yes | 3 | 5.5 | 1.14 |
| chi-square | significant | NULL | NULL | 5.05 |

## Explanation

The chi-square test asks whether two categories are related by comparing what was observed with what independence would predict. Half the respondents are on desktop and 11 of 20 renewed, so if device did not matter, we would expect 5.5 renewals among the 10 desktop users. In fact 8 renewed, and only 3 mobile users did.

Window functions over the grouped counts give the row totals, column totals and grand total in one pass, from which each cell's expected count follows. The four contributions add up to 5.05, above the 3.84 threshold for one degree of freedom, so the difference is significant at the 5% level. With expected counts as small as 4.5, a statistician might prefer an exact test, but the conclusion here is the same.

**Common mistake:** assuming every cell should hold a quarter of the respondents. Expected counts must come from the margins: here 11 renewed and 9 did not, so the four cells are not equally likely even without any relationship.

## Wrong answers

Feedback: incorrect-output

```sql
WITH survey(respondent, device, renewed) AS ( VALUES (1, 'mobile', 'yes'), (2, 'mobile', 'no'), (3, 'mobile', 'no'), (4, 'mobile', 'yes'), (5, 'mobile', 'no'), (6, 'mobile', 'no'), (7, 'mobile', 'no'), (8, 'mobile', 'yes'), (9, 'mobile', 'no'), (10, 'mobile', 'no'), (11, 'desktop', 'yes'), (12, 'desktop', 'yes'), (13, 'desktop', 'no'), (14, 'desktop', 'yes'), (15, 'desktop', 'yes'), (16, 'desktop', 'yes'), (17, 'desktop', 'no'), (18, 'desktop', 'yes'), (19, 'desktop', 'yes'), (20, 'desktop', 'yes') ), observed AS (SELECT device, renewed, COUNT(*) AS observed, SUM(COUNT(*)) OVER () / 4.0 AS expected FROM survey GROUP BY device, renewed), cells AS (SELECT device, renewed, observed, expected, (observed - expected) * (observed - expected) / expected AS contribution FROM observed) SELECT device, renewed, observed, expected, contribution FROM (SELECT 0 AS sort_key, device, renewed, observed, ROUND(expected, 2) AS expected, ROUND(contribution, 2) AS contribution FROM cells UNION ALL SELECT 1, 'chi-square', CASE WHEN SUM(contribution) > 3.84 THEN 'significant' ELSE 'not significant' END, NULL, NULL, ROUND(SUM(contribution), 2) FROM cells) ORDER BY sort_key, device, renewed;
```
