---
id: da-day-283
title: Weekly overtime from daily timesheets
order: 283
difficulty: intermediate
topic: Workforce analytics
summary: Total hours per employee per week and pay overtime beyond 40 hours, at time and a half.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Group days into weeks
  - Cap a calculation at zero with MAX
prerequisites:
  - Day 271
  - Day 56
---

## Task

Overtime is paid on hours above **40 in a week** (weeks start on Monday), at 1.5 times the hourly rate of **₹500**. From the timesheets (starter query), return for each employee and week: `employee`, `week_start` (the Monday's date), `hours`, `overtime_hours` and `overtime_pay`. Sort by `employee`, then `week_start`.

Overtime is weekly: a long day in a short week earns no overtime.

## Starter query

```sql
WITH shifts(employee, worked_on, hours) AS (
  VALUES
    ('Ana', '2025-03-03', 9), ('Ana', '2025-03-04', 9), ('Ana', '2025-03-05', 10), ('Ana', '2025-03-06', 9), ('Ana', '2025-03-07', 8),
    ('Ana', '2025-03-10', 8), ('Ana', '2025-03-11', 8), ('Ana', '2025-03-12', 8), ('Ana', '2025-03-13', 8),
    ('Ben', '2025-03-03', 8), ('Ben', '2025-03-04', 8), ('Ben', '2025-03-05', 8), ('Ben', '2025-03-06', 8), ('Ben', '2025-03-07', 8),
    ('Ben', '2025-03-08', 6), ('Ben', '2025-03-10', 12), ('Ben', '2025-03-11', 12), ('Ben', '2025-03-12', 12), ('Ben', '2025-03-13', 6),
    ('Cai', '2025-03-04', 7), ('Cai', '2025-03-11', 7)
)
SELECT employee, worked_on, hours
FROM shifts
ORDER BY employee, worked_on;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Monday of the week: `date(worked_on, '-' || ((CAST(strftime('%w', worked_on) AS INTEGER) + 6) % 7) || ' days')`.
3. Group by employee and week: `SUM(hours)`, then `MAX(SUM(hours) - 40, 0)` overtime hours, times `500 * 1.5`.

## Solution

```sql
WITH shifts(employee, worked_on, hours) AS (
  VALUES
    ('Ana', '2025-03-03', 9), ('Ana', '2025-03-04', 9), ('Ana', '2025-03-05', 10), ('Ana', '2025-03-06', 9), ('Ana', '2025-03-07', 8),
    ('Ana', '2025-03-10', 8), ('Ana', '2025-03-11', 8), ('Ana', '2025-03-12', 8), ('Ana', '2025-03-13', 8),
    ('Ben', '2025-03-03', 8), ('Ben', '2025-03-04', 8), ('Ben', '2025-03-05', 8), ('Ben', '2025-03-06', 8), ('Ben', '2025-03-07', 8),
    ('Ben', '2025-03-08', 6), ('Ben', '2025-03-10', 12), ('Ben', '2025-03-11', 12), ('Ben', '2025-03-12', 12), ('Ben', '2025-03-13', 6),
    ('Cai', '2025-03-04', 7), ('Cai', '2025-03-11', 7)
),
weeks AS (
  SELECT employee, date(worked_on, '-' || ((CAST(strftime('%w', worked_on) AS INTEGER) + 6) % 7) || ' days') AS week_start, hours
  FROM shifts
)
SELECT employee, week_start, SUM(hours) AS hours, MAX(SUM(hours) - 40, 0) AS overtime_hours, MAX(SUM(hours) - 40, 0) * 500 * 1.5 AS overtime_pay
FROM weeks
GROUP BY employee, week_start
ORDER BY employee, week_start;
```

## Expected result

| employee | week_start | hours | overtime_hours | overtime_pay |
| --- | --- | --- | --- | --- |
| Ana | 2025-03-03 | 45 | 5 | 3750 |
| Ana | 2025-03-10 | 32 | 0 | 0 |
| Ben | 2025-03-03 | 46 | 6 | 4500 |
| Ben | 2025-03-10 | 42 | 2 | 1500 |
| Cai | 2025-03-03 | 7 | 0 | 0 |
| Cai | 2025-03-10 | 7 | 0 | 0 |

## Explanation

Overtime rules are weekly, so the hours have to be summed per week before the 40-hour threshold is applied. Ana's first week totals 45 hours, 5 of them overtime; in her second week she worked 32 hours, so no overtime even though some days were long. Ben's Saturday shift falls in the week starting 3 March and lifts it to 46 hours.

`MAX(SUM(hours) - 40, 0)` caps the overtime at zero for short weeks, such as Cai's. Grouping by the Monday of each week, rather than by `strftime('%W')`, keeps the weeks labelled by a real date that payroll can check.

**Common mistake:** counting daily hours over 8 as overtime. Ben's week of three 12-hour days would give 12 overtime hours instead of 2, and Ana's 9-hour days in a 45-hour week would cost the same as real overtime.

## Wrong answers

Feedback: incorrect-output

```sql
WITH shifts(employee, worked_on, hours) AS ( VALUES ('Ana', '2025-03-03', 9), ('Ana', '2025-03-04', 9), ('Ana', '2025-03-05', 10), ('Ana', '2025-03-06', 9), ('Ana', '2025-03-07', 8), ('Ana', '2025-03-10', 8), ('Ana', '2025-03-11', 8), ('Ana', '2025-03-12', 8), ('Ana', '2025-03-13', 8), ('Ben', '2025-03-03', 8), ('Ben', '2025-03-04', 8), ('Ben', '2025-03-05', 8), ('Ben', '2025-03-06', 8), ('Ben', '2025-03-07', 8), ('Ben', '2025-03-08', 6), ('Ben', '2025-03-10', 12), ('Ben', '2025-03-11', 12), ('Ben', '2025-03-12', 12), ('Ben', '2025-03-13', 6), ('Cai', '2025-03-04', 7), ('Cai', '2025-03-11', 7) ), weeks AS (SELECT employee, date(worked_on, '-' || ((CAST(strftime('%w', worked_on) AS INTEGER) + 6) % 7) || ' days') AS week_start, hours FROM shifts) SELECT employee, week_start, SUM(hours) AS hours, SUM(MAX(hours - 8, 0)) AS overtime_hours, SUM(MAX(hours - 8, 0)) * 500 * 1.5 AS overtime_pay FROM weeks GROUP BY employee, week_start ORDER BY employee, week_start;
```
