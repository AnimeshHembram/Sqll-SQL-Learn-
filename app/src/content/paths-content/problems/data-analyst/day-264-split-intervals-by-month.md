---
id: da-day-264
title: Allocate assignment hours to calendar months
order: 264
difficulty: advanced
topic: Gaps and islands
summary: Split date ranges that cross month ends and total the working hours each month.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Expand ranges into days
  - Allocate amounts across period boundaries
prerequisites:
  - Day 220
  - Day 218
---

## Task

Consultants work on assignments that can cross month ends (starter query). An assignment counts `hours_per_day` on every **weekday** (Monday to Friday) from `starts` to `ends` inclusive.

Return `month` (`'YYYY-MM'`), `consultant`, `project`, `working_days` and `hours`, one row per month an assignment touches. Sort by `month`, then `consultant`, then `project`.

## Starter query

```sql
WITH RECURSIVE assignments(consultant, project, starts, ends, hours_per_day) AS (
  VALUES
    ('Asha', 'Atlas', '2025-01-20', '2025-02-10', 6),
    ('Ravi', 'Beacon', '2025-02-24', '2025-03-05', 8),
    ('Asha', 'Comet', '2025-03-03', '2025-03-07', 4)
)
SELECT consultant, project, starts, ends, hours_per_day
FROM assignments
ORDER BY starts;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Use the `RECURSIVE` keyword to expand each assignment into its days.
2. Expand each assignment into one row per day: the anchor is its start, and each step adds a day while `date(day, '+1 day') <= ends`, carrying the consultant, project, end and hours along.
3. Keep weekdays (`strftime('%w', day) NOT IN ('0', '6')`), then group by `strftime('%Y-%m', day)`, consultant and project: `COUNT(*)` days and `SUM(hours_per_day)` hours.

## Solution

```sql
WITH RECURSIVE assignments(consultant, project, starts, ends, hours_per_day) AS (
  VALUES
    ('Asha', 'Atlas', '2025-01-20', '2025-02-10', 6),
    ('Ravi', 'Beacon', '2025-02-24', '2025-03-05', 8),
    ('Asha', 'Comet', '2025-03-03', '2025-03-07', 4)
),
days(consultant, project, day, ends, hours_per_day) AS (
  SELECT consultant, project, starts, ends, hours_per_day FROM assignments
  UNION ALL
  SELECT consultant, project, date(day, '+1 day'), ends, hours_per_day FROM days WHERE date(day, '+1 day') <= ends
)
SELECT strftime('%Y-%m', day) AS month, consultant, project, COUNT(*) AS working_days, SUM(hours_per_day) AS hours
FROM days
WHERE strftime('%w', day) NOT IN ('0', '6')
GROUP BY strftime('%Y-%m', day), consultant, project
ORDER BY month, consultant, project;
```

## Expected result

| month | consultant | project | working_days | hours |
| --- | --- | --- | --- | --- |
| 2025-01 | Asha | Atlas | 10 | 60 |
| 2025-02 | Asha | Atlas | 6 | 36 |
| 2025-02 | Ravi | Beacon | 5 | 40 |
| 2025-03 | Asha | Comet | 5 | 20 |
| 2025-03 | Ravi | Beacon | 3 | 24 |

## Explanation

Allocating a range across months means splitting it at month ends. Expanding each assignment into its days with a recursive CTE makes the split automatic: every day belongs to exactly one month, and weekends can be dropped before counting. Asha's Atlas assignment runs from 20 January to 10 February: 10 working days in January and 6 in February.

Ravi's Beacon assignment crosses from February into March, and Asha's Comet week sits entirely in March, so March has two rows. This is how hours and costs get recognised in the right accounting period; the same approach works for any daily rate.

**Common mistake:** forgetting to remove weekends. Every calendar day counts, so Asha's January hours come out at 72 instead of 60.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE assignments(consultant, project, starts, ends, hours_per_day) AS ( VALUES ('Asha', 'Atlas', '2025-01-20', '2025-02-10', 6), ('Ravi', 'Beacon', '2025-02-24', '2025-03-05', 8), ('Asha', 'Comet', '2025-03-03', '2025-03-07', 4) ), days(consultant, project, day, ends, hours_per_day) AS (SELECT consultant, project, starts, ends, hours_per_day FROM assignments UNION ALL SELECT consultant, project, date(day, '+1 day'), ends, hours_per_day FROM days WHERE date(day, '+1 day') <= ends) SELECT strftime('%Y-%m', day) AS month, consultant, project, COUNT(*) AS working_days, SUM(hours_per_day) AS hours FROM days GROUP BY strftime('%Y-%m', day), consultant, project ORDER BY month, consultant, project;
```
