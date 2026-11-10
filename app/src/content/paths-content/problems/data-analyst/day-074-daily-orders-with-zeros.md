---
id: da-day-074
title: Orders per day, including quiet days
order: 74
difficulty: advanced
topic: Data quality
summary: Build a date spine with a recursive CTE so days without orders still appear.
module: data-analyst
duration: 12
dataset: bookstore
tables:
  - orders
orderMatters: true
checkColumnNames: true
objectives:
  - Build a date spine
  - Count matches after a LEFT JOIN
prerequisites:
  - Day 73
  - Day 57
---

## Task

For a daily chart of the first week and a bit of March, return every date from **2025-03-01 to 2025-03-09** as `day`, with `orders`: the number of orders placed that day (any status), `0` if none. Sort by `day`.

## Starter query

```sql
SELECT order_date AS day, COUNT(*) AS orders
FROM orders
WHERE order_date BETWEEN '2025-03-01' AND '2025-03-09'
GROUP BY order_date;
```

## Hints

1. The starter query only returns days that had orders. Generate every day first.
2. `WITH RECURSIVE days(day) AS (SELECT '2025-03-01' UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < '2025-03-09')`
3. `LEFT JOIN orders AS o ON o.order_date = d.day`, then `GROUP BY d.day` and `COUNT(o.id)`.

## Solution

```sql
WITH RECURSIVE days(day) AS (
  SELECT '2025-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '2025-03-09'
)
SELECT d.day, COUNT(o.id) AS orders
FROM days AS d
LEFT JOIN orders AS o ON o.order_date = d.day
GROUP BY d.day
ORDER BY d.day;
```

## Expected result

| day | orders |
| --- | --- |
| 2025-03-01 | 1 |
| 2025-03-02 | 0 |
| 2025-03-03 | 0 |
| 2025-03-04 | 0 |
| 2025-03-05 | 0 |
| 2025-03-06 | 0 |
| 2025-03-07 | 0 |
| 2025-03-08 | 0 |
| 2025-03-09 | 1 |

## Explanation

A table of every date, called a date spine, guarantees one row per day. `COUNT(o.id)` counts only matched orders, so empty days get 0; `COUNT(*)` would count the unmatched row itself and wrongly give 1.

## Wrong answers

Feedback: incorrect-output

```sql
WITH RECURSIVE days(day) AS (SELECT '2025-03-01' UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < '2025-03-09') SELECT d.day, COUNT(*) AS orders FROM days AS d LEFT JOIN orders AS o ON o.order_date = d.day GROUP BY d.day ORDER BY d.day;
```
