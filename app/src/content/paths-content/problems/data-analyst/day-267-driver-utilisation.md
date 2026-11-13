---
id: da-day-267
title: Case study: ride-hailing driver utilisation
order: 267
difficulty: advanced
topic: Case studies
summary: Compare each driver's time online with time carrying passengers, and their earnings per online hour.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure utilisation from intervals
  - Keep inactive entities in a report
prerequisites:
  - Day 266
  - Day 177
---

## Task

A ride-hailing city team reviews one morning (starter query). For **every driver** who was online:

- `online_minutes` and `trip_minutes` (from pick-up to drop-off, summed),
- `utilisation_pct`: trip minutes ÷ online minutes × 100,
- `trips`, `fares` and `earnings_per_online_hour` (fares ÷ online hours),
- `surge_share_pct`: share of fares from trips with `surge` above 1.0 (`NULL` with no trips).

Round percentages to 1 decimal place and money to 2. Return `driver`, `online_minutes`, `trip_minutes`, `utilisation_pct`, `trips`, `fares`, `earnings_per_online_hour` and `surge_share_pct`, sorted by `utilisation_pct` from highest.

## Starter query

```sql
WITH shifts(driver, online_from, online_to) AS (
  VALUES ('Dev', '08:00', '12:00'), ('Ira', '09:00', '13:00'), ('Jay', '10:00', '12:00'), ('Kim', '08:00', '09:00')
),
trips(trip_id, driver, picked_up, dropped_off, fare, surge) AS (
  VALUES
    (1, 'Dev', '08:10', '08:40', 220, 1.0), (2, 'Dev', '09:00', '09:50', 480, 1.5), (3, 'Dev', '10:30', '11:10', 300, 1.0),
    (4, 'Ira', '09:20', '10:20', 560, 1.5), (5, 'Ira', '11:00', '11:30', 240, 1.0),
    (6, 'Jay', '10:15', '10:45', 260, 1.0), (7, 'Jay', '11:00', '11:50', 410, 1.2)
)
SELECT s.driver, s.online_from, s.online_to, t.picked_up, t.dropped_off, t.fare, t.surge
FROM shifts AS s
LEFT JOIN trips AS t ON t.driver = s.driver
ORDER BY s.driver, t.picked_up;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Aggregate trips per driver in a CTE (count, trip minutes, fares, surge fares), then `LEFT JOIN` it to `shifts` so a driver with no trips stays with zeros.
3. Minutes between two `'HH:MM'` times: `(julianday('2025-01-01 ' || b) - julianday('2025-01-01 ' || a)) * 1440`. Surge share: `100.0 * surge_fares / NULLIF(fares, 0)`.

## Solution

```sql
WITH shifts(driver, online_from, online_to) AS (
  VALUES ('Dev', '08:00', '12:00'), ('Ira', '09:00', '13:00'), ('Jay', '10:00', '12:00'), ('Kim', '08:00', '09:00')
),
trips(trip_id, driver, picked_up, dropped_off, fare, surge) AS (
  VALUES
    (1, 'Dev', '08:10', '08:40', 220, 1.0), (2, 'Dev', '09:00', '09:50', 480, 1.5), (3, 'Dev', '10:30', '11:10', 300, 1.0),
    (4, 'Ira', '09:20', '10:20', 560, 1.5), (5, 'Ira', '11:00', '11:30', 240, 1.0),
    (6, 'Jay', '10:15', '10:45', 260, 1.0), (7, 'Jay', '11:00', '11:50', 410, 1.2)
),
per_driver AS (
  SELECT driver, COUNT(*) AS trips, SUM(fare) AS fares,
    SUM((julianday('2025-01-01 ' || dropped_off) - julianday('2025-01-01 ' || picked_up)) * 1440) AS trip_minutes,
    SUM(CASE WHEN surge > 1.0 THEN fare ELSE 0 END) AS surge_fares
  FROM trips
  GROUP BY driver
),
combined AS (
  SELECT s.driver, (julianday('2025-01-01 ' || s.online_to) - julianday('2025-01-01 ' || s.online_from)) * 1440 AS online_minutes,
    COALESCE(p.trip_minutes, 0) AS trip_minutes, COALESCE(p.trips, 0) AS trips, COALESCE(p.fares, 0) AS fares, p.surge_fares
  FROM shifts AS s
  LEFT JOIN per_driver AS p ON p.driver = s.driver
)
SELECT driver, CAST(ROUND(online_minutes) AS INTEGER) AS online_minutes, CAST(ROUND(trip_minutes) AS INTEGER) AS trip_minutes,
  ROUND(100.0 * trip_minutes / online_minutes, 1) AS utilisation_pct, trips, fares,
  ROUND(fares / (online_minutes / 60.0), 2) AS earnings_per_online_hour,
  ROUND(100.0 * surge_fares / NULLIF(fares, 0), 1) AS surge_share_pct
FROM combined
ORDER BY utilisation_pct DESC;
```

## Expected result

| driver | online_minutes | trip_minutes | utilisation_pct | trips | fares | earnings_per_online_hour | surge_share_pct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Jay | 120 | 80 | 66.7 | 2 | 670 | 335 | 61.2 |
| Dev | 240 | 120 | 50 | 3 | 1000 | 250 | 48 |
| Ira | 240 | 90 | 37.5 | 2 | 800 | 200 | 70 |
| Kim | 60 | 0 | 0 | 0 | 0 | 0 | NULL |

## Explanation

Utilisation compares time spent carrying passengers with time spent online. Jay was online for only two hours but carried passengers for 80 minutes of them (66.7%), and earned the most per online hour (335). Dev and Ira were both online for four hours, but Dev's trips filled half his time and Ira's only 37.5%.

Surge share shows how much of each driver's income depended on surge pricing: 70% for Ira, who did one long surge trip. Kim was online for an hour and got no trips; the `LEFT JOIN` from `shifts` keeps Kim with zeros and a `NULL` surge share. Kim is precisely the case operations want to see: a driver who logged in but was never dispatched.

**Common mistake:** joining shifts to trips with an inner join. Kim disappears, and the report shows only drivers who did get work.

## Wrong answers

Feedback: missing-rows

```sql
WITH shifts(driver, online_from, online_to) AS ( VALUES ('Dev', '08:00', '12:00'), ('Ira', '09:00', '13:00'), ('Jay', '10:00', '12:00'), ('Kim', '08:00', '09:00') ), trips(trip_id, driver, picked_up, dropped_off, fare, surge) AS ( VALUES (1, 'Dev', '08:10', '08:40', 220, 1.0), (2, 'Dev', '09:00', '09:50', 480, 1.5), (3, 'Dev', '10:30', '11:10', 300, 1.0), (4, 'Ira', '09:20', '10:20', 560, 1.5), (5, 'Ira', '11:00', '11:30', 240, 1.0), (6, 'Jay', '10:15', '10:45', 260, 1.0), (7, 'Jay', '11:00', '11:50', 410, 1.2) ), per_driver AS (SELECT driver, COUNT(*) AS trips, SUM(fare) AS fares, SUM((julianday('2025-01-01 ' || dropped_off) - julianday('2025-01-01 ' || picked_up)) * 1440) AS trip_minutes, SUM(CASE WHEN surge > 1.0 THEN fare ELSE 0 END) AS surge_fares FROM trips GROUP BY driver), combined AS (SELECT s.driver, (julianday('2025-01-01 ' || s.online_to) - julianday('2025-01-01 ' || s.online_from)) * 1440 AS online_minutes, p.trip_minutes, p.trips, p.fares, p.surge_fares FROM shifts AS s JOIN per_driver AS p ON p.driver = s.driver) SELECT driver, CAST(ROUND(online_minutes) AS INTEGER) AS online_minutes, CAST(ROUND(trip_minutes) AS INTEGER) AS trip_minutes, ROUND(100.0 * trip_minutes / online_minutes, 1) AS utilisation_pct, trips, fares, ROUND(fares / (online_minutes / 60.0), 2) AS earnings_per_online_hour, ROUND(100.0 * surge_fares / NULLIF(fares, 0), 1) AS surge_share_pct FROM combined ORDER BY utilisation_pct DESC;
```
