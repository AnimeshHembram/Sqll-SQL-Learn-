---
id: da-day-278
title: Days sales outstanding, month by month
order: 278
difficulty: intermediate
topic: Financial analysis
summary: Compute DSO from receivables and credit sales, and smooth it over three months.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Compute DSO
  - Smooth a ratio with rolling sums
prerequisites:
  - Day 133
  - Day 107
---

## Task

**Days sales outstanding** (DSO) estimates how many days customers take to pay: `receivables_end / credit_sales × days_in_month`. A month with no credit sales has no DSO (`NULL`). Also compute `dso_3m`: receivables at the end of the month ÷ credit sales of the **last three months** (this one and the two before) × the days in those three months, available from the third month on.

Return `month`, `credit_sales`, `receivables_end`, `dso` and `dso_3m` (both rounded to 1 decimal place). Sort by `month`.

## Starter query

```sql
WITH monthly(month, credit_sales, receivables_end) AS (
  VALUES
    ('2025-01', 900000, 1050000), ('2025-02', 840000, 1120000), ('2025-03', 1020000, 1290000),
    ('2025-04', 960000, 1180000), ('2025-05', 0, 640000), ('2025-06', 1100000, 1210000)
)
SELECT month, credit_sales, receivables_end
FROM monthly
ORDER BY month;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Days in a month: `CAST(strftime('%d', date(month || '-01', '+1 month', '-1 day')) AS INTEGER)`.
3. Three-month sums with `SUM(...) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`, for both sales and days, and `COUNT(*)` over the same frame to know when three months are available. Use `NULLIF(sales, 0)`.

## Solution

```sql
WITH monthly(month, credit_sales, receivables_end) AS (
  VALUES
    ('2025-01', 900000, 1050000), ('2025-02', 840000, 1120000), ('2025-03', 1020000, 1290000),
    ('2025-04', 960000, 1180000), ('2025-05', 0, 640000), ('2025-06', 1100000, 1210000)
),
with_days AS (
  SELECT month, credit_sales, receivables_end,
    CAST(strftime('%d', date(month || '-01', '+1 month', '-1 day')) AS INTEGER) AS days
  FROM monthly
),
rolling AS (
  SELECT month, credit_sales, receivables_end, days,
    SUM(credit_sales) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS sales_3m,
    SUM(days) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS days_3m,
    COUNT(*) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS months_in_window
  FROM with_days
)
SELECT month, credit_sales, receivables_end,
  ROUND(1.0 * receivables_end / NULLIF(credit_sales, 0) * days, 1) AS dso,
  CASE WHEN months_in_window = 3 THEN ROUND(1.0 * receivables_end / NULLIF(sales_3m, 0) * days_3m, 1) END AS dso_3m
FROM rolling
ORDER BY month;
```

## Expected result

| month | credit_sales | receivables_end | dso | dso_3m |
| --- | --- | --- | --- | --- |
| 2025-01 | 900000 | 1050000 | 36.2 | NULL |
| 2025-02 | 840000 | 1120000 | 37.3 | NULL |
| 2025-03 | 1020000 | 1290000 | 39.2 | 42.1 |
| 2025-04 | 960000 | 1180000 | 36.9 | 37.2 |
| 2025-05 | 0 | 640000 | NULL | 29.7 |
| 2025-06 | 1100000 | 1210000 | 33 | 53.5 |

## Explanation

DSO converts receivables into days of sales: at the end of March, 1,290,000 owed against 1,020,000 of March sales is 39.2 days. A single month's DSO jumps around with that month's sales, which is why many teams use a three-month version.

May had no credit sales at all (perhaps the business paused invoicing), so its monthly DSO is undefined and shown as `NULL` instead of an error or infinity. The three-month figure shows the opposite effect: in June the denominator still includes May's zero, so the rolling DSO jumps to 53.5 days, which looks like slower payment but is really the gap in sales. Rolling measures smooth noise, but they also carry unusual months forward for two more months.

**Common mistake:** averaging three monthly DSO figures, each computed with 30 days. The average skips May's undefined value and ignores the different month lengths, so it does not match receivables against the sales that created them.

## Wrong answers

Feedback: incorrect-output

```sql
WITH monthly(month, credit_sales, receivables_end) AS ( VALUES ('2025-01', 900000, 1050000), ('2025-02', 840000, 1120000), ('2025-03', 1020000, 1290000), ('2025-04', 960000, 1180000), ('2025-05', 0, 640000), ('2025-06', 1100000, 1210000) ), rolling AS (SELECT month, credit_sales, receivables_end, COUNT(*) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS months_in_window, AVG(1.0 * receivables_end / NULLIF(credit_sales, 0) * 30) OVER (ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_dso FROM monthly) SELECT month, credit_sales, receivables_end, ROUND(1.0 * receivables_end / NULLIF(credit_sales, 0) * 30, 1) AS dso, CASE WHEN months_in_window = 3 THEN ROUND(avg_dso, 1) END AS dso_3m FROM rolling ORDER BY month;
```
