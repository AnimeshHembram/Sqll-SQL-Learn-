---
id: da-day-281
title: Span of control and organisation size
order: 281
difficulty: advanced
topic: Workforce analytics
summary: Count each manager's direct reports and everyone below them, and flag spans that are too wide or too narrow.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Walk a hierarchy with a recursive CTE
  - Count direct and indirect reports
prerequisites:
  - Day 97
  - Day 130
---

## Task

For each person with at least one direct report (starter query), return:

- `direct_reports` and `total_reports` (everyone below them, at any depth),
- `span_flag`: `'wide'` with more than 7 direct reports, `'narrow'` with just 1, otherwise `'ok'`.

Return `name`, `direct_reports`, `total_reports` and `span_flag`, sorted by `total_reports` from most, then `name`.

## Starter query

```sql
WITH RECURSIVE employees(id, name, manager_id) AS (
  VALUES
    (1, 'Nisha (CEO)', NULL), (2, 'Arjun', 1), (3, 'Bela', 1), (4, 'Chirag', 2), (5, 'Divya', 2), (6, 'Esha', 2),
    (7, 'Farhan', 3), (8, 'Gita', 4), (9, 'Hari', 4), (10, 'Isha', 4), (11, 'Jai', 4), (12, 'Kavya', 4),
    (13, 'Lalit', 4), (14, 'Mira', 4), (15, 'Neel', 4), (16, 'Om', 6)
)
SELECT id, name, manager_id
FROM employees
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Use it to walk the hierarchy.
2. Build every (manager, report) pair at any depth: the anchor pairs each employee with their direct manager; each step joins `employees AS e ON e.manager_id = pairs.report_id`, keeping the same manager.
3. Direct reports: `COUNT(*)` of employees with that `manager_id`. Total reports: `COUNT(*)` of pairs per manager. Join both to `employees` for the name.

## Solution

```sql
WITH RECURSIVE employees(id, name, manager_id) AS (
  VALUES
    (1, 'Nisha (CEO)', NULL), (2, 'Arjun', 1), (3, 'Bela', 1), (4, 'Chirag', 2), (5, 'Divya', 2), (6, 'Esha', 2),
    (7, 'Farhan', 3), (8, 'Gita', 4), (9, 'Hari', 4), (10, 'Isha', 4), (11, 'Jai', 4), (12, 'Kavya', 4),
    (13, 'Lalit', 4), (14, 'Mira', 4), (15, 'Neel', 4), (16, 'Om', 6)
),
pairs(manager_id, report_id) AS (
  SELECT manager_id, id FROM employees WHERE manager_id IS NOT NULL
  UNION ALL
  SELECT p.manager_id, e.id FROM pairs AS p JOIN employees AS e ON e.manager_id = p.report_id
),
direct AS (
  SELECT manager_id, COUNT(*) AS direct_reports FROM employees WHERE manager_id IS NOT NULL GROUP BY manager_id
),
total AS (
  SELECT manager_id, COUNT(*) AS total_reports FROM pairs GROUP BY manager_id
)
SELECT e.name, d.direct_reports, t.total_reports,
  CASE WHEN d.direct_reports > 7 THEN 'wide' WHEN d.direct_reports = 1 THEN 'narrow' ELSE 'ok' END AS span_flag
FROM direct AS d
JOIN total AS t ON t.manager_id = d.manager_id
JOIN employees AS e ON e.id = d.manager_id
ORDER BY t.total_reports DESC, e.name;
```

## Expected result

| name | direct_reports | total_reports | span_flag |
| --- | --- | --- | --- |
| Nisha (CEO) | 2 | 15 | ok |
| Arjun | 3 | 12 | ok |
| Chirag | 8 | 8 | wide |
| Bela | 1 | 1 | narrow |
| Esha | 1 | 1 | narrow |

## Explanation

Span of control has two sides: how many people report **directly** to a manager, and how many sit anywhere below them. The recursive CTE builds every manager-report pair at any depth by following `manager_id` down one level per step, while keeping the original manager, so counting pairs per manager gives the total organisation below them.

Chirag has 8 direct reports, beyond the usual guideline of about 7, so he is flagged as wide; Bela and Esha each manage one person, often a sign that a layer could be removed. Arjun has only 3 direct reports but 12 people in his organisation, because Chirag's team sits under him.

**Common mistake:** counting direct reports only and calling them the organisation size. Arjun and Nisha look like they lead teams of 3 and 2, instead of 12 and 15.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE employees(id, name, manager_id) AS ( VALUES (1, 'Nisha (CEO)', NULL), (2, 'Arjun', 1), (3, 'Bela', 1), (4, 'Chirag', 2), (5, 'Divya', 2), (6, 'Esha', 2), (7, 'Farhan', 3), (8, 'Gita', 4), (9, 'Hari', 4), (10, 'Isha', 4), (11, 'Jai', 4), (12, 'Kavya', 4), (13, 'Lalit', 4), (14, 'Mira', 4), (15, 'Neel', 4), (16, 'Om', 6) ), direct AS (SELECT manager_id, COUNT(*) AS direct_reports FROM employees WHERE manager_id IS NOT NULL GROUP BY manager_id) SELECT e.name, d.direct_reports, d.direct_reports AS total_reports, CASE WHEN d.direct_reports > 7 THEN 'wide' WHEN d.direct_reports = 1 THEN 'narrow' ELSE 'ok' END AS span_flag FROM direct AS d JOIN employees AS e ON e.id = d.manager_id ORDER BY total_reports DESC, e.name;
```
