---
id: da-day-185
title: When do orders arrive? A weekday heatmap
order: 185
difficulty: intermediate
topic: Reporting
summary: Build a complete weekday × time-band grid, with zeros for empty cells, from timestamps.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Pivot counts into a complete grid
  - Reorder SQLite weekday numbers
prerequisites:
  - Day 56
  - Day 155
---

## Task

Operations wants to staff by demand (orders in the starter query). Build a grid of **every weekday (Monday to Sunday) × every time band**: `'morning'` (06:00–11:59), `'afternoon'` (12:00–17:59) and `'evening'` (18:00–23:59). Cells without orders show 0.

Return `weekday` (`'Mon'` … `'Sun'`), `morning`, `afternoon` and `evening` (order counts). Sort Monday to Sunday.

## Starter query

```sql
WITH RECURSIVE orders(id, placed_at) AS (
  VALUES
    (1, '2025-03-03 09:15'), (2, '2025-03-03 10:40'), (3, '2025-03-04 13:05'), (4, '2025-03-05 19:30'),
    (5, '2025-03-08 11:00'), (6, '2025-03-08 11:20'), (7, '2025-03-09 21:45'), (8, '2025-03-10 08:59'),
    (9, '2025-03-10 12:00'), (10, '2025-03-14 17:59')
)
SELECT id, placed_at, strftime('%w', placed_at) AS weekday_number
FROM orders
ORDER BY placed_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`. `strftime('%w', ...)` is 0 for Sunday.
2. Generate the seven days with a recursive CTE (0 to 6) and give each a sort position where Monday is 1 and Sunday 7: `(n + 6) % 7 + 1`. Label with `substr('SunMonTueWedThuFriSat', n * 3 + 1, 3)`.
3. `LEFT JOIN` the orders on the weekday number and count per band with `SUM(CASE WHEN hour BETWEEN 6 AND 11 THEN 1 ELSE 0 END)`, where `hour = CAST(strftime('%H', placed_at) AS INTEGER)`.

## Solution

```sql
WITH RECURSIVE orders(id, placed_at) AS (
  VALUES
    (1, '2025-03-03 09:15'), (2, '2025-03-03 10:40'), (3, '2025-03-04 13:05'), (4, '2025-03-05 19:30'),
    (5, '2025-03-08 11:00'), (6, '2025-03-08 11:20'), (7, '2025-03-09 21:45'), (8, '2025-03-10 08:59'),
    (9, '2025-03-10 12:00'), (10, '2025-03-14 17:59')
),
weekdays(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM weekdays WHERE n < 6
),
timed AS (
  SELECT CAST(strftime('%w', placed_at) AS INTEGER) AS n, CAST(strftime('%H', placed_at) AS INTEGER) AS hour FROM orders
)
SELECT substr('SunMonTueWedThuFriSat', w.n * 3 + 1, 3) AS weekday,
  SUM(CASE WHEN t.hour BETWEEN 6 AND 11 THEN 1 ELSE 0 END) AS morning,
  SUM(CASE WHEN t.hour BETWEEN 12 AND 17 THEN 1 ELSE 0 END) AS afternoon,
  SUM(CASE WHEN t.hour BETWEEN 18 AND 23 THEN 1 ELSE 0 END) AS evening
FROM weekdays AS w
LEFT JOIN timed AS t ON t.n = w.n
GROUP BY w.n
ORDER BY (w.n + 6) % 7;
```

## Expected result

| weekday | morning | afternoon | evening |
| --- | --- | --- | --- |
| Mon | 3 | 1 | 0 |
| Tue | 0 | 1 | 0 |
| Wed | 0 | 0 | 1 |
| Thu | 0 | 0 | 0 |
| Fri | 0 | 1 | 0 |
| Sat | 2 | 0 | 0 |
| Sun | 0 | 0 | 1 |

## Explanation

A heatmap is only honest when the empty cells are there: Thursday has no orders at all, and a grid that silently drops it would mislead whoever plans the rota. Generating the seven weekdays first and joining the orders to them keeps every row; a `SUM(CASE ...)` per band keeps every column.

Two details trip people up. SQLite numbers weekdays from Sunday (0), so `(n + 6) % 7` turns that into a Monday-first order. The band edges are inclusive hours: 17:59 is still afternoon, and 08:59 is morning.

**Common mistake:** grouping the orders alone by weekday, which drops Thursday and starts the week on Sunday.

## Wrong answers

Feedback: missing-rows

```sql
WITH RECURSIVE orders(id, placed_at) AS ( VALUES (1, '2025-03-03 09:15'), (2, '2025-03-03 10:40'), (3, '2025-03-04 13:05'), (4, '2025-03-05 19:30'), (5, '2025-03-08 11:00'), (6, '2025-03-08 11:20'), (7, '2025-03-09 21:45'), (8, '2025-03-10 08:59'), (9, '2025-03-10 12:00'), (10, '2025-03-14 17:59') ), timed AS (SELECT CAST(strftime('%w', placed_at) AS INTEGER) AS n, CAST(strftime('%H', placed_at) AS INTEGER) AS hour FROM orders) SELECT substr('SunMonTueWedThuFriSat', n * 3 + 1, 3) AS weekday, SUM(CASE WHEN hour BETWEEN 6 AND 11 THEN 1 ELSE 0 END) AS morning, SUM(CASE WHEN hour BETWEEN 12 AND 17 THEN 1 ELSE 0 END) AS afternoon, SUM(CASE WHEN hour BETWEEN 18 AND 23 THEN 1 ELSE 0 END) AS evening FROM timed GROUP BY n ORDER BY (n + 6) % 7;
```
