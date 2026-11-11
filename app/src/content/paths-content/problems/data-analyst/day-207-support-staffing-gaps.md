---
id: da-day-207
title: Case study: support staffing against demand
order: 207
difficulty: advanced
topic: Case studies
summary: Expand shifts into hours, compare agents on duty with the agents demand requires, and find the gaps.
module: data-analyst
duration: 16
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Expand shifts into hourly coverage
  - Round capacity requirements up
prerequisites:
  - Day 202
  - Day 159
---

## Task

Support expects the tickets per hour shown in the starter query; one agent handles **8 tickets an hour**. Agents work the shifts in `shifts` (from `starts` up to, but not including, `ends`). For each hour from 9 to 15, return:

- `hour`, `tickets`, `agents_needed` (tickets ÷ 8, rounded **up**),
- `agents_on_duty` and `on_duty` (their names, alphabetical, joined with `','`),
- `gap` (on duty − needed; negative means understaffed).

Sort by `hour`.

## Starter query

```sql
WITH RECURSIVE tickets_by_hour(hour, tickets) AS (
  VALUES (9, 30), (10, 48), (11, 55), (12, 20), (13, 41), (14, 36), (15, 12)
),
shifts(agent, starts, ends) AS (
  VALUES ('Ana', 9, 13), ('Ben', 9, 17), ('Cy', 10, 14), ('Dee', 12, 16), ('Eli', 13, 17), ('Fay', 11, 12)
)
SELECT agent, starts, ends
FROM shifts
ORDER BY starts;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`, in case you want to generate hours, but `tickets_by_hour` already lists them.
2. An agent is on duty in an hour when `starts <= hour AND hour < ends`. `LEFT JOIN shifts` on that condition, so an hour with nobody on duty would still appear.
3. `ceil(tickets / 8.0)` rounds up. Count `s.agent` (not `*`) for agents on duty, and build the names with `group_concat(s.agent, ',' ORDER BY s.agent)`.

## Solution

```sql
WITH RECURSIVE tickets_by_hour(hour, tickets) AS (
  VALUES (9, 30), (10, 48), (11, 55), (12, 20), (13, 41), (14, 36), (15, 12)
),
shifts(agent, starts, ends) AS (
  VALUES ('Ana', 9, 13), ('Ben', 9, 17), ('Cy', 10, 14), ('Dee', 12, 16), ('Eli', 13, 17), ('Fay', 11, 12)
)
SELECT t.hour, t.tickets,
  CAST(ceil(t.tickets / 8.0) AS INTEGER) AS agents_needed,
  COUNT(s.agent) AS agents_on_duty,
  group_concat(s.agent, ',' ORDER BY s.agent) AS on_duty,
  COUNT(s.agent) - CAST(ceil(t.tickets / 8.0) AS INTEGER) AS gap
FROM tickets_by_hour AS t
LEFT JOIN shifts AS s ON s.starts <= t.hour AND t.hour < s.ends
GROUP BY t.hour, t.tickets
ORDER BY t.hour;
```

## Expected result

| hour | tickets | agents_needed | agents_on_duty | on_duty | gap |
| --- | --- | --- | --- | --- | --- |
| 9 | 30 | 4 | 2 | Ana,Ben | -2 |
| 10 | 48 | 6 | 3 | Ana,Ben,Cy | -3 |
| 11 | 55 | 7 | 4 | Ana,Ben,Cy,Fay | -3 |
| 12 | 20 | 3 | 4 | Ana,Ben,Cy,Dee | 1 |
| 13 | 41 | 6 | 4 | Ben,Cy,Dee,Eli | -2 |
| 14 | 36 | 5 | 3 | Ben,Dee,Eli | -2 |
| 15 | 12 | 2 | 3 | Ben,Dee,Eli | 1 |

## Explanation

Workforce planning compares two curves, demand and supply, hour by hour. Joining each hour to the shifts covering it turns a rota into supply per hour; dividing demand by productivity and rounding **up** turns tickets into required agents (5.5 agents means 6 people, not 5).

The result shows where to move people: the 10:00 and 11:00 peaks are three agents short, and 9:00, 13:00 and 14:00 two short, while 12:00 and 15:00 each have one agent to spare. Fay's one-hour 11:00 shift is counted only in that hour because her shift ends at 12 and `hour < ends` excludes it.

**Common mistake:** `ROUND(tickets / 8.0)` (or integer division), which says 5 agents can cover 41 tickets an hour and understates every gap.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE tickets_by_hour(hour, tickets) AS ( VALUES (9, 30), (10, 48), (11, 55), (12, 20), (13, 41), (14, 36), (15, 12) ), shifts(agent, starts, ends) AS ( VALUES ('Ana', 9, 13), ('Ben', 9, 17), ('Cy', 10, 14), ('Dee', 12, 16), ('Eli', 13, 17), ('Fay', 11, 12) ) SELECT t.hour, t.tickets, t.tickets / 8 AS agents_needed, COUNT(s.agent) AS agents_on_duty, group_concat(s.agent, ',' ORDER BY s.agent) AS on_duty, COUNT(s.agent) - t.tickets / 8 AS gap FROM tickets_by_hour AS t LEFT JOIN shifts AS s ON s.starts <= t.hour AND t.hour < s.ends GROUP BY t.hour, t.tickets ORDER BY t.hour;
```
