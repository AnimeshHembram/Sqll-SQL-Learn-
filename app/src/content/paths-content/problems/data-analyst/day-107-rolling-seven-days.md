---
id: da-day-107
title: A rolling seven-day total over calendar days
order: 107
difficulty: advanced
topic: Running totals
summary: Use a RANGE frame on the date so missing days are counted as days.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Use a RANGE frame for a calendar window
  - Handle missing days in time series
prerequisites:
  - Day 63
  - Day 74
---

## Task

Units sold per day are in the starter query; days with no sales have **no row**. For each listed day, return `day`, `units` and `units_7d`: the units sold in the **seven calendar days ending on that day** (that day and the six before it). Sort by `day`.

## Starter query

```sql
WITH daily_units(day, units) AS (
  VALUES ('2025-03-01', 5), ('2025-03-02', 3), ('2025-03-04', 4),
         ('2025-03-08', 6), ('2025-03-09', 2), ('2025-03-15', 7)
)
SELECT day, units
FROM daily_units
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` counts the previous six **rows**, which reach further back than six days when days are missing.
3. Order the window by a number of days and use a range: `SUM(units) OVER (ORDER BY julianday(day) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW)`.

## Solution

```sql
WITH daily_units(day, units) AS (
  VALUES ('2025-03-01', 5), ('2025-03-02', 3), ('2025-03-04', 4),
         ('2025-03-08', 6), ('2025-03-09', 2), ('2025-03-15', 7)
)
SELECT day, units,
  SUM(units) OVER (ORDER BY julianday(day) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW) AS units_7d
FROM daily_units
ORDER BY day;
```

## Expected result

| day | units | units_7d |
| --- | --- | --- |
| 2025-03-01 | 5 | 5 |
| 2025-03-02 | 3 | 8 |
| 2025-03-04 | 4 | 12 |
| 2025-03-08 | 6 | 13 |
| 2025-03-09 | 2 | 12 |
| 2025-03-15 | 7 | 9 |

## Explanation

A `RANGE` frame with an offset selects rows by **value**: here, every row whose day number is at most 6 below the current one. `julianday` turns the date into a number of days, so the frame covers seven calendar days whatever rows exist.

On 8 March the window is 2 to 8 March: 3 + 4 + 6 = 13 units. A `ROWS` frame would add the five rows before it as well and report 18, including 1 March, which is a week and a day earlier.

**Common mistake:** using `ROWS` for a time window on data with gaps. An alternative that works everywhere is a correlated subquery that sums the units `WHERE day BETWEEN date(d.day, '-6 days') AND d.day`.

## Other accepted answers

```sql
WITH daily_units(day, units) AS (
  VALUES ('2025-03-01', 5), ('2025-03-02', 3), ('2025-03-04', 4),
         ('2025-03-08', 6), ('2025-03-09', 2), ('2025-03-15', 7)
)
SELECT d.day, d.units,
  (SELECT SUM(x.units) FROM daily_units AS x WHERE x.day BETWEEN date(d.day, '-6 days') AND d.day) AS units_7d
FROM daily_units AS d
ORDER BY d.day;
```

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_units(day, units) AS ( VALUES ('2025-03-01', 5), ('2025-03-02', 3), ('2025-03-04', 4), ('2025-03-08', 6), ('2025-03-09', 2), ('2025-03-15', 7) ) SELECT day, units, SUM(units) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS units_7d FROM daily_units ORDER BY day;
```
