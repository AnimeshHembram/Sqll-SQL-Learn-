---
id: da-day-291
title: Build a date dimension
order: 291
difficulty: intermediate
topic: Data engineering
summary: Generate a calendar table with the attributes reports filter on: ISO weeks, fiscal labels and working days.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Generate a calendar dimension
  - Derive ISO weeks and fiscal labels
prerequisites:
  - Day 216
  - Day 218
---

## Task

Reports join to a **date dimension**: one row per day with ready-made attributes. Build it for **28 December 2026 to 4 January 2027** and **29 to 31 March 2025** (holidays are in the starter query). Return:

- `date_key` (the date as an integer like `20261228`), `day` and `weekday` (three-letter name, like `'Mon'`),
- `iso_week`: the ISO 8601 week number. ISO weeks start on Monday, and a week belongs to the year that contains its **Thursday**, so compute it from the Thursday of the date's week: `(day of year of that Thursday + 6) / 7` with integer division,
- `fiscal_quarter` (Indian fiscal year April to March, like `'FY2026-27 Q3'`) and `is_working_day` (1 for Monday to Friday that are not holidays, else 0).

Sort by `day`.

## Starter query

```sql
WITH RECURSIVE holidays(day) AS (
  VALUES ('2025-03-14'), ('2025-03-31'), ('2026-12-25'), ('2027-01-01')
)
SELECT day
FROM holidays
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Generate the eight days around the new year with a recursive CTE and add the three March days with `UNION ALL`.
2. Thursday of the date's week: `date(day, '-' || ((CAST(strftime('%w', day) AS INTEGER) + 6) % 7) || ' days', '+3 days')`. Its day of year is `CAST(strftime('%j', thursday) AS INTEGER)`.
3. Weekday name: `SUBSTR('SunMonTueWedThuFriSat', 1 + 3 * CAST(strftime('%w', day) AS INTEGER), 3)`. Date key: `CAST(REPLACE(day, '-', '') AS INTEGER)`. Fiscal labels: shift by `'start of month', '-3 months'` as on Day 216.

## Solution

```sql
WITH RECURSIVE holidays(day) AS (
  VALUES ('2025-03-14'), ('2025-03-31'), ('2026-12-25'), ('2027-01-01')
),
new_year(day) AS (
  SELECT '2026-12-28'
  UNION ALL
  SELECT date(day, '+1 day') FROM new_year WHERE day < '2027-01-04'
),
picked AS (
  SELECT day FROM new_year
  UNION ALL SELECT '2025-03-29' UNION ALL SELECT '2025-03-30' UNION ALL SELECT '2025-03-31'
),
derived AS (
  SELECT day,
    date(day, '-' || ((CAST(strftime('%w', day) AS INTEGER) + 6) % 7) || ' days', '+3 days') AS thursday,
    date(day, 'start of month', '-3 months') AS fiscal_shift
  FROM picked
)
SELECT CAST(REPLACE(day, '-', '') AS INTEGER) AS date_key, day,
  SUBSTR('SunMonTueWedThuFriSat', 1 + 3 * CAST(strftime('%w', day) AS INTEGER), 3) AS weekday,
  (CAST(strftime('%j', thursday) AS INTEGER) + 6) / 7 AS iso_week,
  'FY' || strftime('%Y', fiscal_shift) || '-' || SUBSTR(CAST(strftime('%Y', fiscal_shift) AS INTEGER) + 1, 3)
    || ' Q' || ((CAST(strftime('%m', fiscal_shift) AS INTEGER) + 2) / 3) AS fiscal_quarter,
  CASE WHEN strftime('%w', day) IN ('0', '6') OR day IN (SELECT day FROM holidays) THEN 0 ELSE 1 END AS is_working_day
FROM derived
ORDER BY day;
```

## Expected result

| date_key | day | weekday | iso_week | fiscal_quarter | is_working_day |
| --- | --- | --- | --- | --- | --- |
| 20250329 | 2025-03-29 | Sat | 13 | FY2024-25 Q4 | 0 |
| 20250330 | 2025-03-30 | Sun | 13 | FY2024-25 Q4 | 0 |
| 20250331 | 2025-03-31 | Mon | 14 | FY2024-25 Q4 | 0 |
| 20261228 | 2026-12-28 | Mon | 53 | FY2026-27 Q3 | 1 |
| 20261229 | 2026-12-29 | Tue | 53 | FY2026-27 Q3 | 1 |
| 20261230 | 2026-12-30 | Wed | 53 | FY2026-27 Q3 | 1 |
| 20261231 | 2026-12-31 | Thu | 53 | FY2026-27 Q3 | 1 |
| 20270101 | 2027-01-01 | Fri | 53 | FY2026-27 Q4 | 0 |
| 20270102 | 2027-01-02 | Sat | 53 | FY2026-27 Q4 | 0 |
| 20270103 | 2027-01-03 | Sun | 53 | FY2026-27 Q4 | 0 |
| 20270104 | 2027-01-04 | Mon | 1 | FY2026-27 Q4 | 1 |

## Explanation

A date dimension precomputes calendar attributes once, so every report can join to it instead of repeating date logic. ISO week numbers are the tricky part: ISO weeks start on Monday, and a week belongs to the year of its Thursday. 1 January 2027 is a Friday in a week whose Thursday is 31 December 2026, so it is in **week 53 of 2026**, and week 1 of 2027 only starts on 4 January.

`strftime('%W')` counts Monday-based weeks from the first Monday of the year, so it calls 1 January 2027 week 0 (week 1 after adding one), splitting a single ISO week across two numbers. The fiscal labels use the same three-month shift as Day 216: December 2026 is Q3 of FY2026-27 and January 2027 is Q4. Holidays (25 December 2026 is a Friday outside the range, 1 January 2027 inside it) make the working-day flag more than a weekday test.

**Common mistake:** using `strftime('%W') + 1` as the ISO week. It matches in the middle of the year, which is why the error goes unnoticed, but it is wrong around every new year.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE holidays(day) AS ( VALUES ('2025-03-14'), ('2025-03-31'), ('2026-12-25'), ('2027-01-01') ), new_year(day) AS (SELECT '2026-12-28' UNION ALL SELECT date(day, '+1 day') FROM new_year WHERE day < '2027-01-04'), picked AS (SELECT day FROM new_year UNION ALL SELECT '2025-03-29' UNION ALL SELECT '2025-03-30' UNION ALL SELECT '2025-03-31'), derived AS (SELECT day, date(day, 'start of month', '-3 months') AS fiscal_shift FROM picked) SELECT CAST(REPLACE(day, '-', '') AS INTEGER) AS date_key, day, SUBSTR('SunMonTueWedThuFriSat', 1 + 3 * CAST(strftime('%w', day) AS INTEGER), 3) AS weekday, CAST(strftime('%W', day) AS INTEGER) + 1 AS iso_week, 'FY' || strftime('%Y', fiscal_shift) || '-' || SUBSTR(CAST(strftime('%Y', fiscal_shift) AS INTEGER) + 1, 3) || ' Q' || ((CAST(strftime('%m', fiscal_shift) AS INTEGER) + 2) / 3) AS fiscal_quarter, CASE WHEN strftime('%w', day) IN ('0', '6') OR day IN (SELECT day FROM holidays) THEN 0 ELSE 1 END AS is_working_day FROM derived ORDER BY day;
```
