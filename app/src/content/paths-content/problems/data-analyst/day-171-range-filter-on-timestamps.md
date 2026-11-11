---
id: da-day-171
title: Filter timestamps with a range
order: 171
difficulty: intermediate
topic: Query performance
summary: Write index-friendly date filters on timestamp text and get the boundaries right.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Write index-friendly (sargable) filters
  - Use half-open ranges on timestamps
prerequisites:
  - Day 160
  - Day 106
---

## Task

The orders table (in the starter query) stores `created_at` as `'YYYY-MM-DD HH:MM:SS'` text and, in production, has an index on it. Report the first quarter of 2025: for each month, `month` (`'YYYY-MM'`), `orders` and `revenue`.

Filter with a **range on the raw column** so the index can be used: on or after the first moment of the quarter and **before** the first moment of the next. Sort by `month`.

## Starter query

```sql
WITH timed_orders(id, created_at, amount) AS (
  VALUES
    (1, '2024-12-31 23:59:59', 40), (2, '2025-01-01 00:00:00', 25), (3, '2025-01-15 12:30:00', 60),
    (4, '2025-02-01 08:00:00', 35), (5, '2025-02-28 23:10:00', 20), (6, '2025-03-31 00:00:00', 50),
    (7, '2025-03-31 18:20:00', 75), (8, '2025-04-01 00:00:00', 90)
)
SELECT id, created_at, amount
FROM timed_orders
ORDER BY created_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Compare the column itself, not a function of it: `created_at >= '2025-01-01' AND created_at < '2025-04-01'`. Text in this format sorts in time order.
3. Group by `substr(created_at, 1, 7)` for the month. The function in `SELECT` and `GROUP BY` is fine; only the filter needs the bare column.

## Solution

```sql
WITH timed_orders(id, created_at, amount) AS (
  VALUES
    (1, '2024-12-31 23:59:59', 40), (2, '2025-01-01 00:00:00', 25), (3, '2025-01-15 12:30:00', 60),
    (4, '2025-02-01 08:00:00', 35), (5, '2025-02-28 23:10:00', 20), (6, '2025-03-31 00:00:00', 50),
    (7, '2025-03-31 18:20:00', 75), (8, '2025-04-01 00:00:00', 90)
)
SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS orders, SUM(amount) AS revenue
FROM timed_orders
WHERE created_at >= '2025-01-01' AND created_at < '2025-04-01'
GROUP BY substr(created_at, 1, 7)
ORDER BY month;
```

## Expected result

| month | orders | revenue |
| --- | --- | --- |
| 2025-01 | 2 | 85 |
| 2025-02 | 2 | 55 |
| 2025-03 | 2 | 125 |

## Explanation

A filter is **sargable** (search-argument-able) when the database can use an index to jump to the matching rows. `WHERE strftime('%Y', created_at) = '2025'` gives the same rows but forces the database to compute the function for every row in the table; `created_at >= ... AND created_at < ...` lets it read only the quarter. On millions of rows that is the difference between milliseconds and seconds.

The half-open range also gets the boundaries right. `BETWEEN '2025-01-01' AND '2025-03-31'` compares text, and `'2025-03-31 18:20:00'` sorts **after** `'2025-03-31'`, so the evening order on 31 March is lost; `< '2025-04-01'` includes the whole last day and excludes midnight on 1 April.

**Common mistake:** `BETWEEN` with a date-only end on timestamp data, which silently drops the last day's orders after midnight.

## Wrong answers

Feedback: missing-rows

```sql
WITH timed_orders(id, created_at, amount) AS ( VALUES (1, '2024-12-31 23:59:59', 40), (2, '2025-01-01 00:00:00', 25), (3, '2025-01-15 12:30:00', 60), (4, '2025-02-01 08:00:00', 35), (5, '2025-02-28 23:10:00', 20), (6, '2025-03-31 00:00:00', 50), (7, '2025-03-31 18:20:00', 75), (8, '2025-04-01 00:00:00', 90) ) SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS orders, SUM(amount) AS revenue FROM timed_orders WHERE created_at BETWEEN '2025-01-01' AND '2025-03-31' GROUP BY substr(created_at, 1, 7) ORDER BY month;
```
