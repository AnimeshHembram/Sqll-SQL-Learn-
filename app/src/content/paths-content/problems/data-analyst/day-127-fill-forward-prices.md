---
id: da-day-127
title: Fill forward prices on a calendar
order: 127
difficulty: advanced
topic: Recursive CTEs
summary: Generate a date for every day with a recursive CTE and carry the last known value forward.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Generate a date spine with a recursive CTE
  - Carry the last known value forward
prerequisites:
  - Day 74
  - Day 94
---

## Task

Prices are only recorded on the days they **change** (in the starter query). Finance needs one row for **every day from 2025-02-28 to 2025-03-10**, with the price in effect that day: the latest change on or before it. Before the first change there is no price (`NULL`). Return `day` and `price`. Sort by `day`.

## Starter query

```sql
WITH RECURSIVE price_changes(day, price) AS (
  VALUES ('2025-03-01', 10.00), ('2025-03-04', 12.50), ('2025-03-08', 11.00)
)
SELECT day, price
FROM price_changes
ORDER BY day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. It already starts with `WITH RECURSIVE`.
2. Generate the calendar: `calendar(day) AS (SELECT '2025-02-28' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-10')`.
3. For each calendar day, take the price of the latest change on or before it: `(SELECT p.price FROM price_changes AS p WHERE p.day <= c.day ORDER BY p.day DESC LIMIT 1)`.

## Solution

```sql
WITH RECURSIVE price_changes(day, price) AS (
  VALUES ('2025-03-01', 10.00), ('2025-03-04', 12.50), ('2025-03-08', 11.00)
),
calendar(day) AS (
  SELECT '2025-02-28'
  UNION ALL
  SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-10'
)
SELECT c.day,
  (SELECT p.price FROM price_changes AS p WHERE p.day <= c.day ORDER BY p.day DESC LIMIT 1) AS price
FROM calendar AS c
ORDER BY c.day;
```

## Expected result

| day | price |
| --- | --- |
| 2025-02-28 | NULL |
| 2025-03-01 | 10 |
| 2025-03-02 | 10 |
| 2025-03-03 | 10 |
| 2025-03-04 | 12.5 |
| 2025-03-05 | 12.5 |
| 2025-03-06 | 12.5 |
| 2025-03-07 | 12.5 |
| 2025-03-08 | 11 |
| 2025-03-09 | 11 |
| 2025-03-10 | 11 |

## Explanation

A recursive CTE is the standard way to make a **date spine**: one row per day, whether or not anything happened. Joining the sparse data onto it then shows every day.

"Fill forward" (also called carry forward or last observation carried forward) uses the most recent known value. 2025-02-28 comes before any price, so it stays `NULL` rather than borrowing a later price; 4 to 7 March all show 12.50.

**Common mistake:** a plain `LEFT JOIN` of the calendar to the changes. Only the three change days get a price and every other day is `NULL`.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE price_changes(day, price) AS ( VALUES ('2025-03-01', 10.00), ('2025-03-04', 12.50), ('2025-03-08', 11.00) ), calendar(day) AS (SELECT '2025-02-28' UNION ALL SELECT date(day, '+1 day') FROM calendar WHERE day < '2025-03-10') SELECT c.day, p.price FROM calendar AS c LEFT JOIN price_changes AS p ON p.day = c.day ORDER BY c.day;
```
