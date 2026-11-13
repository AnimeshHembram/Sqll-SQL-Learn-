---
id: da-day-342
title: Did revenue per customer fall, or did the mix change?
order: 342
difficulty: advanced
topic: Reporting
summary: Split the change in average revenue per customer into a mix effect and a rate effect by region.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Decompose an average into mix and rate
  - Explain a Simpson's-paradox style change
prerequisites:
  - Day 154
  - Day 183
---

## Task

Average revenue per customer fell from last year to this year (starter query), yet it rose or held in **every** region. The explanation is **mix**: more customers now come from the low-value South. Decompose the change in the overall average:

- for each region, `mix_effect = (share_now − share_before) × rate_before` and `rate_effect = (rate_now − rate_before) × share_now`, where `share` is the region's share of customers and `rate` its revenue per customer,
- the two effects summed over regions equal the change in the overall average exactly.

Return one row per region (`region`, `rate_before`, `rate_now`, `share_before_pct`, `share_now_pct`, `mix_effect`, `rate_effect`) and a final row `'Total'` with the overall rates in the rate columns, `NULL` shares, and the summed effects. Round rates and effects to 2 decimal places and shares to 1. Sort regions alphabetically, with `'Total'` last.

## Starter query

```sql
WITH region_sales(region, period, customers, revenue) AS (
  VALUES
    ('North', 'last_year', 800, 400000), ('North', 'this_year', 700, 385000),
    ('South', 'last_year', 600, 180000), ('South', 'this_year', 900, 279000),
    ('West', 'last_year', 600, 240000), ('West', 'this_year', 600, 246000)
)
SELECT region, period, customers, revenue
FROM region_sales
ORDER BY region, period;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Pivot each region's two periods side by side, then compute shares with `1.0 * customers / SUM(customers) OVER ()` for each period and rates as revenue ÷ customers.
3. The `'Total'` row's rates are total revenue ÷ total customers per period; its effects are the sums of the regional effects. Check that they add up to the difference of the two overall rates.

## Solution

```sql
WITH region_sales(region, period, customers, revenue) AS (
  VALUES
    ('North', 'last_year', 800, 400000), ('North', 'this_year', 700, 385000),
    ('South', 'last_year', 600, 180000), ('South', 'this_year', 900, 279000),
    ('West', 'last_year', 600, 240000), ('West', 'this_year', 600, 246000)
),
pivoted AS (
  SELECT region,
    MAX(CASE WHEN period = 'last_year' THEN customers END) AS c0, MAX(CASE WHEN period = 'last_year' THEN revenue END) AS r0,
    MAX(CASE WHEN period = 'this_year' THEN customers END) AS c1, MAX(CASE WHEN period = 'this_year' THEN revenue END) AS r1
  FROM region_sales
  GROUP BY region
),
parts AS (
  SELECT region, 1.0 * r0 / c0 AS rate0, 1.0 * r1 / c1 AS rate1,
    1.0 * c0 / SUM(c0) OVER () AS share0, 1.0 * c1 / SUM(c1) OVER () AS share1
  FROM pivoted
),
effects AS (
  SELECT region, rate0, rate1, share0, share1, (share1 - share0) * rate0 AS mix, (rate1 - rate0) * share1 AS rate_eff FROM parts
)
SELECT region, rate_before, rate_now, share_before_pct, share_now_pct, mix_effect, rate_effect FROM (
  SELECT 0 AS sort_key, region, ROUND(rate0, 2) AS rate_before, ROUND(rate1, 2) AS rate_now,
    ROUND(100 * share0, 1) AS share_before_pct, ROUND(100 * share1, 1) AS share_now_pct, ROUND(mix, 2) AS mix_effect, ROUND(rate_eff, 2) AS rate_effect
  FROM effects
  UNION ALL
  SELECT 1, 'Total',
    ROUND((SELECT 1.0 * SUM(r0) / SUM(c0) FROM pivoted), 2), ROUND((SELECT 1.0 * SUM(r1) / SUM(c1) FROM pivoted), 2),
    NULL, NULL, ROUND(SUM(mix), 2), ROUND(SUM(rate_eff), 2)
  FROM effects
)
ORDER BY sort_key, region;
```

## Expected result

| region | rate_before | rate_now | share_before_pct | share_now_pct | mix_effect | rate_effect |
| --- | --- | --- | --- | --- | --- | --- |
| North | 500 | 550 | 40 | 31.8 | -40.91 | 15.91 |
| South | 300 | 310 | 30 | 40.9 | 32.73 | 4.09 |
| West | 400 | 410 | 30 | 27.3 | -10.91 | 2.73 |
| Total | 410 | 413.64 | NULL | NULL | -19.09 | 22.73 |

## Explanation

This is Simpson's paradox in a revenue report. Revenue per customer rose in every region, yet the overall average went from 410 to 413.64, far less than any region's own improvement, because the customer mix shifted towards the South, the lowest-value region (from 30% to 40.9% of customers).

The decomposition puts numbers on it: the shift in mix cost 19.09 per customer, while better rates within regions added 22.73; together they give the overall change of 3.64 exactly. North's mix effect is the largest (−40.91), because the highest-value region lost share. Managers reading only the total would miss both stories.

**Common mistake:** using the new rate in the mix effect. The two effects then no longer add up to the actual change, and the gap is silently counted twice or not at all.

## Wrong answers

Feedback: incorrect-output

```sql
WITH region_sales(region, period, customers, revenue) AS ( VALUES ('North', 'last_year', 800, 400000), ('North', 'this_year', 700, 385000), ('South', 'last_year', 600, 180000), ('South', 'this_year', 900, 279000), ('West', 'last_year', 600, 240000), ('West', 'this_year', 600, 246000) ), pivoted AS (SELECT region, MAX(CASE WHEN period = 'last_year' THEN customers END) AS c0, MAX(CASE WHEN period = 'last_year' THEN revenue END) AS r0, MAX(CASE WHEN period = 'this_year' THEN customers END) AS c1, MAX(CASE WHEN period = 'this_year' THEN revenue END) AS r1 FROM region_sales GROUP BY region), parts AS (SELECT region, 1.0 * r0 / c0 AS rate0, 1.0 * r1 / c1 AS rate1, 1.0 * c0 / SUM(c0) OVER () AS share0, 1.0 * c1 / SUM(c1) OVER () AS share1 FROM pivoted), effects AS (SELECT region, rate0, rate1, share0, share1, (share1 - share0) * rate1 AS mix, (rate1 - rate0) * share1 AS rate_eff FROM parts) SELECT region, rate_before, rate_now, share_before_pct, share_now_pct, mix_effect, rate_effect FROM (SELECT 0 AS sort_key, region, ROUND(rate0, 2) AS rate_before, ROUND(rate1, 2) AS rate_now, ROUND(100 * share0, 1) AS share_before_pct, ROUND(100 * share1, 1) AS share_now_pct, ROUND(mix, 2) AS mix_effect, ROUND(rate_eff, 2) AS rate_effect FROM effects UNION ALL SELECT 1, 'Total', ROUND((SELECT 1.0 * SUM(r0) / SUM(c0) FROM pivoted), 2), ROUND((SELECT 1.0 * SUM(r1) / SUM(c1) FROM pivoted), 2), NULL, NULL, ROUND(SUM(mix), 2), ROUND(SUM(rate_eff), 2) FROM effects) ORDER BY sort_key, region;
```
