---
id: da-day-232
title: Ticket backlog at the end of each day
order: 232
difficulty: advanced
topic: Operations
summary: Count opened, closed and still-open tickets for every day, including days with no activity.
module: data-analyst
duration: 14
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Measure a stock from flows
  - Count conditionally per day
prerequisites:
  - Day 202
  - Day 74
---

## Task

Support tickets have an `opened` date and a `closed` date (`NULL` while open), in the starter query. For each day from **1 to 7 March 2025**, return:

- `opened`: tickets opened that day,
- `closed`: tickets closed that day,
- `backlog`: tickets open at the **end** of that day (opened on or before it, and not closed by the end of it).

Return `day`, `opened`, `closed` and `backlog`, sorted by `day`. Tickets opened before March count in the backlog until they close.

## Starter query

```sql
WITH RECURSIVE tickets(id, opened, closed) AS (
  VALUES
    (1, '2025-03-01', '2025-03-02'), (2, '2025-03-01', NULL), (3, '2025-03-02', '2025-03-02'), (4, '2025-03-03', '2025-03-06'),
    (5, '2025-03-03', '2025-03-04'), (6, '2025-03-05', NULL), (7, '2025-03-06', '2025-03-07'), (8, '2025-02-27', '2025-03-03')
)
SELECT id, opened, closed
FROM tickets
ORDER BY id;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. Add a calendar CTE for the seven days.
2. Join each day to every ticket with `LEFT JOIN tickets AS t ON t.opened <= c.day` and count conditionally: `SUM(t.opened = c.day)`, `SUM(t.closed = c.day)`.
3. Backlog at the end of the day: `SUM(t.closed IS NULL OR t.closed > c.day)`. Wrap the sums in `COALESCE(..., 0)` in case a day had no tickets at all.

## Solution

```sql
WITH RECURSIVE tickets(id, opened, closed) AS (
  VALUES
    (1, '2025-03-01', '2025-03-02'), (2, '2025-03-01', NULL), (3, '2025-03-02', '2025-03-02'), (4, '2025-03-03', '2025-03-06'),
    (5, '2025-03-03', '2025-03-04'), (6, '2025-03-05', NULL), (7, '2025-03-06', '2025-03-07'), (8, '2025-02-27', '2025-03-03')
),
calendar(day) AS (
  SELECT '2025-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-07'
)
SELECT c.day,
  COALESCE(SUM(t.opened = c.day), 0) AS opened,
  COALESCE(SUM(t.closed = c.day), 0) AS closed,
  COALESCE(SUM(t.closed IS NULL OR t.closed > c.day), 0) AS backlog
FROM calendar AS c
LEFT JOIN tickets AS t ON t.opened <= c.day
GROUP BY c.day
ORDER BY c.day;
```

## Expected result

| day | opened | closed | backlog |
| --- | --- | --- | --- |
| 2025-03-01 | 2 | 0 | 3 |
| 2025-03-02 | 1 | 2 | 2 |
| 2025-03-03 | 2 | 1 | 3 |
| 2025-03-04 | 0 | 1 | 2 |
| 2025-03-05 | 1 | 0 | 3 |
| 2025-03-06 | 1 | 1 | 3 |
| 2025-03-07 | 0 | 1 | 2 |

## Explanation

Backlog is a stock built from two flows, tickets opened and tickets closed. Joining each calendar day to all tickets opened on or before it lets one pass count all three: opened that day, closed that day, and still open at its end (no close date yet, or a close date after that day).

Ticket 8 was opened in February and stays in the backlog until it closes on 3 March. Ticket 3 is opened and closed on 2 March, so it adds to both flows but never to an end-of-day backlog. Checking the arithmetic: each day's backlog is the previous day's plus opened minus closed (3 → 2 → 3 → 2 → 3 → 3 → 2). Starting from the calendar keeps every day in the report even if nothing happened.

**Common mistake:** testing `closed >= day`. A ticket closed during the day still counts as open at its end, and every day with closures overstates the backlog.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE tickets(id, opened, closed) AS ( VALUES (1, '2025-03-01', '2025-03-02'), (2, '2025-03-01', NULL), (3, '2025-03-02', '2025-03-02'), (4, '2025-03-03', '2025-03-06'), (5, '2025-03-03', '2025-03-04'), (6, '2025-03-05', NULL), (7, '2025-03-06', '2025-03-07'), (8, '2025-02-27', '2025-03-03') ), calendar(day) AS (SELECT '2025-03-01' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-07') SELECT c.day, COALESCE(SUM(t.opened = c.day), 0) AS opened, COALESCE(SUM(t.closed = c.day), 0) AS closed, COALESCE(SUM(t.closed IS NULL OR t.closed >= c.day), 0) AS backlog FROM calendar AS c LEFT JOIN tickets AS t ON t.opened <= c.day GROUP BY c.day ORDER BY c.day;
```
