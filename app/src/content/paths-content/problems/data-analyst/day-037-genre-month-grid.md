---
id: da-day-037
title: A complete genre-by-month grid
order: 37
difficulty: advanced
topic: Joins
summary: Build every combination with CROSS JOIN, then fill gaps with zero.
module: data-analyst
duration: 14
dataset: bookstore
tables:
  - books
  - orders
  - order_items
orderMatters: true
checkColumnNames: true
objectives:
  - Generate every combination with CROSS JOIN
  - Fill missing combinations with COALESCE
prerequisites:
  - Day 29
  - Data Analyst chapter: Missing values
---

## Task

A chart needs a value for **every genre in every month**, even when nothing sold. Return `month` (`YYYY-MM`), `genre` and `units`: books sold in that genre and month, not counting cancelled orders, and `0` where none were sold. Sort by `month`, then `genre`.

## Starter query

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, b.genre, SUM(oi.quantity) AS units
FROM orders AS o
JOIN order_items AS oi ON oi.order_id = o.id
JOIN books AS b ON b.id = oi.book_id
WHERE o.status <> 'cancelled'
GROUP BY month, b.genre
ORDER BY month, b.genre;
```

## Hints

1. The starter query only has rows for combinations that sold. Missing combinations must appear with 0.
2. Build the grid first: `(SELECT DISTINCT genre FROM books) CROSS JOIN (SELECT DISTINCT strftime('%Y-%m', order_date) AS month FROM orders)`. Then `LEFT JOIN` the sales to it.
3. Put the starter query in a CTE called `sales`, `LEFT JOIN` it on month and genre, and use `COALESCE(s.units, 0)`.

## Solution

```sql
WITH sales AS (
  SELECT strftime('%Y-%m', o.order_date) AS month, b.genre, SUM(oi.quantity) AS units
  FROM orders AS o
  JOIN order_items AS oi ON oi.order_id = o.id
  JOIN books AS b ON b.id = oi.book_id
  WHERE o.status <> 'cancelled'
  GROUP BY month, b.genre
),
grid AS (
  SELECT m.month, g.genre
  FROM (SELECT DISTINCT strftime('%Y-%m', order_date) AS month FROM orders) AS m
  CROSS JOIN (SELECT DISTINCT genre FROM books) AS g
)
SELECT grid.month, grid.genre, COALESCE(s.units, 0) AS units
FROM grid
LEFT JOIN sales AS s ON s.month = grid.month AND s.genre = grid.genre
ORDER BY grid.month, grid.genre;
```

## Expected result

| month | genre | units |
| --- | --- | --- |
| 2025-01 | Fantasy | 1 |
| 2025-01 | Mystery | 1 |
| 2025-01 | Science | 2 |
| 2025-01 | Science fiction | 0 |
| 2025-02 | Fantasy | 1 |
| 2025-02 | Mystery | 0 |
| 2025-02 | Science | 0 |
| 2025-02 | Science fiction | 1 |
| 2025-03 | Fantasy | 2 |
| 2025-03 | Mystery | 1 |
| 2025-03 | Science | 1 |
| 2025-03 | Science fiction | 0 |

## Explanation

`CROSS JOIN` pairs every month with every genre: 3 months × 4 genres = 12 rows. The `LEFT JOIN` keeps every cell and `COALESCE` turns the empty ones into 0, so a chart shows a gap as zero instead of skipping it.

## Wrong answers

Feedback: missing-rows

```sql
SELECT strftime('%Y-%m', o.order_date) AS month, b.genre, SUM(oi.quantity) AS units FROM orders AS o JOIN order_items AS oi ON oi.order_id = o.id JOIN books AS b ON b.id = oi.book_id WHERE o.status <> 'cancelled' GROUP BY month, b.genre ORDER BY month, b.genre;
```
