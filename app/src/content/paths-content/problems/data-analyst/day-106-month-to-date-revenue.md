---
id: da-day-106
title: Month-to-date revenue for each store
order: 106
difficulty: intermediate
topic: Running totals
summary: Aggregate first, then run a total that restarts for each store and month.
module: data-analyst
duration: 10
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Restart a running total per group and period
  - Aggregate to the right grain before a window
prerequisites:
  - Day 40
  - Data Analyst chapter: Running totals and moving averages
---

## Task

Each store's tills report sales separately, so a store can have **several rows for one day** (in the starter query). Return one row per store and day: `store`, `day`, `revenue` (that day's total) and `mtd`, the store's month-to-date revenue, which **restarts on the 1st** of each month. Sort by `store`, then `day`.

## Starter query

```sql
WITH daily_sales(store, day, revenue) AS (
  VALUES
    ('Pune', '2025-01-30', 120), ('Pune', '2025-01-31', 80),
    ('Pune', '2025-02-01', 40), ('Pune', '2025-02-01', 50), ('Pune', '2025-02-03', 60),
    ('Goa', '2025-01-31', 70), ('Goa', '2025-02-01', 30), ('Goa', '2025-02-02', 45)
)
SELECT store, day, revenue
FROM daily_sales
ORDER BY store, day;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it. First make one row per store and day with `GROUP BY store, day` and `SUM(revenue)`.
2. A running total is `SUM(...) OVER (... ORDER BY day)`. To restart it, partition by the store **and** the month: `PARTITION BY store, strftime('%Y-%m', day)`.
3. A window function can wrap an aggregate: `SUM(SUM(revenue)) OVER (PARTITION BY store, strftime('%Y-%m', day) ORDER BY day)`, or use a CTE for the daily totals.

## Solution

```sql
WITH daily_sales(store, day, revenue) AS (
  VALUES
    ('Pune', '2025-01-30', 120), ('Pune', '2025-01-31', 80),
    ('Pune', '2025-02-01', 40), ('Pune', '2025-02-01', 50), ('Pune', '2025-02-03', 60),
    ('Goa', '2025-01-31', 70), ('Goa', '2025-02-01', 30), ('Goa', '2025-02-02', 45)
),
store_days AS (
  SELECT store, day, SUM(revenue) AS revenue
  FROM daily_sales
  GROUP BY store, day
)
SELECT store, day, revenue,
  SUM(revenue) OVER (PARTITION BY store, strftime('%Y-%m', day) ORDER BY day) AS mtd
FROM store_days
ORDER BY store, day;
```

## Expected result

| store | day | revenue | mtd |
| --- | --- | --- | --- |
| Goa | 2025-01-31 | 70 | 70 |
| Goa | 2025-02-01 | 30 | 30 |
| Goa | 2025-02-02 | 45 | 75 |
| Pune | 2025-01-30 | 120 | 120 |
| Pune | 2025-01-31 | 80 | 200 |
| Pune | 2025-02-01 | 90 | 90 |
| Pune | 2025-02-03 | 60 | 150 |

## Explanation

A running total adds every earlier row in its partition. Partitioning by store and month makes it restart for each store on the first day of each month, so Pune's total drops from 200 on 31 January to 90 on 1 February.

The daily step matters: Pune has two till rows on 1 February. Without grouping first, the result has two rows for that day, and the first of them shows a month-to-date figure that never existed.

**Common mistakes:** partitioning only by store, so January's sales carry into February; and running the total over raw till rows.

## Other accepted answers

```sql
WITH daily_sales(store, day, revenue) AS (
  VALUES
    ('Pune', '2025-01-30', 120), ('Pune', '2025-01-31', 80),
    ('Pune', '2025-02-01', 40), ('Pune', '2025-02-01', 50), ('Pune', '2025-02-03', 60),
    ('Goa', '2025-01-31', 70), ('Goa', '2025-02-01', 30), ('Goa', '2025-02-02', 45)
)
SELECT store, day, SUM(revenue) AS revenue,
  SUM(SUM(revenue)) OVER (PARTITION BY store, strftime('%Y-%m', day) ORDER BY day) AS mtd
FROM daily_sales
GROUP BY store, day
ORDER BY store, day;
```

## Wrong answers

Feedback: incorrect-output

```sql
WITH daily_sales(store, day, revenue) AS ( VALUES ('Pune', '2025-01-30', 120), ('Pune', '2025-01-31', 80), ('Pune', '2025-02-01', 40), ('Pune', '2025-02-01', 50), ('Pune', '2025-02-03', 60), ('Goa', '2025-01-31', 70), ('Goa', '2025-02-01', 30), ('Goa', '2025-02-02', 45) ) SELECT store, day, revenue, SUM(revenue) OVER (PARTITION BY store, strftime('%Y-%m', day) ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS mtd FROM daily_sales ORDER BY store, day;
```

Feedback: incorrect-output

```sql
WITH daily_sales(store, day, revenue) AS ( VALUES ('Pune', '2025-01-30', 120), ('Pune', '2025-01-31', 80), ('Pune', '2025-02-01', 40), ('Pune', '2025-02-01', 50), ('Pune', '2025-02-03', 60), ('Goa', '2025-01-31', 70), ('Goa', '2025-02-01', 30), ('Goa', '2025-02-02', 45) ), store_days AS (SELECT store, day, SUM(revenue) AS revenue FROM daily_sales GROUP BY store, day) SELECT store, day, revenue, SUM(revenue) OVER (PARTITION BY store ORDER BY day) AS mtd FROM store_days ORDER BY store, day;
```
