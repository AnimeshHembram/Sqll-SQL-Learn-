---
id: da-day-159
title: SLA in business days
order: 159
difficulty: advanced
topic: Temporal analysis
summary: Count working days between two dates with a calendar that skips weekends and holidays.
module: data-analyst
duration: 15
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Count business days with a calendar table
  - Judge open items as of a date
prerequisites:
  - Day 114
  - Day 147
---

## Task

Support promises a resolution within **3 business days**. Business days are Monday to Friday, excluding the dates in `holidays`. A ticket's business days are the business days **after** the day it was opened, up to and including the day it was resolved. Open tickets are counted up to **2025-03-18**.

Return `id`, `business_days` and `sla`: `'met'` if resolved within 3 business days, `'missed'` if more than 3 business days have passed (resolved or not), and `'pending'` if still open but within 3. Sort by `id`.

## Starter query

```sql
WITH RECURSIVE tickets(id, opened, resolved) AS (
  VALUES
    ('T1', '2025-03-03', '2025-03-06'), ('T2', '2025-03-07', '2025-03-12'), ('T3', '2025-03-12', '2025-03-17'),
    ('T4', '2025-03-03', '2025-03-10'), ('T5', '2025-03-13', NULL), ('T6', '2025-03-10', NULL),
    ('T7', '2025-03-01', '2025-03-05')
),
holidays(day) AS (
  VALUES ('2025-03-14')
)
SELECT id, opened, resolved, strftime('%w', opened) AS weekday_number
FROM tickets
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`. `strftime('%w', day)` is 0 for Sunday and 6 for Saturday.
2. Build a March calendar of business days: `calendar(day) AS (SELECT '2025-03-01' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-31')`, keeping days with `strftime('%w', day) NOT IN ('0', '6')` that are not in `holidays`.
3. For each ticket count calendar days with `day > opened AND day <= COALESCE(resolved, '2025-03-18')`. Then decide `sla` with `CASE WHEN business_days > 3 THEN 'missed' WHEN resolved IS NULL THEN 'pending' ELSE 'met' END`.

## Solution

```sql
WITH RECURSIVE tickets(id, opened, resolved) AS (
  VALUES
    ('T1', '2025-03-03', '2025-03-06'), ('T2', '2025-03-07', '2025-03-12'), ('T3', '2025-03-12', '2025-03-17'),
    ('T4', '2025-03-03', '2025-03-10'), ('T5', '2025-03-13', NULL), ('T6', '2025-03-10', NULL),
    ('T7', '2025-03-01', '2025-03-05')
),
holidays(day) AS (
  VALUES ('2025-03-14')
),
calendar(day) AS (
  SELECT '2025-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-31'
),
business_days AS (
  SELECT day FROM calendar
  WHERE strftime('%w', day) NOT IN ('0', '6') AND day NOT IN (SELECT day FROM holidays)
),
counted AS (
  SELECT t.id, t.resolved,
    (SELECT COUNT(*) FROM business_days AS b WHERE b.day > t.opened AND b.day <= COALESCE(t.resolved, '2025-03-18')) AS business_days
  FROM tickets AS t
)
SELECT id, business_days,
  CASE WHEN business_days > 3 THEN 'missed' WHEN resolved IS NULL THEN 'pending' ELSE 'met' END AS sla
FROM counted
ORDER BY id;
```

## Expected result

| id | business_days | sla |
| --- | --- | --- |
| T1 | 3 | met |
| T2 | 3 | met |
| T3 | 2 | met |
| T4 | 5 | missed |
| T5 | 2 | pending |
| T6 | 5 | missed |
| T7 | 3 | met |

## Explanation

Calendar days overstate how long support really took over a weekend. T2 was opened on a Friday and resolved the next Wednesday: five calendar days, but only three business days, so the SLA was met. T3 spans the 14 March holiday and the weekend after it, and took two business days.

A calendar table makes these rules explicit and easy to change: add a holiday and every ticket is recounted. T7 was opened on a Saturday; counting starts from the next business day, Monday. T6 is still open and has passed five business days, so it has already missed its SLA even though it is unresolved.

**Common mistake:** ignoring holidays (T5 and T6 then show one business day too many) or subtracting calendar dates, which makes T2 a breach.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE tickets(id, opened, resolved) AS ( VALUES ('T1', '2025-03-03', '2025-03-06'), ('T2', '2025-03-07', '2025-03-12'), ('T3', '2025-03-12', '2025-03-17'), ('T4', '2025-03-03', '2025-03-10'), ('T5', '2025-03-13', NULL), ('T6', '2025-03-10', NULL), ('T7', '2025-03-01', '2025-03-05') ), holidays(day) AS ( VALUES ('2025-03-14') ), calendar(day) AS (SELECT '2025-03-01' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-31'), business_days AS (SELECT day FROM calendar WHERE strftime('%w', day) NOT IN ('0', '6')), counted AS (SELECT t.id, t.resolved, (SELECT COUNT(*) FROM business_days AS b WHERE b.day > t.opened AND b.day <= COALESCE(t.resolved, '2025-03-18')) AS business_days FROM tickets AS t) SELECT id, business_days, CASE WHEN business_days > 3 THEN 'missed' WHEN resolved IS NULL THEN 'pending' ELSE 'met' END AS sla FROM counted ORDER BY id;
```
