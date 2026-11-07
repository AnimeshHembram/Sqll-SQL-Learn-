---
id: da-day-039
title: Rank genres by demand, with ties
order: 39
difficulty: advanced
topic: Window functions
summary: Rank aggregated values and see how RANK treats ties.
module: data-analyst
duration: 10
dataset: bookstore
tables:
  - books
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Rank an aggregate
  - Handle ties with RANK
prerequisites:
  - Day 38
---

## Task

Demand includes every order, even cancelled ones. Return each `genre`, `units` (total quantity ordered, any status) and `demand_rank` using `RANK()` (1 = most units). Sort by `demand_rank`, then `genre`.

## Starter query

```sql
SELECT b.genre, SUM(oi.quantity) AS units
FROM order_items AS oi
JOIN books AS b ON b.id = oi.book_id
GROUP BY b.genre;
```

## Hints

1. A window function can rank an aggregate: `RANK() OVER (ORDER BY SUM(oi.quantity) DESC)`.
2. The window is calculated after `GROUP BY`, so it sees one row per genre.
3. Add `RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS demand_rank` and `ORDER BY demand_rank, b.genre`.

## Solution

```sql
SELECT b.genre, SUM(oi.quantity) AS units,
  RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS demand_rank
FROM order_items AS oi
JOIN books AS b ON b.id = oi.book_id
GROUP BY b.genre
ORDER BY demand_rank, b.genre;
```

## Expected result

| genre | units | demand_rank |
| --- | --- | --- |
| Fantasy | 4 | 1 |
| Mystery | 3 | 2 |
| Science | 3 | 2 |
| Science fiction | 1 | 4 |

## Explanation

Mystery and Science both have 3 units, so `RANK()` gives both 2 and skips 3: Science fiction is ranked 4. `DENSE_RANK()` would rank it 3 and `ROW_NUMBER()` would break the tie arbitrarily. Pick the function that matches how the report should read.

## Wrong answers

Feedback: incorrect-output

```sql
SELECT b.genre, SUM(oi.quantity) AS units, DENSE_RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS demand_rank FROM order_items AS oi JOIN books AS b ON b.id = oi.book_id GROUP BY b.genre ORDER BY demand_rank, b.genre;
```
