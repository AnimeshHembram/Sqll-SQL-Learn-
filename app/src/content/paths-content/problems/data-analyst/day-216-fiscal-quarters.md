---
id: da-day-216
title: Revenue by Indian fiscal quarter
order: 216
difficulty: intermediate
topic: Dates
summary: Label sales with April-to-March fiscal years and quarters, and total revenue per quarter.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Map dates to a fiscal calendar
  - Shift dates with date modifiers
prerequisites:
  - Day 58
  - Day 184
---

## Task

The finance team reports on the Indian fiscal year, which runs from **1 April to 31 March**: FY2024-25 starts on 1 April 2024. Its Q1 is April to June, Q2 July to September, Q3 October to December and Q4 January to March.

Using the sales in the starter query, return `fiscal_year` (like `'FY2024-25'`), `fiscal_quarter` (like `'Q1'`), `sales` (number of sales) and `revenue`. Sort by fiscal year, then quarter.

## Starter query

```sql
WITH sales(sold_on, amount) AS (
  VALUES
    ('2024-03-28', 500), ('2024-04-02', 300), ('2024-06-30', 200), ('2024-07-01', 450), ('2024-09-15', 150),
    ('2024-10-05', 600), ('2024-12-31', 250), ('2025-01-01', 400), ('2025-03-31', 350), ('2025-04-01', 700)
)
SELECT sold_on, amount
FROM sales
ORDER BY sold_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Shift the date back three months and the fiscal year becomes an ordinary year: `date(sold_on, 'start of month', '-3 months')` turns April 2024 into January 2024. Go to the start of the month first: `date('2024-12-31', '-3 months')` would be 31 September, which SQLite rolls over to 1 October.
3. From the shifted date: start year `CAST(strftime('%Y', shifted) AS INTEGER)`; label `'FY' || y || '-' || SUBSTR(y + 1, 3)`; quarter `'Q' || ((CAST(strftime('%m', shifted) AS INTEGER) + 2) / 3)`.

## Solution

```sql
WITH sales(sold_on, amount) AS (
  VALUES
    ('2024-03-28', 500), ('2024-04-02', 300), ('2024-06-30', 200), ('2024-07-01', 450), ('2024-09-15', 150),
    ('2024-10-05', 600), ('2024-12-31', 250), ('2025-01-01', 400), ('2025-03-31', 350), ('2025-04-01', 700)
),
shifted AS (
  SELECT amount, date(sold_on, 'start of month', '-3 months') AS d FROM sales
),
labelled AS (
  SELECT amount,
    CAST(strftime('%Y', d) AS INTEGER) AS fy_start,
    'Q' || ((CAST(strftime('%m', d) AS INTEGER) + 2) / 3) AS fiscal_quarter
  FROM shifted
)
SELECT 'FY' || fy_start || '-' || SUBSTR(fy_start + 1, 3) AS fiscal_year, fiscal_quarter, COUNT(*) AS sales, SUM(amount) AS revenue
FROM labelled
GROUP BY fy_start, fiscal_quarter
ORDER BY fy_start, fiscal_quarter;
```

## Expected result

| fiscal_year | fiscal_quarter | sales | revenue |
| --- | --- | --- | --- |
| FY2023-24 | Q4 | 1 | 500 |
| FY2024-25 | Q1 | 2 | 500 |
| FY2024-25 | Q2 | 2 | 600 |
| FY2024-25 | Q3 | 2 | 850 |
| FY2024-25 | Q4 | 2 | 750 |
| FY2025-26 | Q1 | 1 | 700 |

## Explanation

A fiscal year that starts in April is an ordinary calendar year shifted by three months, so the cleanest approach is to shift each date back three months and then use the usual year and quarter formulas: April becomes January (Q1), December becomes September (Q3), March becomes December (Q4). The label takes the start year and the next year's last two digits, so 2024 becomes `FY2024-25`.

The shift has to start from the first of the month. `date('2024-12-31', '-3 months')` asks for 31 September, which does not exist; SQLite rolls it over to 1 October and the sale would land in the wrong quarter. With `'start of month'` first, December 31 correctly stays in Q3, which has 2 sales worth 850, and Q4 (January to March) has 750. The March 2024 and April 2025 sales fall in the neighbouring fiscal years.

**Common mistake:** using the calendar year as the fiscal year. Sales from January to March get the label of the year that has not started yet, and every quarter number is off by one.

## Other accepted answers

```sql
WITH sales(sold_on, amount) AS (
  VALUES
    ('2024-03-28', 500), ('2024-04-02', 300), ('2024-06-30', 200), ('2024-07-01', 450), ('2024-09-15', 150),
    ('2024-10-05', 600), ('2024-12-31', 250), ('2025-01-01', 400), ('2025-03-31', 350), ('2025-04-01', 700)
)
SELECT 'FY' || fy || '-' || SUBSTR(fy + 1, 3) AS fiscal_year, fiscal_quarter, COUNT(*) AS sales, SUM(amount) AS revenue
FROM (
  SELECT amount,
    CASE WHEN CAST(strftime('%m', sold_on) AS INTEGER) >= 4 THEN CAST(strftime('%Y', sold_on) AS INTEGER) ELSE CAST(strftime('%Y', sold_on) AS INTEGER) - 1 END AS fy,
    CASE WHEN CAST(strftime('%m', sold_on) AS INTEGER) BETWEEN 4 AND 6 THEN 'Q1' WHEN CAST(strftime('%m', sold_on) AS INTEGER) BETWEEN 7 AND 9 THEN 'Q2'
         WHEN CAST(strftime('%m', sold_on) AS INTEGER) BETWEEN 10 AND 12 THEN 'Q3' ELSE 'Q4' END AS fiscal_quarter
  FROM sales
)
GROUP BY fy, fiscal_quarter
ORDER BY fy, fiscal_quarter;
```

## Wrong answers

Feedback: incorrect-output

```sql
WITH sales(sold_on, amount) AS ( VALUES ('2024-03-28', 500), ('2024-04-02', 300), ('2024-06-30', 200), ('2024-07-01', 450), ('2024-09-15', 150), ('2024-10-05', 600), ('2024-12-31', 250), ('2025-01-01', 400), ('2025-03-31', 350), ('2025-04-01', 700) ) SELECT 'FY' || strftime('%Y', sold_on) || '-' || SUBSTR(strftime('%Y', sold_on) + 1, 3) AS fiscal_year, 'Q' || ((CAST(strftime('%m', sold_on) AS INTEGER) + 2) / 3) AS fiscal_quarter, COUNT(*) AS sales, SUM(amount) AS revenue FROM sales GROUP BY 1, 2 ORDER BY 1, 2;
```
