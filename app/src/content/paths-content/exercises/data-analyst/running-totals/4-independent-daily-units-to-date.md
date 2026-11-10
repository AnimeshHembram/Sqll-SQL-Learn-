---
id: da-daily-units-to-date
title: Daily units to date from a sales log
order: 4
difficulty: advanced
topic: Running totals
summary: Aggregate to one row per day before accumulating, so tied rows cannot confuse the total.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Aggregate before accumulating
---

## Task

A shop's sales log (in the starter query) has several rows on some days. Return **one row per day** with `sold_on`, `day_units` (units sold that day) and `units_to_date` (units from the first day up to and including that day). Sort by `sold_on`.

## Starter query

```sql
WITH sales_log(sold_on, units) AS (
  VALUES ('2025-06-01', 3), ('2025-06-01', 2), ('2025-06-02', 4),
         ('2025-06-04', 1), ('2025-06-04', 5), ('2025-06-04', 2)
)
SELECT sold_on, units,
  SUM(units) OVER (ORDER BY sold_on ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS units_to_date
FROM sales_log;
```

## Hints

1. Run the starter query: it has several rows per day, and the running total changes within a day.
2. Group the log by day in a second CTE called `daily`: `SELECT sold_on, SUM(units) AS day_units FROM sales_log GROUP BY sold_on`.
3. Then `SUM(day_units) OVER (ORDER BY sold_on) AS units_to_date`.

## Solution

```sql
WITH sales_log(sold_on, units) AS (
  VALUES ('2025-06-01', 3), ('2025-06-01', 2), ('2025-06-02', 4),
         ('2025-06-04', 1), ('2025-06-04', 5), ('2025-06-04', 2)
),
daily AS (
  SELECT sold_on, SUM(units) AS day_units
  FROM sales_log
  GROUP BY sold_on
)
SELECT sold_on, day_units, SUM(day_units) OVER (ORDER BY sold_on) AS units_to_date
FROM daily
ORDER BY sold_on;
```

## Expected result

| sold_on | day_units | units_to_date |
| --- | --- | --- |
| 2025-06-01 | 5 | 5 |
| 2025-06-02 | 4 | 9 |
| 2025-06-04 | 8 | 17 |

## Explanation

Three days remain: 5 units on 1 June, 4 on 2 June and 8 on 4 June, reaching 17. Grouping first gives exactly one row per day, so there are no ties for the frame to handle and the result reads naturally. 3 June has no row because nothing was sold; a date spine would be needed to show it as 0.

## Wrong answers

Feedback: incorrect-output

```sql
WITH sales_log(sold_on, units) AS ( VALUES ('2025-06-01', 3), ('2025-06-01', 2), ('2025-06-02', 4), ('2025-06-04', 1), ('2025-06-04', 5), ('2025-06-04', 2) ) SELECT sold_on, units AS day_units, SUM(units) OVER (ORDER BY sold_on) AS units_to_date FROM sales_log ORDER BY sold_on;
```
