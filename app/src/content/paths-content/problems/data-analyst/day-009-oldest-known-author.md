---
id: da-day-009
title: The oldest author on record
order: 9
difficulty: intermediate
topic: Sorting and limiting
summary: Sort by a column with missing values without letting NULL win.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - authors
orderMatters: true
checkColumnNames: true
objectives:
  - Exclude NULL before sorting
  - Notice where NULL sorts
prerequisites:
  - Day 8
  - Data Analyst chapter: Missing values
---

## Task

For an "authors through the ages" display, return the `name` and `born` year of the **oldest author whose birth year is known** (one row).

## Starter query

```sql
SELECT name, born
FROM authors
ORDER BY born
LIMIT 1;
```

## Hints

1. Run the starter query: who comes first, and why?
2. SQLite sorts `NULL` before every number in ascending order.
3. Add `WHERE born IS NOT NULL` before `ORDER BY`.

## Solution

```sql
SELECT name, born
FROM authors
WHERE born IS NOT NULL
ORDER BY born
LIMIT 1;
```

## Expected result

| name | born |
| --- | --- |
| Ken Ito | 1968 |

## Explanation

Ana Ruiz has no birth year, and SQLite puts `NULL` first when sorting ascending, so the starter query wrongly returns her. Excluding unknown years gives Ken Ito (1968).
