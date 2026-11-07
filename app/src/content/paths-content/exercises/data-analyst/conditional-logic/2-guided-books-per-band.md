---
id: da-books-per-band
title: How many books in each price band
order: 2
difficulty: beginner
topic: CASE and GROUP BY
summary: Group books by a price band you define with CASE and count each band.
module: data-analyst
duration: 8
dataset: bookstore
tables:
  - books
orderMatters: false
checkColumnNames: true
objectives:
  - Group rows by a CASE expression
  - Count the rows in each category
---

## Task

The pricing team uses two bands: books **under 13** are `'Under 13'`, all others are `'13 and over'`. Return one row per band with:

- `band`
- `books`: how many books are in the band

Row order does not matter.

**Steps**

1. The starter query already labels each book. Replace `title,` with nothing: you want one row per band, not per book.
2. Add `COUNT(*) AS books` to the `SELECT` list.
3. Add `GROUP BY band` after `FROM books`.

## Starter query

```sql
SELECT title,
  CASE WHEN price < 13 THEN 'Under 13' ELSE '13 and over' END AS band
FROM books;
```

## Hints

1. One row per band means grouping by the band.
2. SQLite lets you group by the alias: `GROUP BY band`.
3. `SELECT CASE ... END AS band, COUNT(*) AS books FROM books GROUP BY band`.

## Solution

```sql
SELECT
  CASE WHEN price < 13 THEN 'Under 13' ELSE '13 and over' END AS band,
  COUNT(*) AS books
FROM books
GROUP BY band;
```

## Expected result

| band | books |
| --- | --- |
| 13 and over | 3 |
| Under 13 | 3 |

## Explanation

Three books cost less than 13 (9.99, 11.25 and 12.99) and three cost 13 or more. Grouping by the `CASE` result puts each book in one of the two groups.
