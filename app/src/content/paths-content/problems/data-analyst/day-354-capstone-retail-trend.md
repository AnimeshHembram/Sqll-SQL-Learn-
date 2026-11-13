---
id: da-day-354
title: Capstone (retail) 4: which stores are growing?
order: 354
difficulty: advanced
topic: Capstone
summary: Fit a straight-line trend to each store's three months and classify the stores by slope.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Fit a least-squares slope per group
  - Classify trends relative to size
prerequisites:
  - Day 153
  - Day 228
---

## Task

Same chain. Fit a least-squares **trend line** to each store's monthly revenue, with months numbered 1 (January) to 3 (March): `slope = Σ((x − x̄)(y − ȳ)) / Σ((x − x̄)²)`. Return `store`, `jan`, `mar`, `slope_per_month` (rounded to 0 decimal places), `slope_pct` (slope ÷ average monthly revenue × 100, rounded to 1 decimal place) and `trend`: `'growing'` above +2%, `'declining'` below −2%, otherwise `'flat'`. Sort by `slope_pct` from highest.

## Starter query

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
)
SELECT store, month, revenue FROM sales ORDER BY store, month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Number the months: `CAST(SUBSTR(month, 6, 2) AS INTEGER)` is 1, 2 or 3 here. Per store, the means are `AVG(x)` and `AVG(revenue)`.
3. Join each row to its store's means and sum `(x - x̄) * (y - ȳ)` and `(x - x̄) * (x - x̄)`; their ratio is the slope. Pick January and March revenue with conditional `MAX`.

## Solution

```sql
WITH stores(store, city, opened, sq_ft) AS (
  VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500)
),
sales(store, month, revenue, transactions, staff_hours) AS (
  VALUES
    ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480),
    ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120),
    ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190),
    ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870)
),
points AS (
  SELECT store, CAST(SUBSTR(month, 6, 2) AS INTEGER) AS x, revenue AS y FROM sales
),
means AS (
  SELECT store, AVG(x) AS mx, AVG(y) AS my FROM points GROUP BY store
),
fits AS (
  SELECT p.store, m.my,
    SUM((p.x - m.mx) * (p.y - m.my)) / SUM((p.x - m.mx) * (p.x - m.mx)) AS slope,
    MAX(CASE WHEN p.x = 1 THEN p.y END) AS jan, MAX(CASE WHEN p.x = 3 THEN p.y END) AS mar
  FROM points AS p
  JOIN means AS m ON m.store = p.store
  GROUP BY p.store, m.my
)
SELECT store, jan, mar, ROUND(slope) AS slope_per_month, ROUND(100 * slope / my, 1) AS slope_pct,
  CASE WHEN 100 * slope / my > 2 THEN 'growing' WHEN 100 * slope / my < -2 THEN 'declining' ELSE 'flat' END AS trend
FROM fits
ORDER BY slope_pct DESC;
```

## Expected result

| store | jan | mar | slope_per_month | slope_pct | trend |
| --- | --- | --- | --- | --- | --- |
| S4 | 420000 | 640000 | 110000 | 21 | growing |
| S2 | 980000 | 1100000 | 60000 | 5.8 | growing |
| S1 | 1820000 | 1950000 | 65000 | 3.6 | growing |
| S3 | 1250000 | 1180000 | -35000 | -2.9 | declining |

## Explanation

A least-squares slope is the average monthly change that best fits all three months, not just the first and last. Dividing it by the store's average monthly revenue makes stores of different sizes comparable: S4 grows by about 110,000 a month, 21% of its average revenue, while S1 grows by 65,000, only 3.6% of its much larger base.

S3 is the one store in decline, losing about 35,000 a month (−2.9%). With only three months, a trend is fragile, and February is shorter than the other months, so a real analysis would use more months or revenue per trading day before acting.

**Common mistake:** dividing the slope by January's revenue instead of the average month. The base is then the smallest month for a growing store, so S4's growth rate inflates from 21% to 26.2% and the comparison tilts towards stores that started low.

## Wrong answers

Feedback: incorrect-output

```sql
WITH stores(store, city, opened, sq_ft) AS ( VALUES ('S1', 'Pune', '2021-04-01', 2400), ('S2', 'Pune', '2023-09-15', 1800), ('S3', 'Nagpur', '2022-01-10', 2000), ('S4', 'Nashik', '2024-11-01', 1500) ), sales(store, month, revenue, transactions, staff_hours) AS ( VALUES ('S1', '2025-01', 1820000, 6100, 1450), ('S1', '2025-02', 1700000, 5800, 1400), ('S1', '2025-03', 1950000, 6400, 1480), ('S2', '2025-01', 980000, 4200, 1100), ('S2', '2025-02', 1010000, 4300, 1080), ('S2', '2025-03', 1100000, 4500, 1120), ('S3', '2025-01', 1250000, 4900, 1200), ('S3', '2025-02', 1150000, 4500, 1210), ('S3', '2025-03', 1180000, 4600, 1190), ('S4', '2025-01', 420000, 2100, 900), ('S4', '2025-02', 510000, 2400, 880), ('S4', '2025-03', 640000, 2900, 870) ), points AS (SELECT store, CAST(SUBSTR(month, 6, 2) AS INTEGER) AS x, revenue AS y FROM sales), means AS (SELECT store, AVG(x) AS mx, AVG(y) AS my FROM points GROUP BY store), fits AS (SELECT p.store, MAX(CASE WHEN p.x = 1 THEN p.y END) AS my, SUM((p.x - m.mx) * (p.y - m.my)) / SUM((p.x - m.mx) * (p.x - m.mx)) AS slope, MAX(CASE WHEN p.x = 1 THEN p.y END) AS jan, MAX(CASE WHEN p.x = 3 THEN p.y END) AS mar FROM points AS p JOIN means AS m ON m.store = p.store GROUP BY p.store) SELECT store, jan, mar, ROUND(slope) AS slope_per_month, ROUND(100 * slope / my, 1) AS slope_pct, CASE WHEN 100 * slope / my > 2 THEN 'growing' WHEN 100 * slope / my < -2 THEN 'declining' ELSE 'flat' END AS trend FROM fits ORDER BY slope_pct DESC;
```
