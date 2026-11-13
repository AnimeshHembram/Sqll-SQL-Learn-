---
id: da-day-237
title: Case study: headcount, hires and attrition by month
order: 237
difficulty: advanced
topic: Case studies
summary: Build a monthly headcount bridge from hire and leaving dates, and compute the attrition rate.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Build a headcount bridge
  - Compute attrition on an average base
prerequisites:
  - Day 232
  - Day 137
---

## Task

HR wants a monthly headcount bridge for **January to March 2025** from the staff list (starter query). Someone is on staff from `hired` until `left_on` inclusive (`NULL` means still employed). For each month:

- `start_headcount`: on staff on the first day of the month,
- `hires` and `leavers`: hired, or left, during the month,
- `end_headcount`: on staff on the last day of the month, after that day's leavers have gone (`start + hires − leavers`),
- `attrition_pct`: leavers ÷ the average of start and end headcount × 100, rounded to 1 decimal place.

Return `month` (`'YYYY-MM'`), `start_headcount`, `hires`, `leavers`, `end_headcount` and `attrition_pct`, sorted by `month`.

## Starter query

```sql
WITH RECURSIVE staff(id, dept, hired, left_on) AS (
  VALUES
    (1, 'Sales', '2023-04-01', NULL), (2, 'Sales', '2024-06-15', '2025-02-10'), (3, 'Ops', '2022-01-10', NULL),
    (4, 'Ops', '2024-11-01', '2025-01-31'), (5, 'Tech', '2023-08-01', NULL), (6, 'Tech', '2025-01-15', NULL),
    (7, 'Sales', '2025-02-01', NULL), (8, 'Ops', '2025-03-03', '2025-03-28'), (9, 'Tech', '2024-02-01', '2025-03-31'),
    (10, 'Sales', '2025-03-17', NULL), (11, 'Ops', '2025-02-20', NULL)
)
SELECT id, dept, hired, left_on
FROM staff
ORDER BY hired;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Generate the months with a recursive CTE holding each month's first day; `date(first_day, '+1 month', '-1 day')` is its last day.
2. On staff at the start: `hired < first_day AND (left_on IS NULL OR left_on >= first_day)`. Hires: `hired BETWEEN first_day AND last_day`; leavers: `left_on BETWEEN first_day AND last_day`.
3. `end = start + hires - leavers`. Attrition: `100.0 * leavers / ((start + end) / 2.0)`.

## Solution

```sql
WITH RECURSIVE staff(id, dept, hired, left_on) AS (
  VALUES
    (1, 'Sales', '2023-04-01', NULL), (2, 'Sales', '2024-06-15', '2025-02-10'), (3, 'Ops', '2022-01-10', NULL),
    (4, 'Ops', '2024-11-01', '2025-01-31'), (5, 'Tech', '2023-08-01', NULL), (6, 'Tech', '2025-01-15', NULL),
    (7, 'Sales', '2025-02-01', NULL), (8, 'Ops', '2025-03-03', '2025-03-28'), (9, 'Tech', '2024-02-01', '2025-03-31'),
    (10, 'Sales', '2025-03-17', NULL), (11, 'Ops', '2025-02-20', NULL)
),
months(first_day) AS (
  SELECT '2025-01-01'
  UNION ALL
  SELECT date(first_day, '+1 month') FROM months WHERE first_day < '2025-03-01'
),
bridge AS (
  SELECT m.first_day,
    SUM(s.hired < m.first_day AND (s.left_on IS NULL OR s.left_on >= m.first_day)) AS start_headcount,
    SUM(s.hired BETWEEN m.first_day AND date(m.first_day, '+1 month', '-1 day')) AS hires,
    SUM(s.left_on BETWEEN m.first_day AND date(m.first_day, '+1 month', '-1 day')) AS leavers
  FROM months AS m
  CROSS JOIN staff AS s
  GROUP BY m.first_day
)
SELECT strftime('%Y-%m', first_day) AS month, start_headcount, hires, leavers,
  start_headcount + hires - leavers AS end_headcount,
  ROUND(100.0 * leavers / ((start_headcount + start_headcount + hires - leavers) / 2.0), 1) AS attrition_pct
FROM bridge
ORDER BY month;
```

## Expected result

| month | start_headcount | hires | leavers | end_headcount | attrition_pct |
| --- | --- | --- | --- | --- | --- |
| 2025-01 | 6 | 1 | 1 | 6 | 16.7 |
| 2025-02 | 6 | 2 | 1 | 7 | 15.4 |
| 2025-03 | 7 | 2 | 2 | 7 | 28.6 |

## Explanation

A headcount bridge explains how the number of employees moved: start, plus hires, minus leavers, equals end. Counting each piece from dates keeps the arithmetic honest. Someone is on staff at the start of a month if hired before its first day and not gone before it; someone hired on the 1st, like employee 7 on 1 February, counts as a hire of that month, not as part of its start.

February shows why attrition uses the average headcount: one person left while two joined, so the base grew from 6 to 7, and 1 leaver over an average of 6.5 is 15.4%. March has two leavers, including one who left on the 31st and still counts as a March leaver, giving 28.6%. These are monthly rates; a year of them would add up to far more than any annual figure people are used to.

**Common mistake:** dividing leavers by the starting headcount only. Months with many hires look worse than they are, because the new people are in the base for leaving but not in the denominator.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE staff(id, dept, hired, left_on) AS ( VALUES (1, 'Sales', '2023-04-01', NULL), (2, 'Sales', '2024-06-15', '2025-02-10'), (3, 'Ops', '2022-01-10', NULL), (4, 'Ops', '2024-11-01', '2025-01-31'), (5, 'Tech', '2023-08-01', NULL), (6, 'Tech', '2025-01-15', NULL), (7, 'Sales', '2025-02-01', NULL), (8, 'Ops', '2025-03-03', '2025-03-28'), (9, 'Tech', '2024-02-01', '2025-03-31'), (10, 'Sales', '2025-03-17', NULL), (11, 'Ops', '2025-02-20', NULL) ), months(first_day) AS (SELECT '2025-01-01' UNION ALL SELECT date(first_day, '+1 month') FROM months WHERE first_day < '2025-03-01'), bridge AS (SELECT m.first_day, SUM(s.hired < m.first_day AND (s.left_on IS NULL OR s.left_on >= m.first_day)) AS start_headcount, SUM(s.hired BETWEEN m.first_day AND date(m.first_day, '+1 month', '-1 day')) AS hires, SUM(s.left_on BETWEEN m.first_day AND date(m.first_day, '+1 month', '-1 day')) AS leavers FROM months AS m CROSS JOIN staff AS s GROUP BY m.first_day) SELECT strftime('%Y-%m', first_day) AS month, start_headcount, hires, leavers, start_headcount + hires - leavers AS end_headcount, ROUND(100.0 * leavers / start_headcount, 1) AS attrition_pct FROM bridge ORDER BY month;
```
