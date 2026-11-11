---
id: da-day-184
title: Year to date against the same period last year
order: 184
difficulty: intermediate
topic: Temporal analysis
summary: Compare year-to-date revenue with the matching period a year earlier, getting the date boundaries right.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compare aligned year-to-date windows
  - Derive date boundaries from one as-of date
prerequisites:
  - Day 108
  - Day 106
---

## Task

It is **2025-03-15**. Management wants year-to-date revenue (1 January to today, inclusive) compared with the **same period last year** (1 January to 15 March 2024, inclusive; 2024 was a leap year, so it has one more day, which is fine). Data is in the starter query.

Return one row: `ytd_revenue`, `prior_ytd_revenue`, `change` and `change_pct` (rounded to 1 decimal place).

## Starter query

```sql
WITH RECURSIVE daily_revenue(day, revenue) AS (
  VALUES
    ('2024-01-05', 100), ('2024-02-10', 150), ('2024-02-29', 80), ('2024-03-15', 60), ('2024-03-16', 70), ('2024-12-30', 300),
    ('2025-01-03', 120), ('2025-02-14', 160), ('2025-03-01', 90), ('2025-03-15', 40), ('2025-03-16', 500)
)
SELECT day, revenue
FROM daily_revenue
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Two conditional sums in one pass: `SUM(CASE WHEN day BETWEEN '2025-01-01' AND '2025-03-15' THEN revenue END)` and the same for 2024. The dates here have no time part, so `BETWEEN` with both ends is safe.
3. Derive the prior-year end from today with `date('2025-03-15', '-1 year')`, which gives 2024-03-15. Wrap both sums in a CTE, then subtract and divide.

## Solution

```sql
WITH RECURSIVE daily_revenue(day, revenue) AS (
  VALUES
    ('2024-01-05', 100), ('2024-02-10', 150), ('2024-02-29', 80), ('2024-03-15', 60), ('2024-03-16', 70), ('2024-12-30', 300),
    ('2025-01-03', 120), ('2025-02-14', 160), ('2025-03-01', 90), ('2025-03-15', 40), ('2025-03-16', 500)
),
totals AS (
  SELECT
    SUM(CASE WHEN day BETWEEN '2025-01-01' AND '2025-03-15' THEN revenue END) AS ytd,
    SUM(CASE WHEN day BETWEEN date('2025-03-15', 'start of year', '-1 year') AND date('2025-03-15', '-1 year') THEN revenue END) AS prior_ytd
  FROM daily_revenue
)
SELECT ytd AS ytd_revenue, prior_ytd AS prior_ytd_revenue, ytd - prior_ytd AS change,
  ROUND(100.0 * (ytd - prior_ytd) / prior_ytd, 1) AS change_pct
FROM totals;
```

## Expected result

| ytd_revenue | prior_ytd_revenue | change | change_pct |
| --- | --- | --- | --- |
| 410 | 390 | 20 | 5.1 |

## Explanation

Comparing a partial year with a full previous year is a classic mistake; YTD comparisons only make sense against the **same slice** of last year. Deriving both windows from one "today" with `date(today, '-1 year')` and `'start of year'` keeps them aligned when the report runs tomorrow.

The edges decide the answer: 15 March is included in both years, and 16 March is excluded (including 2025-03-16's 500 would wildly overstate growth). 29 February 2024 is inside last year's window: a leap day is a real day of sales.

**Common mistake:** comparing with all of 2024, which includes the big December sale and turns a 5% rise into an apparent fall.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE daily_revenue(day, revenue) AS ( VALUES ('2024-01-05', 100), ('2024-02-10', 150), ('2024-02-29', 80), ('2024-03-15', 60), ('2024-03-16', 70), ('2024-12-30', 300), ('2025-01-03', 120), ('2025-02-14', 160), ('2025-03-01', 90), ('2025-03-15', 40), ('2025-03-16', 500) ), totals AS (SELECT SUM(CASE WHEN day BETWEEN '2025-01-01' AND '2025-03-15' THEN revenue END) AS ytd, SUM(CASE WHEN day LIKE '2024-%' THEN revenue END) AS prior_ytd FROM daily_revenue) SELECT ytd AS ytd_revenue, prior_ytd AS prior_ytd_revenue, ytd - prior_ytd AS change, ROUND(100.0 * (ytd - prior_ytd) / prior_ytd, 1) AS change_pct FROM totals;
```
