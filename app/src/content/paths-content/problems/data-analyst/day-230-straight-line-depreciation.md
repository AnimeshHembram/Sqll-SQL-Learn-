---
id: da-day-230
title: Depreciation and book value by year
order: 230
difficulty: advanced
topic: Forecasting and planning
summary: Spread each asset's cost over its life and report depreciation and book value for the reporting years.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Spread a cost over a fixed life
  - Cap a schedule at its end
prerequisites:
  - Day 229
  - Day 132
---

## Task

Assets (starter query) are depreciated **straight-line**: each full year from the year bought, the charge is `(cost − salvage) / life_years`, until the asset reaches its salvage value after `life_years` years; after that the charge is 0.

For the reporting years **2023 to 2025**, return one row per asset and year in which the asset was owned (bought in or before that year): `asset`, `year`, `depreciation` (that year's charge) and `book_value` (cost minus all depreciation up to the end of that year). Round money to 2 decimal places. Sort by `asset`, then `year`.

## Starter query

```sql
WITH RECURSIVE assets(asset, bought_year, cost, salvage, life_years) AS (
  VALUES ('Laptop', 2022, 90000, 10000, 4), ('Printer', 2024, 30000, 0, 3), ('Van', 2020, 600000, 100000, 5), ('Desk', 2025, 12000, 2000, 5)
)
SELECT asset, bought_year, cost, salvage, life_years
FROM assets
ORDER BY asset;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Use it to generate the reporting years 2023, 2024 and 2025 (or write them as `VALUES`).
2. Join assets to years where `bought_year <= year`. Years of depreciation charged so far at the end of a year: `MIN(year - bought_year + 1, life_years)`.
3. The year's charge is the annual amount when `year - bought_year < life_years`, else 0. Book value is `cost - annual * years_charged`.

## Solution

```sql
WITH RECURSIVE assets(asset, bought_year, cost, salvage, life_years) AS (
  VALUES ('Laptop', 2022, 90000, 10000, 4), ('Printer', 2024, 30000, 0, 3), ('Van', 2020, 600000, 100000, 5), ('Desk', 2025, 12000, 2000, 5)
),
years(year) AS (
  SELECT 2023
  UNION ALL
  SELECT year + 1 FROM years WHERE year < 2025
)
SELECT a.asset, y.year,
  ROUND(CASE WHEN y.year - a.bought_year < a.life_years THEN 1.0 * (a.cost - a.salvage) / a.life_years ELSE 0 END, 2) AS depreciation,
  ROUND(a.cost - 1.0 * (a.cost - a.salvage) / a.life_years * MIN(y.year - a.bought_year + 1, a.life_years), 2) AS book_value
FROM assets AS a
JOIN years AS y ON a.bought_year <= y.year
ORDER BY a.asset, y.year;
```

## Expected result

| asset | year | depreciation | book_value |
| --- | --- | --- | --- |
| Desk | 2025 | 2000 | 10000 |
| Laptop | 2023 | 20000 | 50000 |
| Laptop | 2024 | 20000 | 30000 |
| Laptop | 2025 | 20000 | 10000 |
| Printer | 2024 | 10000 | 20000 |
| Printer | 2025 | 10000 | 10000 |
| Van | 2023 | 100000 | 200000 |
| Van | 2024 | 100000 | 100000 |
| Van | 2025 | 0 | 100000 |

## Explanation

Straight-line depreciation spreads the depreciable amount (cost minus salvage) evenly over the asset's life: the laptop loses (90,000 − 10,000) / 4 = 20,000 a year. Book value is cost minus everything charged so far, which `MIN(year − bought_year + 1, life_years)` counts, capped at the asset's life.

The cap is what makes the schedule stop. The van, bought in 2020 with a five-year life, was fully depreciated by the end of 2024: in 2025 its charge is 0 and its book value stays at its 100,000 salvage value. The desk appears only in 2025, its first year, because assets enter the report from the year they were bought.

**Common mistake:** charging every year without the cap. The van would lose another 100,000 in 2025 and be shown at 0, below what it can be sold for.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE assets(asset, bought_year, cost, salvage, life_years) AS ( VALUES ('Laptop', 2022, 90000, 10000, 4), ('Printer', 2024, 30000, 0, 3), ('Van', 2020, 600000, 100000, 5), ('Desk', 2025, 12000, 2000, 5) ), years(year) AS (SELECT 2023 UNION ALL SELECT year + 1 FROM years WHERE year < 2025) SELECT a.asset, y.year, ROUND(1.0 * (a.cost - a.salvage) / a.life_years, 2) AS depreciation, ROUND(a.cost - 1.0 * (a.cost - a.salvage) / a.life_years * (y.year - a.bought_year + 1), 2) AS book_value FROM assets AS a JOIN years AS y ON a.bought_year <= y.year ORDER BY a.asset, y.year;
```
