---
id: da-missing-birth-years
title: Authors with an unknown birth year
order: 2
difficulty: beginner
topic: IS NULL
summary: Find the rows where a value is missing with IS NULL.
module: data-analyst
duration: 5
dataset: bookstore
tables:
  - authors
orderMatters: false
checkColumnNames: true
objectives:
  - Filter for missing values with IS NULL
---

## Task

The catalogue team wants to complete the author records. Return the `name` of every author whose birth year (`born`) is missing.

**Steps**

1. The starter query uses `= NULL`. Run it: it returns nothing.
2. Replace `= NULL` with `IS NULL`.

## Starter query

```sql
SELECT name
FROM authors
WHERE born = NULL;
```

## Hints

1. A comparison with `NULL` using `=` is never true, so no row matches.
2. SQL has a special test for missing values.
3. `WHERE born IS NULL`.

## Solution

```sql
SELECT name
FROM authors
WHERE born IS NULL;
```

## Expected result

| name |
| --- |
| Ana Ruiz |

## Explanation

Only Ana Ruiz has no recorded birth year. `IS NULL` is the only test that finds missing values; `= NULL` compares with an unknown value and is never true.
