---
id: da-day-303
title: Measure a campaign with a regional test
order: 303
difficulty: advanced
topic: Marketing analytics
summary: Estimate what test regions would have sold without the campaign from control regions' growth, and the return on cost.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: false
checkColumnNames: true
objectives:
  - Build a counterfactual from a control group
  - Measure incremental return
prerequisites:
  - Day 193
  - Day 244
---

## Task

A campaign ran only in the **test** regions (starter query). To estimate its effect, predict what the test regions would have sold anyway by applying the **control regions' growth** (post ÷ pre, using only control regions with both periods) to the test regions' pre-period sales.

Return one row with `test_pre`, `test_post`, `control_growth_pct` ((growth − 1) × 100, rounded to 1 decimal place), `expected_post` (test pre × growth), `incremental_sales` (test post − expected post), `lift_pct` (incremental ÷ expected × 100, rounded to 1 decimal place) and `return_on_cost` (incremental ÷ campaign cost, rounded to 2 decimal places). Round sales to 2 decimal places.

## Starter query

```sql
WITH regional_sales(region, grp, period, sales) AS (
  VALUES
    ('Pune', 'test', 'pre', 1000), ('Pune', 'test', 'post', 1250),
    ('Jaipur', 'test', 'pre', 800), ('Jaipur', 'test', 'post', 980),
    ('Indore', 'control', 'pre', 900), ('Indore', 'control', 'post', 990),
    ('Kochi', 'control', 'pre', 700), ('Kochi', 'control', 'post', 756),
    ('Nagpur', 'control', 'pre', 600), ('Nagpur', 'control', 'post', NULL)
),
campaign(grp, cost) AS (
  VALUES ('test', 150)
)
SELECT region, grp, period, sales
FROM regional_sales
ORDER BY grp, region, period;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pivot pre and post per region with conditional `MAX`, and keep only regions with both (a control region missing its post figure must not count in either total).
3. Total each group's pre and post. Control growth is `1.0 * control_post / control_pre`; the rest follows from the formulas.

## Solution

```sql
WITH regional_sales(region, grp, period, sales) AS (
  VALUES
    ('Pune', 'test', 'pre', 1000), ('Pune', 'test', 'post', 1250),
    ('Jaipur', 'test', 'pre', 800), ('Jaipur', 'test', 'post', 980),
    ('Indore', 'control', 'pre', 900), ('Indore', 'control', 'post', 990),
    ('Kochi', 'control', 'pre', 700), ('Kochi', 'control', 'post', 756),
    ('Nagpur', 'control', 'pre', 600), ('Nagpur', 'control', 'post', NULL)
),
campaign(grp, cost) AS (
  VALUES ('test', 150)
),
per_region AS (
  SELECT region, grp,
    MAX(CASE WHEN period = 'pre' THEN sales END) AS pre,
    MAX(CASE WHEN period = 'post' THEN sales END) AS post
  FROM regional_sales
  GROUP BY region, grp
),
totals AS (
  SELECT
    SUM(CASE WHEN grp = 'test' THEN pre END) AS test_pre,
    SUM(CASE WHEN grp = 'test' THEN post END) AS test_post,
    1.0 * SUM(CASE WHEN grp = 'control' THEN post END) / SUM(CASE WHEN grp = 'control' THEN pre END) AS growth
  FROM per_region
  WHERE pre IS NOT NULL AND post IS NOT NULL
)
SELECT test_pre, test_post, ROUND(100 * (growth - 1), 1) AS control_growth_pct, ROUND(test_pre * growth, 2) AS expected_post,
  ROUND(test_post - test_pre * growth, 2) AS incremental_sales,
  ROUND(100 * (test_post - test_pre * growth) / (test_pre * growth), 1) AS lift_pct,
  ROUND((test_post - test_pre * growth) / (SELECT cost FROM campaign WHERE grp = 'test'), 2) AS return_on_cost
FROM totals;
```

## Expected result

| test_pre | test_post | control_growth_pct | expected_post | incremental_sales | lift_pct | return_on_cost |
| --- | --- | --- | --- | --- | --- | --- |
| 1800 | 2230 | 9.1 | 1964.25 | 265.75 | 13.5 | 1.77 |

## Explanation

A regional test estimates what would have happened without the campaign by looking at regions that did not get it. Control regions grew 9.1% on their own, so the test regions' 1,800 of pre-period sales would have become about 1,964 anyway; they actually reached 2,230, an incremental 265.75 (13.5%). Against a campaign cost of 150, that is a return of 1.77 times the cost.

Nagpur is a control region without a post-period figure, so it must be left out of **both** control totals: keeping its pre-period sales would make the control group look like it shrank. Pivoting each region's two periods first and keeping only complete regions handles this cleanly.

**Common mistake:** comparing test regions' growth with nothing. Without the control group the full 23.9% growth is credited to the campaign, including the 9.1% that happened everywhere.

## Wrong answers

Feedback: incorrect-output

```sql
WITH regional_sales(region, grp, period, sales) AS ( VALUES ('Pune', 'test', 'pre', 1000), ('Pune', 'test', 'post', 1250), ('Jaipur', 'test', 'pre', 800), ('Jaipur', 'test', 'post', 980), ('Indore', 'control', 'pre', 900), ('Indore', 'control', 'post', 990), ('Kochi', 'control', 'pre', 700), ('Kochi', 'control', 'post', 756), ('Nagpur', 'control', 'pre', 600), ('Nagpur', 'control', 'post', NULL) ), campaign(grp, cost) AS ( VALUES ('test', 150) ), totals AS (SELECT SUM(CASE WHEN grp = 'test' AND period = 'pre' THEN sales END) AS test_pre, SUM(CASE WHEN grp = 'test' AND period = 'post' THEN sales END) AS test_post, 1.0 * SUM(CASE WHEN grp = 'control' AND period = 'post' THEN sales END) / SUM(CASE WHEN grp = 'control' AND period = 'pre' THEN sales END) AS growth FROM regional_sales) SELECT test_pre, test_post, ROUND(100 * (growth - 1), 1) AS control_growth_pct, ROUND(test_pre * growth, 2) AS expected_post, ROUND(test_post - test_pre * growth, 2) AS incremental_sales, ROUND(100 * (test_post - test_pre * growth) / (test_pre * growth), 1) AS lift_pct, ROUND((test_post - test_pre * growth) / (SELECT cost FROM campaign WHERE grp = 'test'), 2) AS return_on_cost FROM totals;
```

Feedback: incorrect-output

```sql
WITH regional_sales(region, grp, period, sales) AS ( VALUES ('Pune', 'test', 'pre', 1000), ('Pune', 'test', 'post', 1250), ('Jaipur', 'test', 'pre', 800), ('Jaipur', 'test', 'post', 980), ('Indore', 'control', 'pre', 900), ('Indore', 'control', 'post', 990), ('Kochi', 'control', 'pre', 700), ('Kochi', 'control', 'post', 756), ('Nagpur', 'control', 'pre', 600), ('Nagpur', 'control', 'post', NULL) ), campaign(grp, cost) AS ( VALUES ('test', 150) ), per_region AS (SELECT region, grp, MAX(CASE WHEN period = 'pre' THEN sales END) AS pre, MAX(CASE WHEN period = 'post' THEN sales END) AS post FROM regional_sales GROUP BY region, grp), totals AS (SELECT SUM(CASE WHEN grp = 'test' THEN pre END) AS test_pre, SUM(CASE WHEN grp = 'test' THEN post END) AS test_post, 1.0 AS growth FROM per_region WHERE pre IS NOT NULL AND post IS NOT NULL) SELECT test_pre, test_post, ROUND(100 * (growth - 1), 1) AS control_growth_pct, ROUND(test_pre * growth, 2) AS expected_post, ROUND(test_post - test_pre * growth, 2) AS incremental_sales, ROUND(100 * (test_post - test_pre * growth) / (test_pre * growth), 1) AS lift_pct, ROUND((test_post - test_pre * growth) / (SELECT cost FROM campaign WHERE grp = 'test'), 2) AS return_on_cost FROM totals;
```
