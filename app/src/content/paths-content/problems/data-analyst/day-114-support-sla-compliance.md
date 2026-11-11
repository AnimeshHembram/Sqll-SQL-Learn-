---
id: da-day-114
title: Support SLA compliance
order: 114
difficulty: advanced
topic: Business analysis
summary: Judge each ticket against its deadline, and leave out tickets that cannot be judged yet.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Classify rows as pass, fail or not yet known
  - Compare durations with deadlines in seconds
prerequisites:
  - Day 102
  - Day 27
---

## Task

Each support priority has a deadline in hours (`sla`, in the starter query). Measure compliance **as of 2025-03-10 12:00**:

- A resolved ticket **met** the SLA if it was resolved within the allowed hours of opening (exactly on the deadline counts as met).
- An unresolved ticket whose deadline has already passed **breached** it.
- An unresolved ticket still inside its deadline cannot be judged yet and is left out.

Return `priority`, `tickets` (judged tickets), `met_sla` and `met_pct` (rounded to 1 decimal place). Sort by the allowed hours, shortest first.

## Starter query

```sql
WITH tickets(id, priority, opened_at, resolved_at) AS (
  VALUES
    (1, 'urgent', '2025-03-09 08:00', '2025-03-09 11:00'),
    (2, 'urgent', '2025-03-09 09:00', '2025-03-09 13:00'),
    (3, 'urgent', '2025-03-10 10:00', NULL),
    (4, 'high',   '2025-03-08 10:00', '2025-03-09 12:00'),
    (5, 'high',   '2025-03-09 15:00', NULL),
    (6, 'high',   '2025-03-07 09:00', '2025-03-07 20:00'),
    (7, 'normal', '2025-03-05 09:00', NULL),
    (8, 'normal', '2025-03-06 10:00', '2025-03-08 10:00'),
    (9, 'normal', '2025-03-06 12:00', '2025-03-09 13:00')
),
sla(priority, hours) AS (
  VALUES ('urgent', 4), ('high', 24), ('normal', 72)
)
SELECT t.id, t.priority, t.opened_at, t.resolved_at, s.hours
FROM tickets AS t
JOIN sla AS s ON s.priority = t.priority;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Work in seconds: the time taken is `unixepoch(resolved_at) - unixepoch(opened_at)`, and the allowance is `hours * 3600`.
3. In a CTE, give each ticket `met` = 1, 0 or `NULL` with a `CASE`. `COUNT(met)` skips the `NULL`s, so it counts only judged tickets.

## Solution

```sql
WITH tickets(id, priority, opened_at, resolved_at) AS (
  VALUES
    (1, 'urgent', '2025-03-09 08:00', '2025-03-09 11:00'),
    (2, 'urgent', '2025-03-09 09:00', '2025-03-09 13:00'),
    (3, 'urgent', '2025-03-10 10:00', NULL),
    (4, 'high',   '2025-03-08 10:00', '2025-03-09 12:00'),
    (5, 'high',   '2025-03-09 15:00', NULL),
    (6, 'high',   '2025-03-07 09:00', '2025-03-07 20:00'),
    (7, 'normal', '2025-03-05 09:00', NULL),
    (8, 'normal', '2025-03-06 10:00', '2025-03-08 10:00'),
    (9, 'normal', '2025-03-06 12:00', '2025-03-09 13:00')
),
sla(priority, hours) AS (
  VALUES ('urgent', 4), ('high', 24), ('normal', 72)
),
judged AS (
  SELECT t.priority, s.hours,
    CASE
      WHEN t.resolved_at IS NOT NULL
        THEN CASE WHEN unixepoch(t.resolved_at) - unixepoch(t.opened_at) <= s.hours * 3600 THEN 1 ELSE 0 END
      WHEN unixepoch('2025-03-10 12:00') - unixepoch(t.opened_at) > s.hours * 3600 THEN 0
      ELSE NULL
    END AS met
  FROM tickets AS t
  JOIN sla AS s ON s.priority = t.priority
)
SELECT priority,
  COUNT(met) AS tickets,
  SUM(met) AS met_sla,
  ROUND(100.0 * SUM(met) / COUNT(met), 1) AS met_pct
FROM judged
GROUP BY priority, hours
ORDER BY hours;
```

## Expected result

| priority | tickets | met_sla | met_pct |
| --- | --- | --- | --- |
| urgent | 2 | 2 | 100 |
| high | 2 | 1 | 50 |
| normal | 3 | 1 | 33.3 |

## Explanation

Service-level reports must decide what to do with work in progress. Ticket 7 is still open three days after its 72-hour deadline, so it is already a breach. Tickets 3 and 5 are open but within their deadlines; counting them as met would flatter the report, and counting them as breached would be unfair, so they are left out until they can be judged.

Ticket 2 took exactly 4 hours, the urgent limit, and counts as met because the rule says "within". Using `NULL` for "not judged" lets `COUNT(met)` and `SUM(met)` do the right thing without extra filters.

**Common mistake:** treating every open ticket as a breach, which adds tickets 3 and 5 to the counts.

## Wrong answers

Feedback: incorrect-output

```sql
WITH tickets(id, priority, opened_at, resolved_at) AS ( VALUES (1, 'urgent', '2025-03-09 08:00', '2025-03-09 11:00'), (2, 'urgent', '2025-03-09 09:00', '2025-03-09 13:00'), (3, 'urgent', '2025-03-10 10:00', NULL), (4, 'high',   '2025-03-08 10:00', '2025-03-09 12:00'), (5, 'high',   '2025-03-09 15:00', NULL), (6, 'high',   '2025-03-07 09:00', '2025-03-07 20:00'), (7, 'normal', '2025-03-05 09:00', NULL), (8, 'normal', '2025-03-06 10:00', '2025-03-08 10:00'), (9, 'normal', '2025-03-06 12:00', '2025-03-09 13:00') ), sla(priority, hours) AS ( VALUES ('urgent', 4), ('high', 24), ('normal', 72) ), judged AS (SELECT t.priority, s.hours, CASE WHEN t.resolved_at IS NOT NULL AND unixepoch(t.resolved_at) - unixepoch(t.opened_at) <= s.hours * 3600 THEN 1 ELSE 0 END AS met FROM tickets AS t JOIN sla AS s ON s.priority = t.priority) SELECT priority, COUNT(met) AS tickets, SUM(met) AS met_sla, ROUND(100.0 * SUM(met) / COUNT(met), 1) AS met_pct FROM judged GROUP BY priority, hours ORDER BY hours;
```
