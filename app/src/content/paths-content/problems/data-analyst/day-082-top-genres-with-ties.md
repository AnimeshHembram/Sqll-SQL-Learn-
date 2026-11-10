---
id: da-day-082
title: Top two genres, keeping ties
order: 82
difficulty: advanced
topic: Reporting
summary: Return the top N without silently dropping tied rows.
module: data-analyst
duration: 9
dataset: bookstore
tables:
  - books
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Return the top N including ties
prerequisites:
  - Day 39
  - Day 43
---

## Task

The monthly memo lists the **top two genres by units ordered** (any status), and if genres tie for a place, all of them are listed. Return `genre` and `units`. Sort by `units`, highest first, then `genre`.

## Starter query

```sql
SELECT b.genre, SUM(oi.quantity) AS units
FROM order_items AS oi
JOIN books AS b ON b.id = oi.book_id
GROUP BY b.genre
ORDER BY units DESC
LIMIT 2;
```

## Hints

1. Run the starter query: Mystery and Science tie for second place, but `LIMIT 2` keeps only one of them.
2. Rank the genres with `RANK()` in a CTE, then keep ranks 1 and 2.
3. `RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS place`, then `WHERE place <= 2`.

## Solution

```sql
WITH ranked AS (
  SELECT b.genre, SUM(oi.quantity) AS units,
    RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS place
  FROM order_items AS oi
  JOIN books AS b ON b.id = oi.book_id
  GROUP BY b.genre
)
SELECT genre, units
FROM ranked
WHERE place <= 2
ORDER BY units DESC, genre;
```

## Expected result

| genre | units |
| --- | --- |
| Fantasy | 4 |
| Mystery | 3 |
| Science | 3 |

## Explanation

`LIMIT` cuts after a fixed number of rows, so which tied genre survives depends on chance. Filtering on `RANK()` keeps all genres that share a place: three rows here. Reports that say "top 2" should state how ties are handled.

## Wrong answers

Feedback: missing-rows

```sql
SELECT b.genre, SUM(oi.quantity) AS units FROM order_items AS oi JOIN books AS b ON b.id = oi.book_id GROUP BY b.genre ORDER BY units DESC, b.genre LIMIT 2;
```
