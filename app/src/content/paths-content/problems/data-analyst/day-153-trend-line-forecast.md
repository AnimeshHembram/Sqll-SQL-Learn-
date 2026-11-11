---
id: da-day-153
title: Fit a trend line and forecast
order: 153
difficulty: advanced
topic: Statistics
summary: Fit a least-squares line in SQL and extend it one month ahead.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Fit a least-squares line with aggregate sums
  - Avoid integer division in SQLite
prerequisites:
  - Day 152
  - Day 134
---

## Task

Planning wants a simple forecast of next month's units for each product (data in the starter query, months 1 to 6). Fit a straight line `units = intercept + slope × month_no` by **least squares**, using only months with a figure:

- `slope = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)`
- `intercept = (Σy − slope·Σx) / n`

Products with fewer than 3 known months get no forecast (`NULL` slope and forecast). Return `product`, `months_used`, `slope` (rounded to 2 decimal places) and `forecast_m7` (the line's value at month 7, rounded to 1 decimal place). Sort by `product`.

## Starter query

```sql
WITH monthly(product, month_no, units) AS (
  VALUES
    ('Kettle', 1, 100), ('Kettle', 2, 110), ('Kettle', 3, 125), ('Kettle', 4, 130), ('Kettle', 5, 150), ('Kettle', 6, 155),
    ('Toaster', 1, 90), ('Toaster', 2, 85), ('Toaster', 3, NULL), ('Toaster', 4, 80), ('Toaster', 5, 72), ('Toaster', 6, 70),
    ('Blender', 1, 40), ('Blender', 2, 41), ('Blender', 3, 41), ('Blender', 4, 42),
    ('Grill', 6, 25)
)
SELECT product, month_no, units
FROM monthly
ORDER BY product, month_no;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Filter `units IS NOT NULL`, then per product compute `n`, `Σx`, `Σy`, `Σxy` and `Σx²`. Multiply by `1.0` first: every value here is a whole number, and SQLite would otherwise divide whole numbers and drop the fraction.
3. Compute the slope in one CTE, then `intercept = (sy - slope * sx) / n` and `forecast = intercept + slope * 7`. Wrap both in `CASE WHEN n >= 3 THEN ... END`.

## Solution

```sql
WITH monthly(product, month_no, units) AS (
  VALUES
    ('Kettle', 1, 100), ('Kettle', 2, 110), ('Kettle', 3, 125), ('Kettle', 4, 130), ('Kettle', 5, 150), ('Kettle', 6, 155),
    ('Toaster', 1, 90), ('Toaster', 2, 85), ('Toaster', 3, NULL), ('Toaster', 4, 80), ('Toaster', 5, 72), ('Toaster', 6, 70),
    ('Blender', 1, 40), ('Blender', 2, 41), ('Blender', 3, 41), ('Blender', 4, 42),
    ('Grill', 6, 25)
),
sums AS (
  SELECT product, COUNT(*) AS n,
    SUM(1.0 * month_no) AS sx, SUM(1.0 * units) AS sy,
    SUM(1.0 * month_no * units) AS sxy, SUM(1.0 * month_no * month_no) AS sxx
  FROM monthly
  WHERE units IS NOT NULL
  GROUP BY product
),
fitted AS (
  SELECT product, n, sx, sy,
    CASE WHEN n >= 3 THEN (n * sxy - sx * sy) / (n * sxx - sx * sx) END AS slope
  FROM sums
)
SELECT product, n AS months_used, ROUND(slope, 2) AS slope,
  ROUND((sy - slope * sx) / n + slope * 7, 1) AS forecast_m7
FROM fitted
ORDER BY product;
```

## Expected result

| product | months_used | slope | forecast_m7 |
| --- | --- | --- | --- |
| Blender | 4 | 0.6 | 43.7 |
| Grill | 1 | NULL | NULL |
| Kettle | 6 | 11.43 | 168.3 |
| Toaster | 5 | -4.02 | 65.7 |

## Explanation

Least squares picks the line that minimises the squared distances to the points, and both coefficients come straight from five sums, so a trend line needs no special statistics function.

The Kettle grows by about 11.4 units a month and is forecast at about 168. The Toaster declines; its missing month 3 is simply left out, so the line uses five points. The Grill has one month of history, too little for a meaningful line, so its forecast is `NULL` instead of a made-up number.

**Common mistake:** integer division. `(n * sxy - sx * sy) / (n * sxx - sx * sx)` with whole-number inputs is truncated in SQLite, which gives a slope of 11 instead of 11.43 for the Kettle and shifts every forecast. A straight line is also only a baseline: it ignores seasonality, so treat the forecast as a starting point.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly(product, month_no, units) AS ( VALUES ('Kettle', 1, 100), ('Kettle', 2, 110), ('Kettle', 3, 125), ('Kettle', 4, 130), ('Kettle', 5, 150), ('Kettle', 6, 155), ('Toaster', 1, 90), ('Toaster', 2, 85), ('Toaster', 3, NULL), ('Toaster', 4, 80), ('Toaster', 5, 72), ('Toaster', 6, 70), ('Blender', 1, 40), ('Blender', 2, 41), ('Blender', 3, 41), ('Blender', 4, 42), ('Grill', 6, 25) ), sums AS (SELECT product, COUNT(*) AS n, SUM(month_no) AS sx, SUM(units) AS sy, SUM(month_no * units) AS sxy, SUM(month_no * month_no) AS sxx FROM monthly WHERE units IS NOT NULL GROUP BY product), fitted AS (SELECT product, n, sx, sy, CASE WHEN n >= 3 THEN (n * sxy - sx * sy) / (n * sxx - sx * sx) END AS slope FROM sums) SELECT product, n AS months_used, ROUND(slope, 2) AS slope, ROUND((sy - slope * sx) / n + slope * 7, 1) AS forecast_m7 FROM fitted ORDER BY product;
```
