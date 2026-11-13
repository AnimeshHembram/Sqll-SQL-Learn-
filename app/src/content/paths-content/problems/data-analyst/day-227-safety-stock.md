---
id: da-day-227
title: Safety stock and reorder points
order: 227
difficulty: advanced
topic: Forecasting and planning
summary: Turn demand variability and lead time into a reorder point, and flag what to reorder now.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a sample standard deviation
  - Turn variability into a reorder point
prerequisites:
  - Day 117
  - Day 143
---

## Task

For each SKU, six days of demand and its supplier lead time and stock on hand are in the starter query. Using the sample standard deviation of daily demand (divide by `n − 1`):

- `safety_stock = 1.65 × sd_daily × √lead_time_days` (about a 95% service level),
- `reorder_point = avg_daily × lead_time_days + safety_stock`,
- `action`: `'reorder'` when `on_hand` is at or below the reorder point, otherwise `'ok'`.

Return `sku`, `avg_daily`, `sd_daily`, `safety_stock`, `reorder_point` (all rounded to 1 decimal place), `on_hand` and `action`. Sort by `sku`.

## Starter query

```sql
WITH daily_demand(sku, day, units) AS (
  VALUES
    ('A1', 1, 20), ('A1', 2, 22), ('A1', 3, 18), ('A1', 4, 21), ('A1', 5, 19), ('A1', 6, 20),
    ('B2', 1, 5), ('B2', 2, 15), ('B2', 3, 0), ('B2', 4, 12), ('B2', 5, 3), ('B2', 6, 13),
    ('C3', 1, 8), ('C3', 2, 8), ('C3', 3, 9), ('C3', 4, 7), ('C3', 5, 8), ('C3', 6, 8)
),
stock(sku, lead_time_days, on_hand) AS (
  VALUES ('A1', 4, 100), ('B2', 9, 120), ('C3', 4, 30)
)
SELECT d.sku, d.day, d.units, s.lead_time_days, s.on_hand
FROM daily_demand AS d
JOIN stock AS s ON s.sku = d.sku
ORDER BY d.sku, d.day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Average first in one CTE (`AVG(units)` per SKU), then the variance in another: `SUM((units - avg) * (units - avg)) / (COUNT(*) - 1)`, joining each day to its SKU's average. `SQRT` gives the standard deviation.
3. Join `stock` for the lead time, compute safety stock and reorder point on the unrounded values, and compare `on_hand <= reorder_point` before rounding for display.

## Solution

```sql
WITH daily_demand(sku, day, units) AS (
  VALUES
    ('A1', 1, 20), ('A1', 2, 22), ('A1', 3, 18), ('A1', 4, 21), ('A1', 5, 19), ('A1', 6, 20),
    ('B2', 1, 5), ('B2', 2, 15), ('B2', 3, 0), ('B2', 4, 12), ('B2', 5, 3), ('B2', 6, 13),
    ('C3', 1, 8), ('C3', 2, 8), ('C3', 3, 9), ('C3', 4, 7), ('C3', 5, 8), ('C3', 6, 8)
),
stock(sku, lead_time_days, on_hand) AS (
  VALUES ('A1', 4, 100), ('B2', 9, 120), ('C3', 4, 30)
),
avgs AS (
  SELECT sku, AVG(units) AS avg_daily FROM daily_demand GROUP BY sku
),
sds AS (
  SELECT d.sku, SQRT(SUM((d.units - a.avg_daily) * (d.units - a.avg_daily)) / (COUNT(*) - 1)) AS sd_daily
  FROM daily_demand AS d
  JOIN avgs AS a ON a.sku = d.sku
  GROUP BY d.sku
),
plan AS (
  SELECT s.sku, a.avg_daily, d.sd_daily, s.on_hand,
    1.65 * d.sd_daily * SQRT(s.lead_time_days) AS safety_stock,
    a.avg_daily * s.lead_time_days + 1.65 * d.sd_daily * SQRT(s.lead_time_days) AS reorder_point
  FROM stock AS s
  JOIN avgs AS a ON a.sku = s.sku
  JOIN sds AS d ON d.sku = s.sku
)
SELECT sku, ROUND(avg_daily, 1) AS avg_daily, ROUND(sd_daily, 1) AS sd_daily, ROUND(safety_stock, 1) AS safety_stock,
  ROUND(reorder_point, 1) AS reorder_point, on_hand,
  CASE WHEN on_hand <= reorder_point THEN 'reorder' ELSE 'ok' END AS action
FROM plan
ORDER BY sku;
```

## Expected result

| sku | avg_daily | sd_daily | safety_stock | reorder_point | on_hand | action |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | 20 | 1.4 | 4.7 | 84.7 | 100 | ok |
| B2 | 8 | 6.1 | 30.4 | 102.4 | 120 | ok |
| C3 | 8 | 0.6 | 2.1 | 34.1 | 30 | reorder |

## Explanation

Safety stock covers the uncertainty in demand during the lead time. Two SKUs can sell the same on average and need very different buffers: B2 averages 8 a day like C3, but its demand swings between 0 and 15 (standard deviation 6.1), and its lead time is 9 days, so it needs 30.4 units of safety stock against C3's 2.1. Uncertainty grows with the square root of time, hence `√lead_time_days`.

The reorder point is expected demand during the lead time plus that buffer. C3 has 30 units, below its reorder point of 34.1, so it is reordered now even though B2 holds far more stock; B2's 120 units are still above its 102.4. The sample standard deviation divides by `n − 1` because six days are a sample of all the days demand could take.

**Common mistake:** setting the reorder point to average demand × lead time with no safety stock. That runs out in roughly half of all lead times, and here it would miss that C3 needs ordering.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_demand(sku, day, units) AS ( VALUES ('A1', 1, 20), ('A1', 2, 22), ('A1', 3, 18), ('A1', 4, 21), ('A1', 5, 19), ('A1', 6, 20), ('B2', 1, 5), ('B2', 2, 15), ('B2', 3, 0), ('B2', 4, 12), ('B2', 5, 3), ('B2', 6, 13), ('C3', 1, 8), ('C3', 2, 8), ('C3', 3, 9), ('C3', 4, 7), ('C3', 5, 8), ('C3', 6, 8) ), stock(sku, lead_time_days, on_hand) AS ( VALUES ('A1', 4, 100), ('B2', 9, 120), ('C3', 4, 30) ), avgs AS (SELECT sku, AVG(units) AS avg_daily FROM daily_demand GROUP BY sku), plan AS (SELECT s.sku, a.avg_daily, s.on_hand, a.avg_daily * s.lead_time_days AS reorder_point FROM stock AS s JOIN avgs AS a ON a.sku = s.sku) SELECT sku, ROUND(avg_daily, 1) AS avg_daily, 0.0 AS sd_daily, 0.0 AS safety_stock, ROUND(reorder_point, 1) AS reorder_point, on_hand, CASE WHEN on_hand <= reorder_point THEN 'reorder' ELSE 'ok' END AS action FROM plan ORDER BY sku;
```
