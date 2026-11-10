---
id: da-day-086
title: Profile the customers table
order: 86
difficulty: intermediate
topic: Data quality
summary: Describe a table in one row: size, distinct values, gaps and range.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
orderMatters: false
checkColumnNames: true
objectives:
  - Profile a table
prerequisites:
  - Day 28
  - Day 14
---

## Task

Before using a table, analysts profile it. Return one row describing `customers` with `total_rows`, `distinct_cities` (different known cities), `missing_cities`, `first_joined` and `last_joined`.

## Starter query

```sql
SELECT *
FROM customers;
```

## Hints

1. Every column is an aggregate over the whole table, so there is no `GROUP BY`.
2. `COUNT(DISTINCT city)` ignores `NULL`; `COUNT(*) - COUNT(city)` counts the missing ones.
3. `SELECT COUNT(*) AS total_rows, COUNT(DISTINCT city) AS distinct_cities, COUNT(*) - COUNT(city) AS missing_cities, MIN(joined) AS first_joined, MAX(joined) AS last_joined FROM customers`

## Solution

```sql
SELECT COUNT(*) AS total_rows,
  COUNT(DISTINCT city) AS distinct_cities,
  COUNT(*) - COUNT(city) AS missing_cities,
  MIN(joined) AS first_joined,
  MAX(joined) AS last_joined
FROM customers;
```

## Expected result

| total_rows | distinct_cities | missing_cities | first_joined | last_joined |
| --- | --- | --- | --- | --- |
| 5 | 3 | 1 | 2024-01-15 | 2025-06-30 |

## Explanation

Five customers live in three known cities, one city is missing, and sign-ups run from January 2024 to June 2025. `COUNT(column)` skips `NULL` while `COUNT(*)` does not, and the difference is the number of gaps.

## Other accepted answers

```sql
SELECT COUNT(*) AS total_rows, COUNT(DISTINCT city) AS distinct_cities, SUM(CASE WHEN city IS NULL THEN 1 ELSE 0 END) AS missing_cities, MIN(joined) AS first_joined, MAX(joined) AS last_joined FROM customers;
```
