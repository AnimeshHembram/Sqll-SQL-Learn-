---
id: da-day-226
title: How accurate was the forecast?
order: 226
difficulty: intermediate
topic: Forecasting and planning
summary: Measure forecast error per product with MAPE and bias, without dividing by zero.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure forecast error
  - Skip zero denominators with NULLIF
prerequisites:
  - Day 153
  - Day 88
---

## Task

Each week's demand forecast and actual sales are in the starter query. For each product, report:

- `mape_pct`: mean absolute percentage error, the average of `|actual − forecast| / actual × 100` over weeks with **non-zero** actuals,
- `bias_pct`: `(total forecast − total actual) / total actual × 100` over all weeks (positive means over-forecasting),
- `skipped_weeks`: weeks left out of MAPE because the actual was 0.

Round both percentages to 1 decimal place. Return `product`, `weeks`, `mape_pct`, `bias_pct` and `skipped_weeks`, sorted by `mape_pct` from worst to best.

## Starter query

```sql
WITH forecast_log(product, week, forecast, actual) AS (
  VALUES
    ('Atlas', 1, 100, 90), ('Atlas', 2, 100, 110), ('Atlas', 3, 100, 100), ('Atlas', 4, 100, 80),
    ('Beacon', 1, 50, 40), ('Beacon', 2, 50, 45), ('Beacon', 3, 50, 0), ('Beacon', 4, 50, 35),
    ('Comet', 1, 20, 30), ('Comet', 2, 20, 25), ('Comet', 3, 20, 28), ('Comet', 4, 20, 22)
)
SELECT product, week, forecast, actual
FROM forecast_log
ORDER BY product, week;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Inside `AVG`, `NULLIF(actual, 0)` turns a zero actual into `NULL`, so that week's error is `NULL` and `AVG` skips it.
3. Bias uses totals: `100.0 * (SUM(forecast) - SUM(actual)) / SUM(actual)`. Skipped weeks: `SUM(actual = 0)`.

## Solution

```sql
WITH forecast_log(product, week, forecast, actual) AS (
  VALUES
    ('Atlas', 1, 100, 90), ('Atlas', 2, 100, 110), ('Atlas', 3, 100, 100), ('Atlas', 4, 100, 80),
    ('Beacon', 1, 50, 40), ('Beacon', 2, 50, 45), ('Beacon', 3, 50, 0), ('Beacon', 4, 50, 35),
    ('Comet', 1, 20, 30), ('Comet', 2, 20, 25), ('Comet', 3, 20, 28), ('Comet', 4, 20, 22)
)
SELECT product, COUNT(*) AS weeks,
  ROUND(AVG(100.0 * ABS(actual - forecast) / NULLIF(actual, 0)), 1) AS mape_pct,
  ROUND(100.0 * (SUM(forecast) - SUM(actual)) / SUM(actual), 1) AS bias_pct,
  SUM(actual = 0) AS skipped_weeks
FROM forecast_log
GROUP BY product
ORDER BY mape_pct DESC;
```

## Expected result

| product | weeks | mape_pct | bias_pct | skipped_weeks |
| --- | --- | --- | --- | --- |
| Beacon | 4 | 26.3 | 66.7 | 1 |
| Comet | 4 | 22.7 | -23.8 | 0 |
| Atlas | 4 | 11.3 | 5.3 | 0 |

## Explanation

MAPE tells you how wrong the forecast typically is in percentage terms; bias tells you which way. Beacon looks poor on both: its errors average 26.3% of actuals, and it forecast 200 units against 120 sold, a 66.7% over-forecast that ties up stock. Comet's errors are almost as large, but it is under-forecast (−23.8%), which risks running out instead.

A week with an actual of 0 cannot be expressed as a percentage error, so `NULLIF(actual, 0)` makes that week's error `NULL` and `AVG` skips it. `skipped_weeks` reports this openly (Beacon's week 3), because a forecast of 50 for a week that sold nothing still counts in bias, where it belongs.

**Common mistake:** averaging signed errors (`actual − forecast`) instead of absolute ones. Over- and under-forecasts cancel out, and Atlas's errors of −11%, +9% and −25% look far smaller than they are.

## Wrong answers

Feedback: incorrect-output

```sql
WITH forecast_log(product, week, forecast, actual) AS ( VALUES ('Atlas', 1, 100, 90), ('Atlas', 2, 100, 110), ('Atlas', 3, 100, 100), ('Atlas', 4, 100, 80), ('Beacon', 1, 50, 40), ('Beacon', 2, 50, 45), ('Beacon', 3, 50, 0), ('Beacon', 4, 50, 35), ('Comet', 1, 20, 30), ('Comet', 2, 20, 25), ('Comet', 3, 20, 28), ('Comet', 4, 20, 22) ) SELECT product, COUNT(*) AS weeks, ROUND(AVG(100.0 * (actual - forecast) / NULLIF(actual, 0)), 1) AS mape_pct, ROUND(100.0 * (SUM(forecast) - SUM(actual)) / SUM(actual), 1) AS bias_pct, SUM(actual = 0) AS skipped_weeks FROM forecast_log GROUP BY product ORDER BY mape_pct DESC;
```
