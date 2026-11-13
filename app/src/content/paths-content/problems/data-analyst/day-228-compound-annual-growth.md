---
id: da-day-228
title: Compound annual growth rate per business unit
order: 228
difficulty: intermediate
topic: Forecasting and planning
summary: Compare units that started in different years with CAGR, and handle units it cannot describe.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute a compound growth rate
  - Guard formulas that are undefined
prerequisites:
  - Day 108
  - Day 225
---

## Task

Annual revenue per business unit is in the starter query; units started in different years. For each unit, compare its **first and last year**:

`cagr_pct = ((last_revenue / first_revenue) ^ (1 / years) − 1) × 100`, where `years = last_year − first_year`.

CAGR is undefined (`NULL`) when the unit has only one year or its first year's revenue is 0. Return `unit`, `first_year`, `last_year`, `first_revenue`, `last_revenue` and `cagr_pct` (rounded to 1 decimal place), sorted by `cagr_pct` from highest (undefined last), then `unit`.

## Starter query

```sql
WITH yearly(unit, year, revenue) AS (
  VALUES
    ('Books', 2020, 100), ('Books', 2021, 120), ('Books', 2022, 130), ('Books', 2023, 150), ('Books', 2024, 160),
    ('Stationery', 2022, 50), ('Stationery', 2023, 80), ('Stationery', 2024, 72),
    ('Gifts', 2021, 0), ('Gifts', 2022, 30), ('Gifts', 2023, 45), ('Gifts', 2024, 60),
    ('Music', 2024, 25)
)
SELECT unit, year, revenue
FROM yearly
ORDER BY unit, year;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Find each unit's first and last year with `MIN(year)` and `MAX(year)`, then join back to `yearly` twice to fetch the revenue in those years.
3. `POWER(x, 1.0 / years)` raises to a fractional power. Guard with `CASE WHEN years = 0 OR first_revenue = 0 THEN NULL ELSE ... END`, and sort with `ORDER BY cagr_pct IS NULL, cagr_pct DESC, unit`.

## Solution

```sql
WITH yearly(unit, year, revenue) AS (
  VALUES
    ('Books', 2020, 100), ('Books', 2021, 120), ('Books', 2022, 130), ('Books', 2023, 150), ('Books', 2024, 160),
    ('Stationery', 2022, 50), ('Stationery', 2023, 80), ('Stationery', 2024, 72),
    ('Gifts', 2021, 0), ('Gifts', 2022, 30), ('Gifts', 2023, 45), ('Gifts', 2024, 60),
    ('Music', 2024, 25)
),
spans AS (
  SELECT unit, MIN(year) AS first_year, MAX(year) AS last_year FROM yearly GROUP BY unit
),
ends AS (
  SELECT s.unit, s.first_year, s.last_year, f.revenue AS first_revenue, l.revenue AS last_revenue
  FROM spans AS s
  JOIN yearly AS f ON f.unit = s.unit AND f.year = s.first_year
  JOIN yearly AS l ON l.unit = s.unit AND l.year = s.last_year
)
SELECT unit, first_year, last_year, first_revenue, last_revenue,
  CASE WHEN last_year = first_year OR first_revenue = 0 THEN NULL
       ELSE ROUND(100 * (POWER(1.0 * last_revenue / first_revenue, 1.0 / (last_year - first_year)) - 1), 1) END AS cagr_pct
FROM ends
ORDER BY cagr_pct IS NULL, cagr_pct DESC, unit;
```

## Expected result

| unit | first_year | last_year | first_revenue | last_revenue | cagr_pct |
| --- | --- | --- | --- | --- | --- |
| Stationery | 2022 | 2024 | 50 | 72 | 20 |
| Books | 2020 | 2024 | 100 | 160 | 12.5 |
| Gifts | 2021 | 2024 | 0 | 60 | NULL |
| Music | 2024 | 2024 | 25 | 25 | NULL |

## Explanation

CAGR is the constant yearly growth rate that turns the first year's revenue into the last year's: `(last / first)^(1 / years) − 1`. It lets you compare units that started in different years. Books grew from 100 to 160 over four years, 12.5% a year; Stationery grew from 50 to 72 in two years, 20% a year, despite falling in its last year (CAGR looks only at the end points).

`POWER(x, 1.0 / years)` takes the root; the `1.0` keeps the exponent from becoming integer division. CAGR has no meaning for Gifts, whose first year was 0 (no growth rate turns 0 into 60), or for Music, with only one year, so both get `NULL` and are sorted last rather than hidden.

**Common mistake:** dividing total growth by the number of years. Books' 60% over four years becomes 15% a year, but compounding 15% would reach 175, not 160.

## Wrong answers

Feedback: incorrect-output

```sql
WITH yearly(unit, year, revenue) AS ( VALUES ('Books', 2020, 100), ('Books', 2021, 120), ('Books', 2022, 130), ('Books', 2023, 150), ('Books', 2024, 160), ('Stationery', 2022, 50), ('Stationery', 2023, 80), ('Stationery', 2024, 72), ('Gifts', 2021, 0), ('Gifts', 2022, 30), ('Gifts', 2023, 45), ('Gifts', 2024, 60), ('Music', 2024, 25) ), spans AS (SELECT unit, MIN(year) AS first_year, MAX(year) AS last_year FROM yearly GROUP BY unit), ends AS (SELECT s.unit, s.first_year, s.last_year, f.revenue AS first_revenue, l.revenue AS last_revenue FROM spans AS s JOIN yearly AS f ON f.unit = s.unit AND f.year = s.first_year JOIN yearly AS l ON l.unit = s.unit AND l.year = s.last_year) SELECT unit, first_year, last_year, first_revenue, last_revenue, CASE WHEN last_year = first_year OR first_revenue = 0 THEN NULL ELSE ROUND(100.0 * (last_revenue - first_revenue) / first_revenue / (last_year - first_year), 1) END AS cagr_pct FROM ends ORDER BY cagr_pct IS NULL, cagr_pct DESC, unit;
```
