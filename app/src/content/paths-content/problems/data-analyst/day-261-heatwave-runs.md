---
id: da-day-261
title: Heatwaves: runs of hot days
order: 261
difficulty: advanced
topic: Gaps and islands
summary: Find runs of consecutive days at or above 40 °C per city, where a missing day breaks the run.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Find runs with the row-number difference
  - Treat missing dates as breaks
prerequisites:
  - Day 103
  - Day 190
---

## Task

A **heatwave** is a run of at least three **consecutive calendar days** with a maximum temperature of 40 °C or more (starter query). A day with no reading breaks a run.

Return one row per heatwave: `city`, `start_day`, `end_day`, `days` and `peak_temp`. Sort by `city`, then `start_day`.

## Starter query

```sql
WITH daily_max(city, day, max_temp) AS (
  VALUES
    ('Delhi', '2025-05-01', 39), ('Delhi', '2025-05-02', 41), ('Delhi', '2025-05-03', 42), ('Delhi', '2025-05-04', 40),
    ('Delhi', '2025-05-05', 43), ('Delhi', '2025-05-06', 44), ('Delhi', '2025-05-07', 41), ('Delhi', '2025-05-08', 38),
    ('Nagpur', '2025-05-01', 42), ('Nagpur', '2025-05-02', 43), ('Nagpur', '2025-05-04', 41),
    ('Nagpur', '2025-05-05', 42), ('Nagpur', '2025-05-06', 40), ('Nagpur', '2025-05-07', 45), ('Nagpur', '2025-05-08', 44),
    ('Pune', '2025-05-01', 36), ('Pune', '2025-05-02', 38)
)
SELECT city, day, max_temp
FROM daily_max
ORDER BY city, day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Keep hot days only. For consecutive days, `julianday(day) - ROW_NUMBER() OVER (PARTITION BY city ORDER BY day)` stays constant through a run and jumps after any gap (a cool day or a missing day).
3. Group by city and that key: `MIN(day)`, `MAX(day)`, `COUNT(*)` and `MAX(max_temp)`, keeping groups with `COUNT(*) >= 3`.

## Solution

```sql
WITH daily_max(city, day, max_temp) AS (
  VALUES
    ('Delhi', '2025-05-01', 39), ('Delhi', '2025-05-02', 41), ('Delhi', '2025-05-03', 42), ('Delhi', '2025-05-04', 40),
    ('Delhi', '2025-05-05', 43), ('Delhi', '2025-05-06', 44), ('Delhi', '2025-05-07', 41), ('Delhi', '2025-05-08', 38),
    ('Nagpur', '2025-05-01', 42), ('Nagpur', '2025-05-02', 43), ('Nagpur', '2025-05-04', 41),
    ('Nagpur', '2025-05-05', 42), ('Nagpur', '2025-05-06', 40), ('Nagpur', '2025-05-07', 45), ('Nagpur', '2025-05-08', 44),
    ('Pune', '2025-05-01', 36), ('Pune', '2025-05-02', 38)
),
hot AS (
  SELECT city, day, max_temp,
    julianday(day) - ROW_NUMBER() OVER (PARTITION BY city ORDER BY day) AS run_key
  FROM daily_max
  WHERE max_temp >= 40
)
SELECT city, MIN(day) AS start_day, MAX(day) AS end_day, COUNT(*) AS days, MAX(max_temp) AS peak_temp
FROM hot
GROUP BY city, run_key
HAVING COUNT(*) >= 3
ORDER BY city, start_day;
```

## Expected result

| city | start_day | end_day | days | peak_temp |
| --- | --- | --- | --- | --- |
| Delhi | 2025-05-02 | 2025-05-07 | 6 | 44 |
| Nagpur | 2025-05-04 | 2025-05-08 | 5 | 45 |

## Explanation

Consecutive-day runs are an islands problem. Among the hot days only, `julianday(day) − ROW_NUMBER()` stays constant while the dates go up one day at a time, and changes after any break, whether a cooler day (dropped by the filter) or a day with no reading at all. Grouping by that key gives one row per run.

Delhi had a six-day heatwave from 2 to 7 May, peaking at 44 °C. Nagpur's first two hot days are broken by a missing reading on 3 May, so they do not count, and its heatwave runs from 4 to 8 May. Pune never reaches 40 °C.

**Common mistake:** comparing two row numbers (all days against hot days). That method only notices cooler days, not missing ones, so Nagpur's two runs merge into one seven-day heatwave that was never measured.

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_max(city, day, max_temp) AS ( VALUES ('Delhi', '2025-05-01', 39), ('Delhi', '2025-05-02', 41), ('Delhi', '2025-05-03', 42), ('Delhi', '2025-05-04', 40), ('Delhi', '2025-05-05', 43), ('Delhi', '2025-05-06', 44), ('Delhi', '2025-05-07', 41), ('Delhi', '2025-05-08', 38), ('Nagpur', '2025-05-01', 42), ('Nagpur', '2025-05-02', 43), ('Nagpur', '2025-05-04', 41), ('Nagpur', '2025-05-05', 42), ('Nagpur', '2025-05-06', 40), ('Nagpur', '2025-05-07', 45), ('Nagpur', '2025-05-08', 44), ('Pune', '2025-05-01', 36), ('Pune', '2025-05-02', 38) ), hot AS (SELECT city, day, max_temp, ROW_NUMBER() OVER (PARTITION BY city ORDER BY day) - ROW_NUMBER() OVER (PARTITION BY city, max_temp >= 40 ORDER BY day) AS run_key FROM daily_max) SELECT city, MIN(day) AS start_day, MAX(day) AS end_day, COUNT(*) AS days, MAX(max_temp) AS peak_temp FROM hot WHERE max_temp >= 40 GROUP BY city, run_key HAVING COUNT(*) >= 3 ORDER BY city, start_day;
```
