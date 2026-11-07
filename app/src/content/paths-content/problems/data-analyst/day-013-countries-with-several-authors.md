---
id: da-day-013
title: Countries with several authors
order: 13
difficulty: intermediate
topic: Grouping
summary: Keep only the groups that pass a condition, with HAVING.
module: data-analyst
duration: 6
dataset: bookstore
tables:
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Filter groups with HAVING
prerequisites:
  - Day 12
---

## Task

Which countries have **more than one** author in the catalogue? Return `country` and `authors` (the number of authors). Row order does not matter.

## Starter query

```sql
SELECT country, COUNT(*) AS authors
FROM authors
GROUP BY country;
```

## Hints

1. The starter query counts authors per country. Now remove some groups.
2. A condition on a count goes in `HAVING`, after `GROUP BY`.
3. `HAVING COUNT(*) > 1`

## Solution

```sql
SELECT country, COUNT(*) AS authors
FROM authors
GROUP BY country
HAVING COUNT(*) > 1;
```

## Expected result

| country | authors |
| --- | --- |
| India | 2 |

## Explanation

Only India has two authors (Mira Das and Priya Nair). `HAVING` filters groups after counting; `WHERE` cannot use `COUNT`.
