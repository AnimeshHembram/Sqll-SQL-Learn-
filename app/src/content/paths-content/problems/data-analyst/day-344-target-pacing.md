---
id: da-day-344
title: Are we on track for the monthly target?
order: 344
difficulty: intermediate
topic: Reporting
summary: Compare month-to-date sales with a straight-line target pace and project the month-end result.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pace progress against a target
  - Project a month-end result
prerequisites:
  - Day 134
  - Day 106
---

## Task

The March 2025 target is in the starter query; daily sales so far run to 10 March. For each day, return:

- `mtd_sales` (month to date) and `target_pace` (the target × days elapsed ÷ 31, rounded to 0 decimal places),
- `pace_pct` (month-to-date ÷ target pace × 100, rounded to 1 decimal place) and `projected_month` (month-to-date ÷ days elapsed × 31, rounded to 0 decimal places),
- `status`: `'on track'` when the projection reaches the target, otherwise `'behind'`.

Sort by `day`.

## Starter query

```sql
WITH RECURSIVE daily_sales(day, sales) AS (
  VALUES
    ('2025-03-01', 30000), ('2025-03-02', 28000), ('2025-03-03', 35000), ('2025-03-04', 31000), ('2025-03-05', 33000),
    ('2025-03-06', 29000), ('2025-03-07', 40000), ('2025-03-08', 42000), ('2025-03-09', 26000), ('2025-03-10', 30000)
),
target(month, monthly_target) AS (
  VALUES ('2025-03', 1000000)
)
SELECT day, sales
FROM daily_sales
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Month to date: `SUM(sales) OVER (ORDER BY day)`. Days elapsed: `CAST(strftime('%d', day) AS INTEGER)`.
3. `CROSS JOIN target` puts the monthly target on every row; pace and projection follow from the formulas.

## Solution

```sql
WITH RECURSIVE daily_sales(day, sales) AS (
  VALUES
    ('2025-03-01', 30000), ('2025-03-02', 28000), ('2025-03-03', 35000), ('2025-03-04', 31000), ('2025-03-05', 33000),
    ('2025-03-06', 29000), ('2025-03-07', 40000), ('2025-03-08', 42000), ('2025-03-09', 26000), ('2025-03-10', 30000)
),
target(month, monthly_target) AS (
  VALUES ('2025-03', 1000000)
),
mtd AS (
  SELECT s.day, SUM(s.sales) OVER (ORDER BY s.day) AS mtd_sales, CAST(strftime('%d', s.day) AS INTEGER) AS days_elapsed, t.monthly_target
  FROM daily_sales AS s
  CROSS JOIN target AS t
)
SELECT day, mtd_sales, ROUND(1.0 * monthly_target * days_elapsed / 31) AS target_pace,
  ROUND(100.0 * mtd_sales / (1.0 * monthly_target * days_elapsed / 31), 1) AS pace_pct,
  ROUND(1.0 * mtd_sales / days_elapsed * 31) AS projected_month,
  CASE WHEN 1.0 * mtd_sales / days_elapsed * 31 >= monthly_target THEN 'on track' ELSE 'behind' END AS status
FROM mtd
ORDER BY day;
```

## Expected result

| day | mtd_sales | target_pace | pace_pct | projected_month | status |
| --- | --- | --- | --- | --- | --- |
| 2025-03-01 | 30000 | 32258 | 93 | 930000 | behind |
| 2025-03-02 | 58000 | 64516 | 89.9 | 899000 | behind |
| 2025-03-03 | 93000 | 96774 | 96.1 | 961000 | behind |
| 2025-03-04 | 124000 | 129032 | 96.1 | 961000 | behind |
| 2025-03-05 | 157000 | 161290 | 97.3 | 973400 | behind |
| 2025-03-06 | 186000 | 193548 | 96.1 | 961000 | behind |
| 2025-03-07 | 226000 | 225806 | 100.1 | 1000857 | on track |
| 2025-03-08 | 268000 | 258065 | 103.8 | 1038500 | on track |
| 2025-03-09 | 294000 | 290323 | 101.3 | 1012667 | on track |
| 2025-03-10 | 324000 | 322581 | 100.4 | 1004400 | on track |

## Explanation

A straight-line pace says where month-to-date sales should be if the target were spread evenly over the 31 days. For the first six days sales were a few percent behind pace; a strong weekend (40,000 and 42,000 on the 7th and 8th) put the month on track, and by the 10th the projection is just above the target.

Two numbers tell the story together: `pace_pct` compares with the plan so far, and `projected_month` extends the current daily average to 31 days. Real targets often have a seasonal shape (weekends, month-end), and a refined version would pace against that shape, but the straight line is the usual first view.

**Common mistake:** using 30 days for every month. March has 31, so the pace and the projection are both slightly off, and a month can look on track a day too early.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE daily_sales(day, sales) AS ( VALUES ('2025-03-01', 30000), ('2025-03-02', 28000), ('2025-03-03', 35000), ('2025-03-04', 31000), ('2025-03-05', 33000), ('2025-03-06', 29000), ('2025-03-07', 40000), ('2025-03-08', 42000), ('2025-03-09', 26000), ('2025-03-10', 30000) ), target(month, monthly_target) AS ( VALUES ('2025-03', 1000000) ), mtd AS (SELECT s.day, SUM(s.sales) OVER (ORDER BY s.day) AS mtd_sales, CAST(strftime('%d', s.day) AS INTEGER) AS days_elapsed, t.monthly_target FROM daily_sales AS s CROSS JOIN target AS t) SELECT day, mtd_sales, ROUND(1.0 * monthly_target * days_elapsed / 30) AS target_pace, ROUND(100.0 * mtd_sales / (1.0 * monthly_target * days_elapsed / 30), 1) AS pace_pct, ROUND(1.0 * mtd_sales / days_elapsed * 30) AS projected_month, CASE WHEN 1.0 * mtd_sales / days_elapsed * 30 >= monthly_target THEN 'on track' ELSE 'behind' END AS status FROM mtd ORDER BY day;
```
