---
id: da-day-028
title: Data gaps report
order: 28
difficulty: intermediate
topic: Missing values
summary: Count missing values in two tables in one summary row.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - customers
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Count NULL values
  - Combine results from several tables in one row
prerequisites:
  - Day 9
  - Data Analyst chapter: Missing values
---

## Task

Before a data review, return one row with two columns: `customers_without_city` and `authors_without_birth_year`.

## Starter query

```sql
SELECT COUNT(*) AS customers_without_city
FROM customers
WHERE city IS NULL;
```

## Hints

1. The starter query answers the first column. You need a second count from another table in the same row.
2. Scalar subqueries can sit side by side in one `SELECT`.
3. `SELECT (SELECT COUNT(*) FROM customers WHERE city IS NULL) AS customers_without_city, (SELECT COUNT(*) FROM authors WHERE born IS NULL) AS authors_without_birth_year`

## Solution

```sql
SELECT
  (SELECT COUNT(*) FROM customers WHERE city IS NULL) AS customers_without_city,
  (SELECT COUNT(*) FROM authors WHERE born IS NULL) AS authors_without_birth_year;
```

## Expected result

| customers_without_city | authors_without_birth_year |
| --- | --- |
| 1 | 1 |

## Explanation

Each subquery counts the `NULL` values in its own table, and the outer `SELECT` puts the counts side by side. One value is missing in each table.

## Other accepted answers

```sql
SELECT (SELECT COUNT(*) - COUNT(city) FROM customers) AS customers_without_city, (SELECT COUNT(*) - COUNT(born) FROM authors) AS authors_without_birth_year;
```
