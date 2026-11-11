---
id: da-day-186
title: A monthly seasonality index
order: 186
difficulty: advanced
topic: Statistics
summary: Measure how far each calendar month runs above or below normal, averaged over two years.
module: data-analyst
duration: 13
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a seasonality index
  - Average only months with data
prerequisites:
  - Day 153
  - Day 58
---

## Task

Two years of monthly units are in the starter query (December 2024 is not in yet). For each calendar month (1–12), compute a **seasonality index**: the average units for that month across the years it has data, divided by the average of all known months, × 100. 100 means a normal month; 130 means 30% busier than average.

Return `month_no`, `month_avg` (rounded to 1 decimal place), `index` (rounded to whole numbers) and `years` (how many years contributed). Sort by `month_no`.

## Starter query

```sql
WITH monthly(month, units) AS (
  VALUES
    ('2023-01', 80), ('2023-02', 70), ('2023-03', 90), ('2023-04', 100), ('2023-05', 110), ('2023-06', 130),
    ('2023-07', 140), ('2023-08', 135), ('2023-09', 105), ('2023-10', 95), ('2023-11', 120), ('2023-12', 185),
    ('2024-01', 90), ('2024-02', 80), ('2024-03', 100), ('2024-04', 110), ('2024-05', 120), ('2024-06', 150),
    ('2024-07', 160), ('2024-08', 145), ('2024-09', 115), ('2024-10', 105), ('2024-11', 140), ('2024-12', NULL)
)
SELECT month, units
FROM monthly
ORDER BY month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. The month number is `CAST(substr(month, 6, 2) AS INTEGER)`. `AVG(units)` and `COUNT(units)` per month number skip the missing December.
3. The overall average is `(SELECT AVG(units) FROM monthly)`, again over known months only. Divide each month's average by it and multiply by 100.

## Solution

```sql
WITH monthly(month, units) AS (
  VALUES
    ('2023-01', 80), ('2023-02', 70), ('2023-03', 90), ('2023-04', 100), ('2023-05', 110), ('2023-06', 130),
    ('2023-07', 140), ('2023-08', 135), ('2023-09', 105), ('2023-10', 95), ('2023-11', 120), ('2023-12', 185),
    ('2024-01', 90), ('2024-02', 80), ('2024-03', 100), ('2024-04', 110), ('2024-05', 120), ('2024-06', 150),
    ('2024-07', 160), ('2024-08', 145), ('2024-09', 115), ('2024-10', 105), ('2024-11', 140), ('2024-12', NULL)
)
SELECT CAST(substr(month, 6, 2) AS INTEGER) AS month_no,
  ROUND(AVG(units), 1) AS month_avg,
  ROUND(100.0 * AVG(units) / (SELECT AVG(units) FROM monthly)) AS "index",
  COUNT(units) AS years
FROM monthly
GROUP BY month_no
ORDER BY month_no;
```

## Expected result

| month_no | month_avg | index | years |
| --- | --- | --- | --- |
| 1 | 85 | 73 | 2 |
| 2 | 75 | 64 | 2 |
| 3 | 95 | 82 | 2 |
| 4 | 105 | 90 | 2 |
| 5 | 115 | 99 | 2 |
| 6 | 140 | 120 | 2 |
| 7 | 150 | 129 | 2 |
| 8 | 140 | 120 | 2 |
| 9 | 110 | 95 | 2 |
| 10 | 100 | 86 | 2 |
| 11 | 130 | 112 | 2 |
| 12 | 185 | 159 | 1 |

## Explanation

A seasonality index separates "busy because it's July" from "busy because we're growing". July runs about 30% above an average month and February about 35% below, which tells planners how much stock and staff each month needs before any trend is applied.

December has only one year of data: `AVG` and `COUNT` skip the missing 2024 figure instead of treating it as 0, so December's index (from 2023 alone) is still meaningful, and the `years` column tells the reader to treat it with care. The overall average also excludes the missing month.

This simple version ignores growth between the years (2024 is higher throughout); a fuller method divides each month by a 12-month moving average first.

**Common mistake:** turning the missing month into 0, which drags December's index down by half and lowers every other month's baseline.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly(month, units) AS ( VALUES ('2023-01', 80), ('2023-02', 70), ('2023-03', 90), ('2023-04', 100), ('2023-05', 110), ('2023-06', 130), ('2023-07', 140), ('2023-08', 135), ('2023-09', 105), ('2023-10', 95), ('2023-11', 120), ('2023-12', 185), ('2024-01', 90), ('2024-02', 80), ('2024-03', 100), ('2024-04', 110), ('2024-05', 120), ('2024-06', 150), ('2024-07', 160), ('2024-08', 145), ('2024-09', 115), ('2024-10', 105), ('2024-11', 140), ('2024-12', NULL) ) SELECT CAST(substr(month, 6, 2) AS INTEGER) AS month_no, ROUND(AVG(COALESCE(units, 0)), 1) AS month_avg, ROUND(100.0 * AVG(COALESCE(units, 0)) / (SELECT AVG(COALESCE(units, 0)) FROM monthly)) AS "index", COUNT(*) AS years FROM monthly GROUP BY month_no ORDER BY month_no;
```
