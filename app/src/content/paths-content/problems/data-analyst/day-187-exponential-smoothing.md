---
id: da-day-187
title: Exponential smoothing with a recursive CTE
order: 187
difficulty: advanced
topic: Statistics
summary: Carry a smoothed value from row to row with a recursive CTE and forecast the next period.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Carry a value from row to row with a recursive CTE
  - Forecast with exponential smoothing
prerequisites:
  - Day 153
  - Day 126
---

## Task

Smooth weekly demand (in the starter query) with **simple exponential smoothing**, α = 0.3: the first smoothed value equals week 1's demand, and each later week is `0.3 × units + 0.7 × previous smoothed value`. The forecast for a week is the previous week's smoothed value.

Return `week_no`, `units`, `smoothed` and `forecast` (both rounded to 2 decimal places; week 1 has no forecast), and a final row for **week 7** with `units` `NULL`, `smoothed` `NULL` and its forecast. Sort by `week_no`.

## Starter query

```sql
WITH RECURSIVE demand(week_no, units) AS (
  VALUES (1, 100), (2, 120), (3, 90), (4, 130), (5, 110), (6, 150)
)
SELECT week_no, units
FROM demand
ORDER BY week_no;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`.
2. Window functions cannot refer to their own previous result, but a recursive CTE can: start with week 1 (`smoothed = units`), then join the next week: `0.3 * d.units + 0.7 * s.smoothed`.
3. Add `LAG(smoothed) OVER (ORDER BY week_no)` for the forecast, and append week 7 with `UNION ALL`, using the last smoothed value as its forecast.

## Solution

```sql
WITH RECURSIVE demand(week_no, units) AS (
  VALUES (1, 100), (2, 120), (3, 90), (4, 130), (5, 110), (6, 150)
),
smoothing(week_no, units, smoothed) AS (
  SELECT week_no, units, 1.0 * units FROM demand WHERE week_no = 1
  UNION ALL
  SELECT d.week_no, d.units, 0.3 * d.units + 0.7 * s.smoothed
  FROM smoothing AS s
  JOIN demand AS d ON d.week_no = s.week_no + 1
),
with_forecast AS (
  SELECT week_no, units, smoothed, LAG(smoothed) OVER (ORDER BY week_no) AS forecast FROM smoothing
  UNION ALL
  SELECT MAX(week_no) + 1, NULL, NULL, (SELECT smoothed FROM smoothing ORDER BY week_no DESC LIMIT 1) FROM smoothing
)
SELECT week_no, units, ROUND(smoothed, 2) AS smoothed, ROUND(forecast, 2) AS forecast
FROM with_forecast
ORDER BY week_no;
```

## Expected result

| week_no | units | smoothed | forecast |
| --- | --- | --- | --- |
| 1 | 100 | 100 | NULL |
| 2 | 120 | 106 | 100 |
| 3 | 90 | 101.2 | 106 |
| 4 | 130 | 109.84 | 101.2 |
| 5 | 110 | 109.89 | 109.84 |
| 6 | 150 | 121.92 | 109.89 |
| 7 | NULL | NULL | 121.92 |

## Explanation

Exponential smoothing gives recent weeks more weight than older ones, with weights falling off by 0.7 per week; it is the simplest forecasting method that reacts to change without chasing every spike. Each smoothed value depends on the previous one, which is a dependency window functions cannot express, but a recursive CTE walks through the weeks one at a time and carries the value along.

The forecast for week 7 is about 120: week 6's jump to 150 pulls it up, but only by 30% of the surprise.

**Common mistake:** approximating with `AVG(units) OVER (ORDER BY week_no)`, a running average that weights week 1 as much as week 6 and reacts far too slowly.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE demand(week_no, units) AS ( VALUES (1, 100), (2, 120), (3, 90), (4, 130), (5, 110), (6, 150) ), smoothing AS (SELECT week_no, units, AVG(1.0 * units) OVER (ORDER BY week_no) AS smoothed FROM demand), with_forecast AS (SELECT week_no, units, smoothed, LAG(smoothed) OVER (ORDER BY week_no) AS forecast FROM smoothing UNION ALL SELECT 7, NULL, NULL, (SELECT smoothed FROM smoothing WHERE week_no = 6)) SELECT week_no, units, ROUND(smoothed, 2) AS smoothed, ROUND(forecast, 2) AS forecast FROM with_forecast ORDER BY week_no;
```
