---
id: da-day-256
title: Which tables are stale?
order: 256
difficulty: intermediate
topic: Data quality
summary: Compare each table's latest load with its freshness promise, including tables that never loaded.
module: data-analyst
duration: 12
dataset: bookstore
orderMatters: true
checkColumnNames: true
objectives:
  - Check data freshness
  - Report what never arrived
prerequisites:
  - Day 198
  - Day 74
---

## Task

Each table has a promised maximum age (starter query). At the check time **2025-03-12 09:00**, report every expected table with:

- `last_loaded` (its latest load, `NULL` if it never loaded) and `age_hours` (hours since then, rounded to 1 decimal place),
- `status`: `'missing'` when it never loaded, `'stale'` when older than its `max_age_hours`, otherwise `'fresh'`.

Return `table_name`, `last_loaded`, `age_hours`, `max_age_hours` and `status`. Sort with stale and missing tables first (missing before stale), then `table_name`.

## Starter query

```sql
WITH load_log(table_name, loaded_at) AS (
  VALUES
    ('orders', '2025-03-10 05:50'), ('orders', '2025-03-11 05:55'), ('orders', '2025-03-12 06:05'),
    ('customers', '2025-03-11 06:10'), ('customers', '2025-03-12 05:40'),
    ('products', '2025-03-03 07:00'), ('products', '2025-03-10 07:00'),
    ('payments', '2025-03-12 03:58')
),
expectations(table_name, max_age_hours) AS (
  VALUES ('orders', 24), ('customers', 24), ('products', 168), ('payments', 4), ('returns', 24)
)
SELECT table_name, loaded_at
FROM load_log
ORDER BY table_name, loaded_at;
```

## Hints

1. Keep the `WITH` part of the starter query; it is the data. Write your own `SELECT` after it.
2. Start from `expectations` and `LEFT JOIN` the latest load per table (`MAX(loaded_at)` grouped by table), so a table that never loaded stays.
3. `(julianday('2025-03-12 09:00') - julianday(last_loaded)) * 24` is the age in hours. Sort with a `CASE` on the status (missing 0, stale 1, fresh 2).

## Solution

```sql
WITH load_log(table_name, loaded_at) AS (
  VALUES
    ('orders', '2025-03-10 05:50'), ('orders', '2025-03-11 05:55'), ('orders', '2025-03-12 06:05'),
    ('customers', '2025-03-11 06:10'), ('customers', '2025-03-12 05:40'),
    ('products', '2025-03-03 07:00'), ('products', '2025-03-10 07:00'),
    ('payments', '2025-03-12 03:58')
),
expectations(table_name, max_age_hours) AS (
  VALUES ('orders', 24), ('customers', 24), ('products', 168), ('payments', 4), ('returns', 24)
),
latest AS (
  SELECT table_name, MAX(loaded_at) AS last_loaded FROM load_log GROUP BY table_name
),
checked AS (
  SELECT e.table_name, l.last_loaded, e.max_age_hours,
    (julianday('2025-03-12 09:00') - julianday(l.last_loaded)) * 24 AS age
  FROM expectations AS e
  LEFT JOIN latest AS l ON l.table_name = e.table_name
)
SELECT table_name, last_loaded, ROUND(age, 1) AS age_hours, max_age_hours,
  CASE WHEN last_loaded IS NULL THEN 'missing' WHEN age > max_age_hours THEN 'stale' ELSE 'fresh' END AS status
FROM checked
ORDER BY CASE WHEN last_loaded IS NULL THEN 0 WHEN age > max_age_hours THEN 1 ELSE 2 END, table_name;
```

## Expected result

| table_name | last_loaded | age_hours | max_age_hours | status |
| --- | --- | --- | --- | --- |
| returns | NULL | NULL | 24 | missing |
| payments | 2025-03-12 03:58 | 5 | 4 | stale |
| customers | 2025-03-12 05:40 | 3.3 | 24 | fresh |
| orders | 2025-03-12 06:05 | 2.9 | 24 | fresh |
| products | 2025-03-10 07:00 | 50 | 168 | fresh |

## Explanation

Freshness checks compare each table's latest load with what was promised. `payments` must be at most 4 hours old, but its last load was 5 hours before the check, so dashboards built on it are already out of date. `products` is 50 hours old and still fresh, because it only promises a weekly load.

The most serious finding is the table that never loaded: `returns` has no rows in the load log at all. Starting from `expectations` with a `LEFT JOIN` is what makes it appear; a report built from the load log can only describe tables that loaded. Sorting missing and stale tables first puts the action items at the top.

**Common mistake:** starting from the load log with an inner join. The table that never arrived cannot appear, so the worst failure is invisible.

## Wrong answers

Feedback: missing-rows

```sql
WITH load_log(table_name, loaded_at) AS ( VALUES ('orders', '2025-03-10 05:50'), ('orders', '2025-03-11 05:55'), ('orders', '2025-03-12 06:05'), ('customers', '2025-03-11 06:10'), ('customers', '2025-03-12 05:40'), ('products', '2025-03-03 07:00'), ('products', '2025-03-10 07:00'), ('payments', '2025-03-12 03:58') ), expectations(table_name, max_age_hours) AS ( VALUES ('orders', 24), ('customers', 24), ('products', 168), ('payments', 4), ('returns', 24) ), checked AS (SELECT l.table_name, MAX(l.loaded_at) AS last_loaded, e.max_age_hours, (julianday('2025-03-12 09:00') - julianday(MAX(l.loaded_at))) * 24 AS age FROM load_log AS l JOIN expectations AS e ON e.table_name = l.table_name GROUP BY l.table_name, e.max_age_hours) SELECT table_name, last_loaded, ROUND(age, 1) AS age_hours, max_age_hours, CASE WHEN last_loaded IS NULL THEN 'missing' WHEN age > max_age_hours THEN 'stale' ELSE 'fresh' END AS status FROM checked ORDER BY CASE WHEN last_loaded IS NULL THEN 0 WHEN age > max_age_hours THEN 1 ELSE 2 END, table_name;
```
