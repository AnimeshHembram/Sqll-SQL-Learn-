---
id: da-day-143
title: Sensor readings far from normal
order: 143
difficulty: advanced
topic: Data quality
summary: Flag outliers with a per-group z-score computed from window averages.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute z-scores with window aggregates
  - Guard against zero variance
prerequisites:
  - Day 85
  - Day 123
---

## Task

Temperature sensors (in the starter query) occasionally report nonsense. For each sensor, compute the mean and the **population standard deviation** of its readings (the square root of the average squared distance from the mean). Flag readings whose **z-score** (distance from the mean in standard deviations) is beyond ±2. A sensor whose readings never vary has no outliers.

Return `sensor`, `read_at`, `temp`, `sensor_avg` and `z_score` (both rounded to 2 decimal places) for the flagged readings. Sort by `sensor`, then `read_at`.

## Starter query

```sql
WITH readings(sensor, read_at, temp) AS (
  VALUES
    ('A', '08:00', 21), ('A', '09:00', 22), ('A', '10:00', 21), ('A', '11:00', 23), ('A', '12:00', 22),
    ('A', '13:00', 21), ('A', '14:00', 22), ('A', '15:00', 35), ('A', '16:00', 22), ('A', '17:00', 21),
    ('B', '08:00', 20), ('B', '09:00', 20), ('B', '10:00', 20), ('B', '11:00', 20),
    ('C', '08:00', 10), ('C', '09:00', 10), ('C', '10:00', 11), ('C', '11:00', 10), ('C', '12:00', 9),
    ('C', '13:00', 10), ('C', '14:00', 30), ('C', '15:00', 10), ('C', '16:00', -10), ('C', '17:00', 10)
)
SELECT sensor, read_at, temp
FROM readings
ORDER BY sensor, read_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Per reading: `AVG(temp) OVER (PARTITION BY sensor)` is the mean, and the variance is `AVG(temp * temp) OVER (PARTITION BY sensor) - mean * mean`. Compute them in a CTE.
3. `z = (temp - mean) / sqrt(variance)`. Only divide when the variance is above 0 (`CASE WHEN variance > 0 THEN ... END`), then keep `ABS(z) > 2`.

## Solution

```sql
WITH readings(sensor, read_at, temp) AS (
  VALUES
    ('A', '08:00', 21), ('A', '09:00', 22), ('A', '10:00', 21), ('A', '11:00', 23), ('A', '12:00', 22),
    ('A', '13:00', 21), ('A', '14:00', 22), ('A', '15:00', 35), ('A', '16:00', 22), ('A', '17:00', 21),
    ('B', '08:00', 20), ('B', '09:00', 20), ('B', '10:00', 20), ('B', '11:00', 20),
    ('C', '08:00', 10), ('C', '09:00', 10), ('C', '10:00', 11), ('C', '11:00', 10), ('C', '12:00', 9),
    ('C', '13:00', 10), ('C', '14:00', 30), ('C', '15:00', 10), ('C', '16:00', -10), ('C', '17:00', 10)
),
stats AS (
  SELECT sensor, read_at, temp,
    AVG(temp) OVER (PARTITION BY sensor) AS mean,
    AVG(temp * temp) OVER (PARTITION BY sensor) - AVG(temp) OVER (PARTITION BY sensor) * AVG(temp) OVER (PARTITION BY sensor) AS variance
  FROM readings
),
scored AS (
  SELECT sensor, read_at, temp, mean,
    CASE WHEN variance > 0 THEN (temp - mean) / sqrt(variance) END AS z
  FROM stats
)
SELECT sensor, read_at, temp, ROUND(mean, 2) AS sensor_avg, ROUND(z, 2) AS z_score
FROM scored
WHERE ABS(z) > 2
ORDER BY sensor, read_at;
```

## Expected result

| sensor | read_at | temp | sensor_avg | z_score |
| --- | --- | --- | --- | --- |
| A | 15:00 | 35 | 23 | 2.96 |
| C | 14:00 | 30 | 10 | 2.23 |
| C | 16:00 | -10 | 10 | -2.23 |

## Explanation

A z-score measures how unusual a value is **for its own group**: 35 °C is normal for some sensors but far off for sensor A, whose readings sit around 22. Computing the statistics per sensor with `PARTITION BY` keeps groups from distorting each other.

Sensor B always reads 20, so its variance is 0 and the z-score is undefined; the `CASE` leaves it `NULL`, and `ABS(NULL) > 2` is not true, so nothing is flagged. Sensor C has two outliers, 30 and −10, in opposite directions.

Outliers also inflate the standard deviation they are measured against (called masking): sensor C's two outliers only reach z = ±2.23. Robust methods based on the median exist for that reason.

**Common mistake:** using one mean and deviation for all sensors (`OVER ()`), which flags whole sensors that simply run warmer or cooler than the others.

## Wrong answers

Feedback: incorrect-output

```sql
WITH readings(sensor, read_at, temp) AS ( VALUES ('A', '08:00', 21), ('A', '09:00', 22), ('A', '10:00', 21), ('A', '11:00', 23), ('A', '12:00', 22), ('A', '13:00', 21), ('A', '14:00', 22), ('A', '15:00', 35), ('A', '16:00', 22), ('A', '17:00', 21), ('B', '08:00', 20), ('B', '09:00', 20), ('B', '10:00', 20), ('B', '11:00', 20), ('C', '08:00', 10), ('C', '09:00', 10), ('C', '10:00', 11), ('C', '11:00', 10), ('C', '12:00', 9), ('C', '13:00', 10), ('C', '14:00', 30), ('C', '15:00', 10), ('C', '16:00', -10), ('C', '17:00', 10) ), stats AS (SELECT sensor, read_at, temp, AVG(temp) OVER () AS mean, AVG(temp * temp) OVER () - AVG(temp) OVER () * AVG(temp) OVER () AS variance FROM readings), scored AS (SELECT sensor, read_at, temp, mean, CASE WHEN variance > 0 THEN (temp - mean) / sqrt(variance) END AS z FROM stats) SELECT sensor, read_at, temp, ROUND(mean, 2) AS sensor_avg, ROUND(z, 2) AS z_score FROM scored WHERE ABS(z) > 2 ORDER BY sensor, read_at;
```
